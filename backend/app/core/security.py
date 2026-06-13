import re
from secrets import token_hex
from pathlib import Path
from werkzeug.utils import secure_filename
from app.core.config import settings

def validate_and_sanitize_filename(filename: str) -> str:
    """
    Sanitizes the filename to prevent Directory Traversal attacks 
    and appends a secure random token to guarantee uniqueness.
    """
    # Fallback default generic naming mechanisms
    clean_name = secure_filename(filename)
    if not clean_name or clean_name.startswith('.'):
        clean_name = f"uploaded_file_{token_hex(4)}"
        
    stem = Path(clean_name).stem
    suffix = Path(clean_name).suffix.lower().lstrip('.')
    
    if suffix not in settings.ALLOWED_EXTENSIONS:
        raise ValueError(f"Extension .{suffix} is not explicitly authorized.")
        
    # Inject unique programmatic deterministic modifier token
    secured_name = f"{token_hex(8)}_{stem}.{suffix}"
    return secured_name