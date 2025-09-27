import os
import json
import random
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


@app.route("/quiz", methods=["POST"])
def generate_quiz():
    try:
        payload = request.json
        transcript: List[str] = payload.get("transcript", [])
        num_questions = int(payload.get("num_questions", 10))

        if not transcript:
            return api_response(False, error="Transcript is empty"), 400

        # Better question generation with real distractors
        study_items = []

        # Extract key concepts from transcript
        all_concepts = []
        for line in transcript:
            # Extract key terms and concepts
            words = line.lower().split()
            concepts = [word for word in words if len(word) > 4]  # Get meaningful words
            all_concepts.extend(concepts[:3])  # Take first 3 concepts per line

        for i, line in enumerate(transcript[:num_questions]):
            line = line.strip()
            if not line:
                continue

            # Extract question and answer from the transcript
            parts = line.split("The answer is")
            if len(parts) >= 2:
                question_part = parts[0].strip()
                answer_part = parts[1].split(".")[0].strip()
            else:
                question_part = f"What is the main concept in: {line[:50]}?"
                answer_part = "Primary concept"

            # Generate better distractors using other concepts
            distractors = []
            available_concepts = [
                c for c in all_concepts if c.lower() not in answer_part.lower()
            ]

            # Create meaningful wrong answers
            if len(available_concepts) >= 3:
                distractors = [
                    f"Related to {available_concepts[0]}"
                    if available_concepts[0]
                    else "Alternative concept",
                    f"Involves {available_concepts[1]}"
                    if available_concepts[1]
                    else "Different approach",
                    f"Based on {available_concepts[2]}"
                    if available_concepts[2]
                    else "Another method",
                ]
            else:
                distractors = [
                    "Alternative interpretation",
                    "Different methodology",
                    "Contrasting viewpoint",
                ]

            # Shuffle the options
            all_options = [answer_part] + distractors
            random.shuffle(all_options)

            # Find where the correct answer ended up
            correct_index = all_options.index(answer_part)
            option_keys = ["A", "B", "C", "D"]
            correct_key = option_keys[correct_index]

            study_items.append(
                {
                    "id": str(uuid.uuid4()),
                    "question": question_part,
                    "answer": correct_key,  # This is the key (A, B, C, D)
                    "difficulty": "medium",
                    "topic": "General",
                    "type": "multiple-choice",
                    "options": {
                        "A": all_options[0],
                        "B": all_options[1],
                        "C": all_options[2],
                        "D": all_options[3],
                    },
                }
            )

        return api_response(True, data=study_items)

    except Exception as e:
        return api_response(False, error=str(e)), 500


# ----------------------------
# Run app
# ----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
