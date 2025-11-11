#!/usr/bin/env -S uv run --script
"""
Build script for Kandown page mode.
Copies necessary static assets from the main app to the page directory.
"""

import shutil
from pathlib import Path


def build_demo():
    """Build the page directory by copying static assets."""

    # Define paths
    repo_root = Path(__file__).parent.parent
    src_statics = repo_root / "src" / "kandown" / "statics"
    page_dir = repo_root / "page"
    demo_statics_dir = page_dir / "statics"

    # Ensure page/static directory exists
    demo_statics_dir.mkdir(exist_ok=True)

    # Find all .js and .css files in statics
    js_css_files = list(src_statics.glob("*.js")) + list(src_statics.glob("*.css"))
    # Also copy favicon.svg if present
    extra_files = [src_statics / "favicon.svg"]
    files_to_copy = js_css_files + [f for f in extra_files if f.exists()]

    print("Building Kandown page...")
    print(f"Source: {src_statics}")
    print(f"Destination: {page_dir}")
    print()

    # Copy static files
    if not files_to_copy:
        print("✗ Warning: No .js or .css files found in source statics directory.")
    for src_file in files_to_copy:
        dest_file = demo_statics_dir / src_file.name
        shutil.copy2(src_file, dest_file)
        print(f"✓ Copied {src_file.name}")

    # copy index.html separately
    index_src = repo_root / "src" / "kandown" / "templates" / "index.html"
    index_dest = page_dir / "index.html"
    if index_src.exists():
        shutil.copy2(index_src, index_dest)
        print("✓ Copied index.html")
    else:
        print("✗ Warning: index.html not found in source")

    print()
    print("✅ {Page} build completed successfully!")
    print(f"Page directory: {page_dir}")
    print()
    print("To test locally, run:")
    print(f"  python -m http.server 8080 --directory {page_dir}")
    print("  Then open http://localhost:8080 in your browser")

    return True


if __name__ == "__main__":
    import sys

    success = build_demo()
    sys.exit(0 if success else 1)
