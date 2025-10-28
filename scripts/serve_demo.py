import os

from flask import Flask, jsonify, send_from_directory

app = Flask(__name__, static_folder=None)

SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "kandown")
STATICS_DIR = os.path.join(SRC_DIR, "statics")
DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "demo")


@app.route("/")
def index():
    return send_from_directory(DEMO_DIR, "index.html")


@app.route("/<path:path>")
def serve_demo(path):
    # Serve demo static files first
    demo_path = os.path.join(DEMO_DIR, path)
    if os.path.isfile(demo_path):
        return send_from_directory(DEMO_DIR, path)
    # Serve src/kandown/statics files
    statics_path = os.path.join(STATICS_DIR, path)
    if os.path.isfile(statics_path):
        return send_from_directory(STATICS_DIR, path)
    return "Not Found", 404


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "mode": "demo"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
