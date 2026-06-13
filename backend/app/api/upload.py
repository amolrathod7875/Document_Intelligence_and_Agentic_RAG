import shutil
from pathlib import Path
from typing import List, Dict
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, status
from app.core.config import settings
from app.core.security import validate_and_sanitize_filename
from app.services.parser import DocumentParserService
from app.services.classifier import DocumentClassifierService
from app.services.vector_store import LocalVectorStore

router = APIRouter(prefix="/upload", tags=["Upload Pipeline"])

# Thread-safe in-memory status tracker to satisfy UI telemetry requirements
PROCESSING_STATUS: Dict[str, Dict[str, str]] = {}

async def run_pipeline_background(file_path: Path, secure_filename: str, original_name: str):
    """Asynchronous background worker executing sequential state-machine stages."""
    vector_store = LocalVectorStore()
    document_id = Path(secure_filename).stem

    try:
        # Phase 1: Document Parsing & Text Extraction
        PROCESSING_STATUS[original_name] = {"status": "parsing", "details": "Extracting text structure and generating layout thumbnails..."}
        if file_path.suffix == ".txt":
            parsed_pages = DocumentParserService.parse_plain_text(file_path, document_id)
        else:
            parsed_pages = DocumentParserService.parse_pdf(file_path, document_id)

        # Phase 2: Metadata Classification via LLM (zai-glm-4.7)
        PROCESSING_STATUS[original_name] = {"status": "classifying", "details": "Analyzing semantic structure across dimensions..."}
        classification_metadata = await DocumentClassifierService.classify_document(parsed_pages)

        # Phase 3: Semantic Indexing inside the Local Vector DB
        PROCESSING_STATUS[original_name] = {"status": "indexing", "details": "Generating vector embeddings and registering metadata index..."}
        vector_store.add_document(original_name, parsed_pages)

        # Completed successfully
        PROCESSING_STATUS[original_name] = {
            "status": "indexed",
            "details": "Pipeline fully synchronized.",
            "document_type": classification_metadata.get("document_type", "Unknown"),
            "sensitivity_level": classification_metadata.get("sensitivity_level", "Internal Use Only")
        }

    except Exception as e:
        PROCESSING_STATUS[original_name] = {
            "status": "failed",
            "details": f"Pipeline execution crashed: {str(e)}"
        }
    finally:
        # Clean up raw files from transient storage layer if necessary for privacy compliance
        if file_path.exists() and settings.ENVIRONMENT != "development":
            file_path.unlink()

@router.post("/bulk")
async def bulk_upload_files(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    """Receives and sanitizes bulk files before spawning individual background execution tasks."""
    if not files:
        raise HTTPException(status_code=400, detail="No upload payload received.")

    triggered_files = []

    for file in files:
        try:
            # 1. Enforce strict Upload Layer constraints
            sanitized_name = validate_and_sanitize_filename(file.filename)
        except ValueError as err:
            PROCESSING_STATUS[file.filename] = {"status": "failed", "details": str(err)}
            continue

        target_storage_path = settings.UPLOAD_DIR / sanitized_name

        # 2. Prevent buffer overflows or disk consumption attacks
        file_size = 0
        with target_storage_path.open("wb") as buffer:
            while chunk := await file.read(64 * 1024):  # 64kb streaming chunks
                file_size += len(chunk)
                if file_size > settings.MAX_FILE_SIZE_BYTES:
                    buffer.close()
                    target_storage_path.unlink()  # Erase the partial file
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File {file.filename} exceeds the maximum allowable threshold limit."
                    )
                buffer.write(chunk)

        # 3. Initialize background tracking data structure
        PROCESSING_STATUS[file.filename] = {"status": "parsing", "details": "File safely committed to raw disk storage..."}
        
        # 4. Hand off execution tracking safely to background processing tasks
        background_tasks.add_task(
            run_pipeline_background, 
            target_storage_path, 
            sanitized_name, 
            file.filename
        )
        triggered_files.append(file.filename)

    return {"message": "Processing pipeline safely initiated.", "files": triggered_files}

@router.get("/status")
async def get_pipeline_statuses():
    """Provides realtime indexing state snapshots to power frontend monitoring components."""
    return PROCESSING_STATUS