#!/usr/bin/env -S uv run --script
import os
import shutil

demo_dir = os.path.join(os.path.dirname(__file__), "..", "demo")
gitignore_path = os.path.join(demo_dir, ".gitignore")


# Read ignore patterns from .gitignore
def get_ignore_patterns(path):
    patterns = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                patterns.append(line)
    return patterns


def delete_ignored_files(base_dir, patterns):
    for pattern in patterns:
        target = os.path.join(base_dir, pattern)
        if os.path.isfile(target):
            print(f"Deleting file: {target}")
            os.remove(target)
        elif os.path.isdir(target):
            print(f"Deleting directory: {target}")
            shutil.rmtree(target)
        else:
            print(f"Not found (skipped): {target}")


if __name__ == "__main__":
    if not os.path.exists(gitignore_path):
        print(f".gitignore not found in {demo_dir}")
        exit(1)
    patterns = get_ignore_patterns(gitignore_path)
    delete_ignored_files(demo_dir, patterns)
    print("Cleanup complete.")
