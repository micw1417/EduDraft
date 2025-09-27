import json
from query_deepseek import query_deepseek

def create_quiz_from_transcript(api_key, num_questions=10):
    # Load transcript from data.json
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    transcript_text = " ".join(data.get("transcript", []))

    # Prepare prompt for multiple-choice quiz creation
    prompt = f"""
    Please create a multiple-choice quiz from the following text.
    The quiz should have exactly {num_questions} questions.
    Each question should include:
    - question text
    - four options labeled A, B, C, D
    - the correct answer (A/B/C/D)
    Format the response as JSON in the following structure:
    [
      {{
        "question": "Your question here",
        "options": {{"A": "Option A text", "B": "Option B text", "C": "Option C text", "D": "Option D text"}},
        "answer": "A"
      }},
      ...
    ]
    Text:
    {transcript_text}
    """

    # Query DeepSeek
    quiz_response = query_deepseek(prompt, api_key)

    # Handle cases where the API fails or response is invalid
    if quiz_response is None:
        print("Failed to generate quiz from DeepSeek.")
        quiz = [{"error": "No quiz generated due to API failure"}]
    else:
        try:
            quiz = json.loads(quiz_response)
        except json.JSONDecodeError:
            # If AI response is not valid JSON, wrap it as a single entry
            quiz = [{"quiz_text": quiz_response}]

    # Save to quiz.json
    with open("quiz.json", "w", encoding="utf-8") as f:
        json.dump(quiz, f, ensure_ascii=False, indent=4)

    print(f"Quiz saved to quiz.json with {num_questions} questions.")
    return quiz

# Example usage
if __name__ == "__main__":
    api_key = "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"
    num_questions = 10  # Adjust the number of questions as needed
    create_quiz_from_transcript(api_key, num_questions)
