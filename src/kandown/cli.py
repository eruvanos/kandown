"""Command line interface for Kandown."""

import os
import click
from .app import create_app

@click.command()
@click.argument('markdown_file', type=click.Path(exists=True))
@click.option('--host', default='127.0.0.1', help='Host to bind to (default: 127.0.0.1)')
@click.option('--port', default=5000, help='Port to bind to (default: 5000)')
@click.option('--debug', is_flag=True, help='Enable debug mode')
def main(markdown_file, host, port, debug):
    """Start the Kandown server with a markdown file.
    
    MARKDOWN_FILE: Path to the markdown file to render
    """
    # Convert to absolute path
    markdown_file = os.path.abspath(markdown_file)
    
    click.echo(f"Starting Kandown server...")
    click.echo(f"Markdown file: {markdown_file}")
    click.echo(f"Server will be available at: http://{host}:{port}")
    
    # Set the markdown file and create the app
    app = create_app()
    
    # Run the Flask app
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()