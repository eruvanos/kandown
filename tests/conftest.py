"""Shared pytest fixtures for all tests."""

import socket
import subprocess
import tempfile
import time

import pytest


@pytest.fixture()
def kandown_server():
    """Start the kandown CLI on a random port with a temporary file, yield the URL, and shut down after test."""
    # Find a free port
    sock = socket.socket()
    sock.bind(("localhost", 0))
    port = sock.getsockname()[1]
    sock.close()

    # Create a temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    temp_file.close()

    # Start the CLI subprocess
    proc = subprocess.Popen(["python", "-m", "src.kandown.cli", temp_file.name, "--port", str(port)])

    # Wait for the server to start by polling the port
    start_time = time.time()
    timeout = 10  # seconds
    while True:
        try:
            test_sock = socket.create_connection(("localhost", port), timeout=1)
            test_sock.close()
            break  # Port is open
        except (ConnectionRefusedError, OSError):
            if time.time() - start_time > timeout:
                proc.terminate()
                proc.wait()
                raise RuntimeError(f"Server did not start on port {port} within {timeout} seconds.")
            time.sleep(0.1)
    url = f"http://localhost:{port}"
    try:
        yield url
    finally:
        proc.terminate()
        proc.wait()
