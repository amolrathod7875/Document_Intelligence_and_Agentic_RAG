# System Dependencies Setup Guide

## Problem
The backend PDF processing requires two system-level tools that are not installed:
- **Tesseract OCR** - required by `pytesseract` for document text extraction
- **Poppler** - required by `pdf2image` for PDF rasterization

Without these, PDF uploads fail with errors like:
- "Failed to render document image tracks natively"
- "pytesseract not found"

---

## Solution: Install on Windows

### Option 1: Using Chocolatey (Recommended)
```powershell
# Run PowerShell as Administrator, then:
choco install tesseract
choco install poppler
```

### Option 2: Manual Installation

#### 1. Install Tesseract OCR
- Download from: https://github.com/UB-Mannheim/tesseract/wiki
- Latest installer: https://github.com/UB-Mannheim/tesseract/releases
- Run installer (add to PATH during installation)
- Default path: `C:\Program Files\Tesseract-OCR`

#### 2. Install Poppler
- Download from: https://github.com/oschwartz10612/poppler-windows/releases/
- Extract to a folder (e.g., `C:\poppler`)
- Add to PATH: `C:\poppler\Library\bin`

### Option 3: Using Conda (What You Have)
If using conda, you can install both:
```bash
conda activate doc_env
conda install -c conda-forge tesseract poppler
```

---

## Verify Installation

```bash
# Check Tesseract
where tesseract
# Output should show: C:\Program Files\Tesseract-OCR\tesseract.exe

# Check Poppler
where pdftoppm
# Output should show: C:\poppler\Library\bin\pdftoppm.exe (or similar)
```

---

## After Installation

1. **Restart the backend**:
```bash
cd backend
conda activate doc_env
python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

2. **Try uploading a PDF again** from the frontend at http://localhost:3000/upload

3. **Monitor processing**:
   - Status should change: `parsing` → `classifying` → `indexing` → `indexed`
   - Or show detailed error if something else is wrong

---

## Troubleshooting

If still failing after installing dependencies:

1. **Check environment variables** in Python:
```python
import pytesseract
print(pytesseract.pytesseract.pytesseract_cmd)  # should find tesseract.exe

from pdf2image import convert_from_path
# should not error
```

2. **Restart Python kernel** after installing dependencies

3. **Check backend logs** for detailed error messages (now displayed in UI under failed files)

---

## Current Status

- ✅ Frontend running at `localhost:3000`
- ✅ Backend running at `localhost:8000`
- ❌ System dependencies missing (Tesseract, Poppler)
- ❌ PDF uploads failing

**Next step**: Install Tesseract and Poppler, then retry the upload.
