import os
import json
import uuid
from flask import Flask, request, send_file
from flask_cors import CORS
from typing import List, Dict
import PyPDF2

app = Flask(__name__)
CORS(app)

# Optional: folder to save JSON files
JSON_FOLDER = "json_outputs"
os.makedirs(JSON_FOLDER, exist_ok=True)


# ----------------------------
# Utility function for APIResponse
# ----------------------------
def api_response(success: bool, data=None, error: str = None):
    response = {"success": success}
    if data is not None:
        response["data"] = data
    if error:
        response["error"] = error
    return response


# ----------------------------
# Health check
# ----------------------------
@app.route("/health", methods=["GET"])
def health_check():
    return {"status": "OK"}


# ----------------------------
# Upload PDF / TXT / DOCX file
# ----------------------------
@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return api_response(False, error="No file part"), 400
    file = request.files["file"]
    if file.filename == "":
        return api_response(False, error="No selected file"), 400

    # Only accept certain types
    allowed_types = [
        "text/plain",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if file.mimetype not in allowed_types:
        return api_response(False, error="Invalid file type"), 400

    try:
        content = ""
        if file.mimetype == "application/pdf":
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        elif file.mimetype == "text/plain":
            content = file.read().decode("utf-8")
        else:
            # For DOCX, you could integrate python-docx if needed
            content = f"Received {file.filename}, but DOCX parsing not implemented."

        return api_response(True, data={"content": content})
    except Exception as e:
        return api_response(False, error=str(e)), 500


# ----------------------------
# Generate study materials
# ----------------------------
@app.route("/generate", methods=["POST"])
def generate_study_materials():
    try:
        payload = request.json
        content = payload.get("content", "")
        settings = payload.get("settings", {})

        # Dummy generation: split content into sentences
        sentences = content.split(".")
        study_items = []
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if sentence:
                study_items.append(
                    {
                        "id": str(uuid.uuid4()),
                        "question": f"What is: {sentence[:50]}?",
                        "answer": sentence,
                        "difficulty": settings.get("difficulty", "medium"),
                        "topic": settings.get("subject", "General"),
                        "type": settings.get("questionTypes", ["short-answer"])[0],
                    }
                )

        return api_response(True, data=study_items)
    except Exception as e:
        return api_response(False, error=str(e)), 500


# ----------------------------
# Export study materials
# ----------------------------
@app.route("/export/<format>", methods=["POST"])
def export_study_materials(format):
    try:
        payload = request.json
        study_items = payload.get("studyItems", [])

        if not study_items:
            return api_response(False, error="No study materials to export"), 400

        # CSV export as example
        if format == "csv":
            csv_content = "id,question,answer,difficulty,topic,type\n"
            for item in study_items:
                csv_content += f"{item['id']},{item['question'].replace(',', ';')},{item['answer'].replace(',', ';')},{item['difficulty']},{item['topic']},{item['type']}\n"

            path = os.path.join(JSON_FOLDER, "export.csv")
            with open(path, "w", encoding="utf-8") as f:
                f.write(csv_content)
            return send_file(path, as_attachment=True)

        return api_response(False, error=f"Export format '{format}' not supported"), 400
    except Exception as e:
        return api_response(False, error=str(e)), 500


# ----------------------------
# Flashcards / Quiz / Notes generation
# ----------------------------
@app.route("/flashcards", methods=["POST"])
@app.route("/quiz", methods=["POST"])
@app.route("/notes", methods=["POST"])
def generate_ai_content():
    try:
        payload = request.json
        transcript: List[str] = payload.get("transcript", [])
        if not transcript:
            return api_response(False, error="Transcript is empty"), 400

        endpoint = request.path.strip("/")

        # Dummy AI response
        result = []
        for i, line in enumerate(transcript):
            result.append(
                {
                    "id": str(uuid.uuid4()),
                    "content": f"{endpoint} generated content from line {i + 1}: {line[:50]}",
                }
            )

        key_map = {"flashcards": "flashcards", "quiz": "quiz", "notes": "notes"}

        return api_response(True, data={key_map.get(endpoint, "data"): result})
    except Exception as e:
        return api_response(False, error=str(e)), 500


# ----------------------------
# Run app
# ----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
