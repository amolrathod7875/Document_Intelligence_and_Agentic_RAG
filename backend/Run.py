#!/usr/bin/env python
"""
Main entry point for the Document Intelligence & Agentic RAG Platform Backend.
This script starts the FastAPI server with Uvicorn.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
