from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Deen AI Backend")

class ChatRequest(BaseModel):
    message: string

class ChatResponse(BaseModel):
    response: string

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    # This is a stub backend for now
    # Eventually it will connect to the RAG pipeline

    # Simple mock response
    msg = request.message.lower()
    
    if "salam" in msg:
        response_text = "Wa alaikum assalam warahmatullah. How can I assist you with your deen today?"
    elif "prayer" in msg or "salah" in msg:
        response_text = "Establishing regular prayer is one of the pillars of Islam. 'Indeed, prayer has been decreed upon the believers a decree of specified times.' (Quran 4:103)"
    elif "fasting" in msg or "ramadan" in msg:
        response_text = "Fasting in Ramadan is an obligation upon every capable adult Muslim. It is a month of mercy, forgiveness, and salvation."
    else:
        response_text = "That is a very good question. Masha'Allah. I am still learning from verified Quran and Hadith sources, so my answers are limited right now. Please ask me about prayer or greeting someone."
        
    return ChatResponse(response=response_text)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Deen AI Chatbot"}
