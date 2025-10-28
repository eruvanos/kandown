#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "flask",
# ]
# ///
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

app = Flask(__name__, static_folder=None)

SCRIPT_DIR = Path(__file__).resolve().parent
SRC_DIR = SCRIPT_DIR.parent / "src" / "kandown"
STATICS_DIR = SRC_DIR / "statics"
TEMPLATE_DIR = SRC_DIR / "templates"


@app.route("/")
def index():
    return send_from_directory(TEMPLATE_DIR, "index.html")


@app.route("/statics/<path:path>")
def serve_demo(path):
    # Serve demo static files first
    statics_path = STATICS_DIR / path
    if statics_path.is_file():
        return send_from_directory(STATICS_DIR, path)
    return "Not Found", 404


@app.route("/api/health")
def health():
    return jsonify({"available": False})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
