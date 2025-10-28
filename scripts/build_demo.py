#!/usr/bin/env -S uv run --script
"""
Build script for Kandown demo mode.
Copies necessary static assets from the main app to the demo directory.
"""

import shutil
from pathlib import Path


def build_demo():
    """Build the demo directory by copying static assets."""

    # Define paths
    repo_root = Path(__file__).parent.parent
    src_statics = repo_root / "src" / "kandown" / "statics"
    demo_dir = repo_root / "demo"
    demo_statics_dir = demo_dir / "statics"

    # Ensure demo/static directory exists
    demo_statics_dir.mkdir(exist_ok=True)

    # Files to copy from statics
    files_to_copy = [
        "api-cli.js",
        "api-demo.js",
        "api-filesystem.js",
        "api.js",
        "board.css",
        "board.js",
        "event-manager.js",
        "favicon.svg",
        "init.js",
        "modal-manager.js",
        "settings.js",
        "types.js",
        "ui-utils.js",
    ]

    print("Building Kandown demo...")
    print(f"Source: {src_statics}")
    print(f"Destination: {demo_dir}")
    print()

    # Copy static files
    for filename in files_to_copy:
        src_file = src_statics / filename
        dest_file = demo_statics_dir / filename

        if src_file.exists():
            shutil.copy2(src_file, dest_file)
            print(f"✓ Copied {filename}")
        else:
            print(f"✗ Warning: {filename} not found in source")

    # copy index.html separately
    index_src = repo_root / "src" / "kandown" / "templates" / "index.html"
    index_dest = demo_dir / "index.html"
    if index_src.exists():
        shutil.copy2(index_src, index_dest)
        print("✓ Copied index.html")
    else:
        print("✗ Warning: index.html not found in source")

    print()
    print("✅ Demo build completed successfully!")
    print(f"Demo directory: {demo_dir}")
    print()
    print("To test locally, run:")
    print(f"  python -m http.server 8080 --directory {demo_dir}")
    print("  Then open http://localhost:8080 in your browser")

    return True


if __name__ == "__main__":
    import sys

    success = build_demo()
    sys.exit(0 if success else 1)
