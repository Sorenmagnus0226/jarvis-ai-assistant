"""Launch Kaizen in a native desktop window with a loopback-only API server."""

from __future__ import annotations

import socket
import sys
import threading
import time


def main() -> int:
    try:
        import webview
        import uvicorn
    except ImportError as exc:
        print("Desktop dependencies are missing. Run: pip install -r requirements-desktop.txt", file=sys.stderr)
        print(f"Details: {exc}", file=sys.stderr)
        return 1

    from backend.main import app

    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind(("127.0.0.1", 0))
    server_socket.listen(128)
    port = server_socket.getsockname()[1]

    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning", access_log=False)
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, kwargs={"sockets": [server_socket]}, daemon=True)
    server_thread.start()

    try:
        deadline = time.monotonic() + 10
        while not server.started and server_thread.is_alive() and time.monotonic() < deadline:
            time.sleep(0.05)
        if not server.started:
            raise RuntimeError("The local API server did not start. Check the console output for details.")

        webview.create_window(
            "Kaizen AI Assistant",
            f"http://127.0.0.1:{port}",
            width=1280,
            height=850,
            min_size=(760, 560),
        )
        webview.start(debug="--debug" in sys.argv)
    finally:
        server.should_exit = True
        server_thread.join(timeout=5)
        server_socket.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
