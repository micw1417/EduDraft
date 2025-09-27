from query_deepseek import query_deepseek
from flask import Flask, request
from flask_cors import CORS
import json
import os

app = Flask("app")

# Your OpenRouter API key
api_key = "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"

# JSON path
json_folder = "json_outputs"
os.makedirs(json_folder, exist_ok=True)
json_filename = os.path.join(json_folder, "Data.json")

# Check if JSON exists
if not os.path.exists(json_filename):
    print(f"JSON file not found: {json_filename}")
    print("You need to generate the JSON from a PDF first.")
    exit(1)

# Load JSON
with open(json_filename, "r", encoding="utf-8") as f:
    data = json.load(f)

lessonPlan = data.get("lesson_plan_text", "")

if not lessonPlan.strip():
    print("No lesson plan text found in JSON.")
else:
    # Step 1: Summarize the lesson plan
    summary_prompt = f"Summarize the following lesson plan into a concise paragraph suitable for students:\n\n{lessonPlan}"
    lesson_summary = query_deepseek(summary_prompt, api_key)
    print("Lesson Plan Summary:\n")
    print(lesson_summary)

# Step 2: Generate essay prompt
topic = 'Biology'
prompt = (
    f"Generate just an essay prompt to give to students based on the following lesson plan "
    f"{lessonPlan} on the topic of {topic}. Be harsh: if the answer doesn't meet all the requirements "
    f"(e.g., no word count) penalize them by 25%."
)
response = query_deepseek(prompt, api_key)
print("\nGenerated Essay Prompt:\n")
print(response)

# Step 3: Grade student answer
Categories = ["Focus", "Grammar", "Creativity"]
answer = "ATP is like a fully charged battery while ADP is like a partially charged battery."

gradePrompt = (
    f"Based on the prompt '{prompt}' grade this student's answer: '{answer}' "
    f"on a scale from 1-10 in the categories: {Categories}. "
    f"Then return the overall score with feedback on how to improve and in which parts."
)
print("\nGrading Result:\n")
print(query_deepseek(gradePrompt, api_key))
