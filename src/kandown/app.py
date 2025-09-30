"""Flask application for rendering markdown files."""

import os
import markdown
from flask import Flask, render_template_string

# Global variable to store the markdown file path
markdown_file_path = None

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kandown - Markdown Viewer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
        }
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="content">
        {{ content|safe }}
    </div>
</body>
</html>
"""

@app.route('/')
def index():
    """Render the markdown file content on the index page."""
    if not markdown_file_path or not os.path.exists(markdown_file_path):
        return render_template_string(HTML_TEMPLATE, 
                                    content="<h1>No markdown file specified or file not found</h1><p>Please provide a valid markdown file.</p>")
    
    try:
        with open(markdown_file_path, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
        
        # Convert markdown to HTML
        html_content = markdown.markdown(markdown_content, extensions=['tables', 'fenced_code'])
        
        return render_template_string(HTML_TEMPLATE, content=html_content)
    
    except Exception as e:
        return render_template_string(HTML_TEMPLATE, 
                                    content=f"<h1>Error reading file</h1><p>Error: {str(e)}</p>")

def set_markdown_file(file_path):
    """Set the markdown file path for the application."""
    global markdown_file_path
    markdown_file_path = file_path

def create_app(markdown_file=None):
    """Create and configure the Flask app."""
    if markdown_file:
        set_markdown_file(markdown_file)
    return app