"""Command line interface for Kandown."""

import logging
import os
import socket
from logging import basicConfig
from pathlib import Path

import click
from waitress import serve

from kandown.app import create_app
from kandown.mcp_server import run_mcp_server
from kandown.storage import AttachmentResolver
from kandown.task_repo import YamlTaskRepository


@click.command()
@click.argument("yaml_file", required=False, type=click.Path())
@click.option("--port", default=None, help="Port to bind to (default: 5001)")
@click.option("--debug", is_flag=True, help="Enable debug mode")
@click.option("--mcp", "run_mcp", is_flag=True, help="Run as MCP server instead of starting the web UI server.")
@click.option(
    "--default-backlog-path",
    default=None,
    type=click.Path(),
    help="MCP default backlog YAML path when tools are called without backlog_path/project_root.",
)
@click.option(
    "--default-project-root",
    default=None,
    type=click.Path(),
    help="MCP default project root when tools are called without backlog_path/project_root.",
)
@click.option(
    "--backlog-filename",
    default="backlog.yaml",
    show_default=True,
    help="MCP backlog filename used when project_root is provided.",
)
@click.option(
    "--transport",
    default="stdio",
    show_default=True,
    type=click.Choice(["stdio"]),
    help="MCP transport to use.",
)
def main(
    yaml_file,
    port,
    debug,
    run_mcp,
    default_backlog_path,
    default_project_root,
    backlog_filename,
    transport,
):
    """Start the Kandown server with a YAML file for tasks.

    yaml_file: Optional path to the YAML file to use for tasks. If not provided, defaults to 'backlog.yaml'.
    """
    basicConfig(level=logging.ERROR if not debug else logging.INFO)

    if run_mcp:
        try:
            run_mcp_server(
                default_backlog_path=default_backlog_path,
                default_project_root=default_project_root,
                backlog_filename=backlog_filename,
                transport=transport,
            )
            return
        except ModuleNotFoundError as exc:
            if exc.name and exc.name.startswith("mcp"):
                raise click.ClickException("MCP dependencies missing. Install with: pip install 'kandown[mcp]'") from exc
            raise

    if not yaml_file:
        yaml_file = Path("backlog.yaml")
    else:
        yaml_file = Path(yaml_file)

    if not os.path.exists(yaml_file):
        create = click.confirm(f"YAML file '{yaml_file}' does not exist. Create it?", default=True)
        if create:
            with open(yaml_file, "w", encoding="utf-8") as f:
                f.write("[]\n")
            click.echo(f"Created empty YAML file: {yaml_file}")
        else:
            click.echo("Aborted: YAML file does not exist.")
            return
    click.echo(f"Using YAML file: {yaml_file}")

    task_repo = YamlTaskRepository(yaml_file)
    attachment_resolver = AttachmentResolver(yaml_file.parent / ".backlog")

    # Set the markdown file and create the app
    app = create_app(task_repo, attachment_resolver)

    # check for port config
    random_port = task_repo.settings.random_port
    if random_port and port is None:
        port = _find_free_port()

    if port is None:
        port = 5001  # default port

    # Run the Flask app
    click.echo(f"Server will be available at: http://127.0.0.1:{port}")
    if debug:
        app.run(host="127.0.0.1", port=port, debug=debug, threaded=True)
    else:
        serve(app, host="127.0.0.1", port=port)


def _find_free_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


if __name__ == "__main__":
    main()
