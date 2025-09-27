# backend/AI_api.py
import json
import os
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
from query_deepseek import query_deepseek

app = FastAPI(title="EduDraft Essay API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class LessonPlan(BaseModel):
    lesson_plan_text: str
    topic: str
    created_at: str

class EssayRequest(BaseModel):
    lesson_plan: LessonPlan
    topic: str
    student_answer: str
    api_key: str

class FileEssayRequest(BaseModel):
    json_filename: str
    topic: str
    student_answer: str
    api_key: str

def process_lesson_plan_direct(lesson_plan_data: Dict[str, Any], api_key: str, topic: str, student_answer: str):
    """
    Process a lesson plan from data and return:
    - Lesson summary
    - Generated essay prompt
    - Grading result for a student answer (if provided)
    """
    lesson_text = lesson_plan_data.get("lesson_plan_text", "")
    if not lesson_text.strip():
        return {"error": "No lesson plan text found in data."}
    
    try:
        # Step 1: Summarize the lesson plan
        summary_prompt = (
            f"Create a clear, concise summary of this lesson content for students. "
            f"Focus on the main concepts, key points, and learning objectives. "
            f"Make it engaging and easy to understand:\n\n{lesson_text}"
        )
        
        print(f"Generating summary for topic: {topic}")
        lesson_summary = query_deepseek(summary_prompt, api_key)
        
        # Step 2: Generate essay prompt
        essay_prompt = (
            f"Create a comprehensive essay assignment based on this lesson content about {topic}:\n\n{lesson_text}\n\n"
            f"The essay prompt should:\n"
            f"- Be clear and specific with detailed instructions\n"
            f"- Require critical thinking and analysis, not just memorization\n"
            f"- Include specific requirements: word count (400-600 words), number of examples needed, key concepts to address\n"
            f"- Be engaging and thought-provoking\n"
            f"- Include grading criteria\n"
            f"- Be appropriate for the academic level\n\n"
            f"Format it as a complete assignment that a teacher could give directly to students."
        )
        
        print(f"Generating essay prompt for topic: {topic}")
        essay_task = query_deepseek(essay_prompt, api_key)
        
        # Step 3: Grade student answer (only if provided and not empty)
        grading_result = ""
        if student_answer and student_answer.strip():
            print(f"Grading student response for topic: {topic}")
            categories = ["Content Knowledge (1-10)", "Organization & Structure (1-10)", "Grammar & Writing Style (1-10)", "Critical Thinking (1-10)"]
            grade_prompt = (
                f"You are an experienced teacher grading a student essay. Please provide detailed feedback.\n\n"
                f"ESSAY PROMPT:\n{essay_task}\n\n"
                f"STUDENT RESPONSE:\n{student_answer}\n\n"
                f"Please provide:\n"
                f"1. Scores for each category: {', '.join(categories)}\n"
                f"2. Overall score out of 40 points\n"
                f"3. Letter grade (A, B, C, D, F)\n"
                f"4. What the student did well (strengths)\n"
                f"5. Areas needing improvement (weaknesses)\n"
                f"6. Specific suggestions for revision\n"
                f"7. Comments on whether the student met the assignment requirements\n\n"
                f"Be constructive, encouraging, and specific in your feedback. "
                f"Help the student understand how to improve their writing and understanding of the topic."
            )
            grading_result = query_deepseek(grade_prompt, api_key)
        else:
            print("No student answer provided, skipping grading")
        
        return {
            "summary": lesson_summary,
            "essay_prompt": essay_task,
            "grading": grading_result,
        }
        
    except Exception as e:
        print(f"Error in process_lesson_plan_direct: {str(e)}")
        return {"error": f"Error processing lesson plan: {str(e)}"}

@app.post("/essay")
def generate_essay(request: EssayRequest):
    """
    Generate essay prompt and optionally grade student response
    """
    try:
        print(f"Received essay request for topic: {request.topic}")
        
        # Validate API key
        if not request.api_key or not request.api_key.strip():
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Convert lesson plan to dictionary
        lesson_plan_dict = request.lesson_plan.dict()
        
        # Validate lesson plan content
        if not lesson_plan_dict.get("lesson_plan_text", "").strip():
            raise HTTPException(status_code=400, detail="Lesson plan text cannot be empty")
        
        result = process_lesson_plan_direct(
            lesson_plan_data=lesson_plan_dict,
            api_key=request.api_key,
            topic=request.topic,
            student_answer=request.student_answer
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        print(f"Successfully generated essay content for topic: {request.topic}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in generate_essay: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Essay generation failed: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "OK", 
        "message": "Essay API is running",
        "version": "1.0.0",
        "endpoints": ["/essay", "/essay-from-file", "/test-essay", "/health"]
    }

# Keep your original function for backward compatibility
def process_lesson_plan(json_filename: str, api_key: str, topic: str, student_answer: str):
    """
    Original function - kept for backward compatibility
    Process a lesson plan from JSON file and return:
    - Lesson summary
    - Generated essay prompt
    - Grading result for a student answer
    """
    # Check if JSON exists
    if not os.path.exists(json_filename):
        return {"error": f"JSON file not found: {json_filename}"}
    
    try:
        # Load JSON
        with open(json_filename, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return process_lesson_plan_direct(data, api_key, topic, student_answer)
        
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON file format: {str(e)}"}
    except Exception as e:
        return {"error": f"Error reading JSON file: {str(e)}"}

@app.post("/essay-from-file")
def generate_essay_from_file(request: FileEssayRequest):
    """
    Generate essay from JSON file - for backward compatibility
    """
    try:
        print(f"Processing essay from file: {request.json_filename}")
        
        result = process_lesson_plan(
            json_filename=request.json_filename,
            api_key=request.api_key,
            topic=request.topic,
            student_answer=request.student_answer
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in generate_essay_from_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Essay generation failed: {str(e)}")

@app.post("/test-essay")
def test_essay_generation():
    """Test endpoint with sample data for debugging"""
    try:
        sample_lesson_plan = {
            "lesson_plan_text": """
            This lesson covers the fundamental concepts of photosynthesis in plants. 
            
            Key Topics:
            1. Chlorophyll and its role in capturing light energy
            2. The light-dependent reactions (photosystem I and II)
            3. The Calvin cycle (light-independent reactions)
            4. Factors affecting photosynthesis rate (light intensity, CO2 concentration, temperature)
            5. The importance of photosynthesis in ecosystems
            
            Learning Objectives:
            - Understand the chemical equation for photosynthesis: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2
            - Explain the role of chloroplasts and chlorophyll
            - Describe the two main stages of photosynthesis
            - Analyze how environmental factors affect photosynthetic rates
            - Discuss the ecological importance of photosynthesis
            
            The process converts light energy into chemical energy stored in glucose, which serves as food for the plant and oxygen as a byproduct that benefits all life on Earth.
            """,
            "topic": "Biology - Photosynthesis",
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        # Use the provided API key
        api_key = "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"
        
        result = process_lesson_plan_direct(
            lesson_plan_data=sample_lesson_plan,
            api_key=api_key,
            topic="Biology - Photosynthesis",
            student_answer=""
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "message": "Test successful",
            "sample_data": sample_lesson_plan,
            "result": result
        }
        
    except Exception as e:
        print(f"Error in test endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")

@app.get("/")
def root():
    """Root endpoint with API information"""
    return {
        "message": "EduDraft Essay Generation API",
        "version": "1.0.0",
        "description": "Generate essay prompts and grade student responses based on lesson content",
        "endpoints": {
            "POST /essay": "Generate essay from lesson plan data",
            "POST /essay-from-file": "Generate essay from JSON file",
            "POST /test-essay": "Test with sample data",
            "GET /health": "Health check",
            "GET /": "This information page"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting EduDraft Essay API...")
    print("Available endpoints:")
    print("- POST /essay - Generate essay from lesson plan")
    print("- POST /essay-from-file - Generate essay from JSON file")  
    print("- POST /test-essay - Test with sample data")
    print("- GET /health - Health check")
    print("- GET / - API information")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    
    # Optional: Test the function directly when running as script
    # Uncomment the lines below for direct testing:
    """
    print("\n--- Direct Function Test ---")
    api_key = "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"
    json_filename = os.path.join("json_outputs", "Data.json")
    if os.path.exists(json_filename):
        result = process_lesson_plan(
            json_filename=json_filename,
            api_key=api_key,
            topic="Biology",
            student_answer="ATP is like a fully charged battery while ADP is like a partially charged battery."
        )
        print(json.dumps(result, indent=2))
    else:
        print(f"JSON file not found: {json_filename}")
    """
