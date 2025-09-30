"""Command line interface for Kandown."""

import os
import click
from .app import create_app


@click.command()
@click.argument("yaml_file", required=False, type=click.Path())
@click.option(
    "--host", default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)"
)
@click.option("--port", default=5000, help="Port to bind to (default: 5000)")
@click.option("--debug", is_flag=True, help="Enable debug mode")
def main(yaml_file, host, port, debug):
    """Start the Kandown server with a YAML file for tasks.

    yaml_file: Optional path to the YAML file to use for tasks. If not provided, defaults to 'backlog.yaml'.
    """
    if not yaml_file:
        yaml_file = "backlog.yaml"
        click.echo("No YAML file provided, using default: backlog.yaml")
    yaml_file = os.path.abspath(yaml_file)
    if not os.path.exists(yaml_file):
        create = click.confirm(
            f"YAML file '{yaml_file}' does not exist. Create it?", default=True
        )
        if create:
            with open(yaml_file, "w", encoding="utf-8") as f:
                f.write("[]\n")
            click.echo(f"Created empty YAML file: {yaml_file}")
        else:
            click.echo("Aborted: YAML file does not exist.")
            return
    click.echo(f"Using YAML file: {yaml_file}")
    click.echo(f"Server will be available at: http://{host}:{port}")

    # Set the markdown file and create the app
    app = create_app(yaml_file=yaml_file)

    # Run the Flask app
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    main()
