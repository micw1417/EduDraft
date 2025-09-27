# backend/AI_api.py
import json
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from query_deepseek import query_deepseek

# Keep your original function intact
def process_lesson_plan(json_filename: str, api_key: str, topic: str, student_answer: str):
    """
    Process a lesson plan from JSON and return:
    - Lesson summary
    - Generated essay prompt
    - Grading result for a student answer
    """

    # Check if JSON exists
    if not os.path.exists(json_filename):
        return {"error": f"JSON file not found: {json_filename}"}

    # Load JSON
    with open(json_filename, "r", encoding="utf-8") as f:
        data = json.load(f)

    lessonPlan = data.get("lesson_plan_text", "")

    if not lessonPlan.strip():
        return {"error": "No lesson plan text found in JSON."}

    # Step 1: Summarize the lesson plan
    summary_prompt = f"Summarize the following lesson plan into a concise paragraph suitable for students:\n\n{lessonPlan}"
    lesson_summary = query_deepseek(summary_prompt, api_key)

    # Step 2: Generate essay prompt
    essay_prompt = (
        f"Generate just an essay prompt to give to students based on the following lesson plan "
        f"{lessonPlan} on the topic of {topic}. Be harsh: if the answer doesn't meet all the requirements "
        f"(e.g., no word count) penalize them by 25%."
    )
    essay_task = query_deepseek(essay_prompt, api_key)

    # Step 3: Grade student answer
    Categories = ["Focus", "Grammar", "Creativity"]
    gradePrompt = (
        f"Based on the prompt '{essay_prompt}' grade this student's answer: '{student_answer}' "
        f"on a scale from 1-10 in the categories: {Categories}. "
        f"Then return the overall score with feedback on how to improve and in which parts."
    )
    grading_result = query_deepseek(gradePrompt, api_key)

    return {
        "summary": lesson_summary,
        "essay_prompt": essay_task,
        "grading": grading_result,
    }

# -------------------- FastAPI wrapper --------------------
app = FastAPI()

# Pydantic model for the request
class EssayRequest(BaseModel):
    json_filename: str
    topic: str
    student_answer: str
    api_key: str  # You can also make this optional if you want a default

@app.post("/essay")
def generate_essay(request: EssayRequest):
    try:
        result = process_lesson_plan(
            json_filename=request.json_filename,
            api_key=request.api_key,
            topic=request.topic,
            student_answer=request.student_answer
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------- Optional test when running directly --------------------
if __name__ == "__main__":
    api_key = "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"
    json_filename = os.path.join("json_outputs", "Data.json")

    result = process_lesson_plan(
        json_filename=json_filename,
        api_key=api_key,
        topic="Biology",
        student_answer="ATP is like a fully charged battery while ADP is like a partially charged battery."
    )

    print(json.dumps(result, indent=4))
