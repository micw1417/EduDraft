import json
from query_deepseek import query_deepseek

# Load transcript from data.json
with open("data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

transcript_text = " ".join(data.get("transcript", []))

prompt = f"""
Please create flashcards from the following text. 
For each key concept or fact, make a question and an answer.
Format the response as a JSON list of question-answer pairs.
Text:
{transcript_text}
"""

api_key = "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"

# Query DeepSeek
flashcards_response = query_deepseek(prompt, api_key)

if flashcards_response is None:
    print("Failed to generate flashcards from DeepSeek.")
    flashcards = [{"error": "No flashcards generated due to API failure"}]
else:
    try:
        flashcards = json.loads(flashcards_response)
    except json.JSONDecodeError:
        # If AI response is not valid JSON, wrap it as a single entry
        flashcards = [{"flashcards_text": flashcards_response}]

# Save to flashcards.json
with open("flashcards.json", "w", encoding="utf-8") as f:
    json.dump(flashcards, f, ensure_ascii=False, indent=4)

print("Flashcards saved to flashcards.json")
