# Secure Document Intelligence & Agentic RAG Platform

An enterprise-grade, secure, full-stack application that ingests messy real-world documents (scanned PDFs, handwritten images, complex embedded tables, plain text), classifies them across multiple metadata dimensions, and hosts an interactive multi-turn chatbot capable of generating answers with precise page-level inline citations and image thumbnail previews.

---

## 🏗️ Architecture Overview

The platform is designed as a decoupled, high-performance monorepo splitting an asynchronous Python backend from a highly responsive Next.js frontend:

1. **Ingestion & Parsing Pipeline (FastAPI):** Uses `pdfplumber` for structured text and layout extraction, transforming embedded tables directly into markdown syntax to retain cell structure. It features an automated local OCR fallback engine (`pytesseract`) to handle scanned or handwritten pages.
2. **Multi-Page Visual Rasterization:** Employs `pdf2image` to convert every processed page into separate static visual thumbnail assets, creating a 1:1 mapping for visual citations.
3. **Structured Classification:** Aggregates a compressed textual summary representation and calls **Z.ai's GLM 4.7 (`zai-glm-4.7`)** hosted on ultra-low latency **Cerebras Cloud Inference**, returning structured JSON mapping document types, topics, characteristics, and sensitivities.
4. **Local Embeddings & Vector Store:** Chunks pages carefully, keeping page boundaries intact to guarantee citation accuracy. It uses open-source `sentence-transformers (all-MiniLM-L6-v2)` and `numpy` to handle local semantic math safely and privately.
5. **Agentic RAG Synthesis:** Orchestrates a zero-hallucination inference loop with `zai-glm-4.7`, matching retrieved blocks directly against prompt contexts and enforcing strict citation rules.
6. **Frontend Experience (Next.js + TS + Tailwind):** Features a dedicated multi-file upload manager with live pipeline phase trackers, an interactive multi-turn chat panel, full lightboxed citation modals, and a built-in real-time browser voice transcription input utility (`Web Speech API`).

---

## 🛡️ Security Decisions & Threat Model

Document security was treated as a primary constraint and implemented at every layer of the data lifecycle:

### 1. What was Implemented
* **Upload Layer Path Traversal Mitigation:** Implemented strict filename sanitization via `werkzeug.utils.secure_filename` combined with a cryptographically secure random hexadecimal prefix token. This eliminates any directory traversal vectors (`../`) and prevents local asset enumeration or name-collision wiping.
* **Upload Buffering Safeguards:** Built an active stream-chunk accumulator inside the file ingestion endpoint. If an active document upload exceeds the `MAX_FILE_SIZE_BYTES` configuration metric (15MB), the stream terminates immediately and removes the partial file chunk to mitigate Denial of Service (DoS) disk consumption attacks.
* **Storage Isolation Layer:** Configured a local storage directory pattern entirely excluded from system version tracking via global `.gitignore` rules. This completely isolates processed visual text extractions, local vector indices, and temporary original source binaries from accidental exposures on public version control networks.
* **Zero-Hallucination Retrieval Hardening:** System prompts for the RAG agent are engineered to restrict behavior to the attached context block. Temperature parameters are locked at `0.0` to force deterministic adherence to facts and block cross-tenant data leakage or model hallucinations.

### 2. What was Considered but Skipped
* **OAuth2 User Authentication & RBAC:** Skipped due to the 3-day development window. Currently, any client interacting with the endpoints can query the indexed collection.
* **Data-at-Rest Encryption:** Uploaded documents, generated page-level image matrices, and local vector index arrays are stored in plaintext on disk rather than inside encrypted blob storage vaults (e.g., using AES-256 wrappers).

### 3. What would be Added with More Time
* **Native Malware Scanning Engine:** Integrate an inline file scanner middleware component (such as a local `ClamAV` daemon attachment) to scan uploaded byte vectors for embedded macro payloads before writing them to the system disk.
* **True Multi-Tenant Namespace Partitioning:** Implement strict database multi-tenancy. Every incoming vector entry and generated thumbnail asset would contain a secure `tenant_id` attribute, filtering queries at the vector-search database abstraction layer.

---

## 🚀 Local Setup & Installation

### Prerequisites
Ensure your local host machine has the following native system binaries installed:
* **Tesseract OCR Engine** (`tesseract-ocr`)
* **Poppler PDF Utilities** (`poppler-utils`)

### 1. Backend Configuration
Navigate to the backend directory, initialize a virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt