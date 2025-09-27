import PyPDF2
from flask import Flask, request
from flask_cors import CORS
import json
import os

app = Flask('app')
CORS(app)

# Optional: folder to save JSON files
JSON_FOLDER = "json_outputs"
os.makedirs(JSON_FOLDER, exist_ok=True)

@app.route("/pdf", methods=['POST'])
def ConvertPDF():
    file = request.files["file"]
    reader = PyPDF2.PdfReader(file)

    # Extract text
    pages_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        pages_text.append({
            "page": i + 1,
            "text": text if text else ""
        })

    # Prepare JSON data
    json_data = {
        "filename": file.filename,
        "total_pages": len(reader.pages),
        "pages": pages_text
    }

    # Save JSON to a file
    json_filename = os.path.splitext(file.filename)[0] + ".json"
    json_path = os.path.join(JSON_FOLDER, json_filename)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=4, ensure_ascii=False)

    return {"message": f"JSON file created: {json_filename}"}


if __name__ == "__main__":
    app.run(debug=True)
