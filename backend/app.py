"""Flask API for the QR Code Generator.

The React frontend does NOT call this API. Browser-side generation is fully local.
This API exists for independent use (health checks and an optional PNG endpoint).
Request bodies are never logged, written to disk or stored.
"""
from io import BytesIO

import qrcode
from flask import Flask, jsonify, request, send_file
from qrcode.constants import ERROR_CORRECT_H, ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q
from qrcode.exceptions import DataOverflowError

MAX_BODY_BYTES = 8 * 1024
MAX_DATA_CHARS = 1000
ECC = {"L": ERROR_CORRECT_L, "M": ERROR_CORRECT_M, "Q": ERROR_CORRECT_Q, "H": ERROR_CORRECT_H}


def _error(status: int, message: str):
    return jsonify({"error": message}), status


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.post("/api/qr")
    def generate_qr():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return _error(400, "Request body must be a JSON object.")

        data = payload.get("data")
        if not isinstance(data, str) or not data.strip():
            return _error(400, "'data' must be a non-empty string.")
        if len(data) > MAX_DATA_CHARS:
            return _error(400, f"'data' must be at most {MAX_DATA_CHARS} characters.")

        level = payload.get("error_correction", "M")
        if not isinstance(level, str) or level not in ECC:
            return _error(400, "'error_correction' must be one of L, M, Q, H.")

        box_size = payload.get("box_size", 10)
        if isinstance(box_size, bool) or not isinstance(box_size, int) or not 4 <= box_size <= 20:
            return _error(400, "'box_size' must be an integer from 4 to 20.")

        try:
            qr = qrcode.QRCode(error_correction=ECC[level], box_size=box_size, border=4)
            qr.add_data(data)
            qr.make(fit=True)
        except (DataOverflowError, ValueError):
            return _error(422, "The data is too long for a QR code at this error correction level.")

        buf = BytesIO()
        qr.make_image(fill_color="black", back_color="white").save(buf, format="PNG")
        buf.seek(0)
        resp = send_file(buf, mimetype="image/png", max_age=0)
        resp.headers["Cache-Control"] = "no-store"
        return resp

    @app.errorhandler(404)
    def not_found(_e):
        return _error(404, "Not found.")

    @app.errorhandler(405)
    def not_allowed(_e):
        return _error(405, "Method not allowed.")

    @app.errorhandler(413)
    def too_large(_e):
        return _error(413, "Request body is too large.")

    @app.errorhandler(Exception)
    def unexpected(_e):
        # Deliberately generic: never echo exception text or request content.
        return _error(500, "Internal server error.")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
