import os
import httpx  # Use httpx for async requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from dotenv import load_dotenv
import uvicorn

# Load environment variables from .env file
load_dotenv()

# --- LLM Model Configuration ---
# A dictionary to hold configurations for different LLM providers
MODEL_CONFIGS = {
    "deepseek": {
        "api_key": os.getenv("DEEPSEEK_API_KEY"),
        "base_url": os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1"),
        "model_name": "deepseek-chat"
    },
    "openai": {
        "api_key": os.getenv("OPENAI_API_KEY"),
        "base_url": os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"),
        "model_name": "gpt-4-turbo" # Or any other model
    },
    # Add other model configurations here, e.g., groq
    "groq": {
        "api_key": os.getenv("GROQ_API_KEY"),
        "base_url": os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1"),
        "model_name": "llama3-8b-8192"
    }
}

# Get the default model from .env, defaulting to 'deepseek' if not set
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "deepseek")


# --- Pydantic Models for Data Validation ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class LogRequest(BaseModel):
    message: str

class SessionRequest(BaseModel):
    type: str
    duration_minutes: int

# --- FastAPI App Initialization ---
app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.post("/api/v1/chat/messages")
async def chat_with_llm(chat_request: ChatRequest):
    """
    Handles chat requests by forwarding them to the configured LLM API.
    It dynamically selects the model based on the DEFAULT_MODEL environment variable.
    """
    messages = [msg.dict() for msg in chat_request.messages]

    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    # --- Dynamic Model Selection ---
    config = MODEL_CONFIGS.get(DEFAULT_MODEL)
    if not config or not config.get("api_key") or "your_" in config.get("api_key", ""):
        error_detail = f"API configuration for the selected model ('{DEFAULT_MODEL}') is missing or invalid. Please check your .env file."
        raise HTTPException(status_code=500, detail=error_detail)

    api_key = config["api_key"]
    base_url = config["base_url"]
    model_name = config["model_name"]
    
    # Construct the full API URL for chat completions
    api_url = f"{base_url.rstrip('/')}/chat/completions"
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    payload = {
        "model": model_name,
        "messages": messages
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(api_url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
        
        api_response = response.json()
        ai_message_obj = api_response['choices'][0]['message']
        
        return {"reply": ai_message_obj}

    except (httpx.RequestError, KeyError, IndexError, ValueError) as e:
        error_message = f"Error communicating with AI service ('{DEFAULT_MODEL}'): {e}"
        print(error_message)
        # Also check the response content if available
        try:
            print("Raw error response:", response.text)
        except NameError:
            pass # response might not be defined
        raise HTTPException(status_code=500, detail=error_message)

@app.post("/api/v1/sessions")
async def create_session(session_request: SessionRequest):
    """
    Placeholder endpoint to create a new focus or break session.
    """
    print(f"Received request to start a {session_request.type} session for {session_request.duration_minutes} minutes.")
    return {
        "session_id": "mock-session-id-12345",
        "start_time": "2025-10-15T10:00:00Z",
        "status": "started",
        "type": session_request.type
    }

@app.post("/log")
async def log_message(log_request: LogRequest):
    """
    Receives a log message from the frontend and writes it to a local file.
    """
    message = log_request.message
    if message:
        try:
            print(f"LOG: {message}") 
            with open('log.txt', 'a', encoding='utf-8') as f:
                f.write(f"{message}\n")
            return {"status": "ok"}
        except Exception as e:
            print(f"Failed to write to log file: {e}")
            raise HTTPException(status_code=500, detail="Failed to write to log file")
    raise HTTPException(status_code=400, detail="No message provided")


# --- Static File Serving ---
# Mount the static directory to serve frontend files
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def serve_index():
    """Serves the main index.html file."""
    return FileResponse('index.html')

@app.get("/{path:path}")
async def serve_static_files(path: str):
    """Serves other static files like CSS, JS, etc."""
    file_path = os.path.join(".", path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    # Fallback to index for PWA routing, or return 404
    return FileResponse('index.html')


# --- Main Execution ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)