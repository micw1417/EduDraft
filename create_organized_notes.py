import json
from query_deepseek import query_deepseek

def create_notes_from_transcript(api_key):
    # Load transcript from data.json
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    transcript_text = " ".join(data.get("transcript", []))

    # Prepare prompt for organized notes
    prompt = f"""
    Please create organized study notes from the following text.
    Structure the notes with headings, subheadings, and bullet points where appropriate.
    Format the response as JSON, for example:
    {{
      "heading": "Main Heading",
      "subheadings": [
        {{
          "title": "Subheading 1",
          "points": ["Point 1", "Point 2"]
        }},
        {{
          "title": "Subheading 2",
          "points": ["Point 3", "Point 4"]
        }}
      ]
    }}
    Text:
    {transcript_text}
    """

    # Query DeepSeek
    notes_response = query_deepseek(prompt, api_key)

    # Handle cases where the API fails or response is invalid
    if notes_response is None:
        print("Failed to generate notes from DeepSeek.")
        notes = [{"error": "No notes generated due to API failure"}]
    else:
        try:
            notes = json.loads(notes_response)
        except json.JSONDecodeError:
            # If AI response is not valid JSON, wrap it as a single entry
            notes = [{"notes_text": notes_response}]

    # Save to notes.json
    with open("notes.json", "w", encoding="utf-8") as f:
        json.dump(notes, f, ensure_ascii=False, indent=4)

    print("Notes saved to notes.json")
    return notes

# Example usage
if __name__ == "__main__":
    api_key = "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"
    create_notes_from_transcript(api_key)
