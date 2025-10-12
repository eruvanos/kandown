"""Command line interface for Kandown."""

import os
import socket
from logging import basicConfig
from pathlib import Path

import click

from kandown.app import create_app
from kandown.task_repo import YamlTaskRepository


@click.command()
@click.argument("yaml_file", required=False, type=click.Path())
@click.option("--port", default=None, help="Port to bind to (default: 5001)")
@click.option("--debug", is_flag=True, help="Enable debug mode")
def main(yaml_file, port, debug):
    """Start the Kandown server with a YAML file for tasks.

    yaml_file: Optional path to the YAML file to use for tasks. If not provided, defaults to 'backlog.yaml'.
    """
    if not yaml_file:
        yaml_file = Path("backlog.yaml")
        click.echo("No YAML file provided, using default: backlog.yaml")
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

    # Set the markdown file and create the app
    app = create_app(task_repo)

    # check for port config
    random_port = task_repo.settings.random_port
    if random_port and port is None:
        port = _find_free_port()

    if port is None:
        port = 5001  # default port

    # Run the Flask app
    click.echo(f"Server will be available at: http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=debug, threaded=True)


def _find_free_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


if __name__ == "__main__":
    basicConfig()
    main()
