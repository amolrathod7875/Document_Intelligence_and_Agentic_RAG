import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api import upload, chat

app = FastAPI(
    title="Document Intelligence + Agentic RAG Platform Backend",
    version="1.0.0",
    description="Secure processing engine optimized with local vector frameworks and Cerebras Z.ai GLM-4.7 acceleration pipelines."
)

# Configure Cross-Origin Resource Sharing (CORS) limits to connect securely with Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Local Node server defaults
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the Page Images directory to securely serve visual page thumbnails
app.mount("/static/thumbnails", StaticFiles(directory=str(settings.IMAGE_DIR)), name="thumbnails")

# Bind Sub-Router mesh components
app.include_router(upload.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/api/health", tags=["System Status Checks"])
async def execution_health_check():
    """Confirms operational baseline dependencies are sound."""
    return {
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "storage_integrity": {
            "uploads_exists": settings.UPLOAD_DIR.exists(),
            "thumbnails_exists": settings.IMAGE_DIR.exists(),
            "vector_db_exists": settings.VECTOR_DB_DIR.exists()
        }
    }

if __name__ == "__main__":
    # Standard engineering debug utility entry point
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)