from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from app.services.rag_agent import AgenticRAGService

router = APIRouter(prefix="/chat", tags=["Agentic RAG Conversation Interface"])

class ChatTurnSchema(BaseModel):
    role: str = Field(description="Must be either 'user' or 'assistant'.")
    content: str = Field(description="The structural textual message content.")

class ChatRequestSchema(BaseModel):
    query: str = Field(..., description="The context search prompt provided by the operator.")
    history: Optional[List[ChatTurnSchema]] = Field(default=[], description="Prior multi-turn discussion memory blocks.")

@router.post("")
async def conversational_rag_query(payload: ChatRequestSchema):
    """Routes prompt queries into the zero-hallucination agent synthesis engine."""
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="The raw message payload cannot be empty.")

    rag_agent = AgenticRAGService()
    
    # Restructure Pydantic models back to pristine generic lists for processing compatibility
    formatted_history = [{"role": turn.role, "content": turn.content} for turn in payload.history] if payload.history else []
    
    response = await rag_agent.answer_question(payload.query, chat_history=formatted_history)
    return response