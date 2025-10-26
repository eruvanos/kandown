#!/usr/bin/env python3
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

    # Ensure demo directory exists
    demo_dir.mkdir(exist_ok=True)

    # Files to copy from statics
    files_to_copy = [
        "board.css",
        "board.js",
        "modal-manager.js",
        "event-manager.js",
        "ui-utils.js",
        "types.js",
        "favicon.svg",
    ]

    print("Building Kandown demo...")
    print(f"Source: {src_statics}")
    print(f"Destination: {demo_dir}")
    print()

    # Copy files
    for filename in files_to_copy:
        src_file = src_statics / filename
        dest_file = demo_dir / filename

        if src_file.exists():
            shutil.copy2(src_file, dest_file)
            print(f"✓ Copied {filename}")
        else:
            print(f"✗ Warning: {filename} not found in source")

    # Verify required demo files exist
    required_demo_files = ["index.html", "api.js", "settings-demo.js"]
    print()
    print("Verifying demo-specific files...")
    for filename in required_demo_files:
        demo_file = demo_dir / filename
        if demo_file.exists():
            print(f"✓ {filename} exists")
        else:
            print(f"✗ Error: {filename} is missing!")
            return False

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
