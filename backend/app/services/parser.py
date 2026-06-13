import json
from pathlib import Path
from typing import List, Dict, Any
import pdfplumber
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
from app.core.config import settings

class DocumentParserService:
    @staticmethod
    def _extract_tables_as_markdown(page) -> str:
        """Finds tables on the page and extracts them as markdown strings."""
        tables = page.extract_tables()
        if not tables:
            return ""
        
        md_tables = []
        for table in tables:
            if not table or not any(table): 
                continue
            # Format rows safely escaping newline artifacts
            md_rows = []
            for row in table:
                cleaned_row = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
                md_rows.append("| " + " | ".join(cleaned_row) + " |")
                
            if md_rows:
                # Inject basic markdown table syntax separator
                col_count = len(table[0])
                separator = "| " + " | ".join(["---"] * col_count) + " |"
                md_rows.insert(1, separator)
                md_tables.append("\n".join(md_rows))
                
        return "\n\n".join(md_tables)

    @classmethod
    def parse_pdf(cls, file_path: Path, document_id: str) -> List[Dict[str, Any]]:
        """
        Parses multi-page PDFs handling native text, tables, and scanned elements[cite: 7, 8, 9].
        Saves individual page views as rendering images natively.
        """
        parsed_pages = []
        
        # 1. High-fidelity rasterization generation step for visual citations 
        try:
            images = convert_from_path(str(file_path), dpi=150)
        except Exception as e:
            raise RuntimeError(f"Failed to render document image tracks natively: {str(e)}")

        # 2. Text and structured context harvesting pipeline loops [cite: 7, 8]
        with pdfplumber.open(file_path) as pdf:
            for idx, page in enumerate(pdf.pages):
                page_number = idx + 1
                
                # Render visual thumbnail artifact tracking securely
                img_filename = f"{document_id}_page_{page_number}.png"
                img_save_path = settings.IMAGE_DIR / img_filename
                images[idx].save(img_save_path, "PNG")
                
                # Content harvesting
                raw_text = page.extract_text() or ""
                structured_tables = cls._extract_tables_as_markdown(page) [cite: 40]
                
                # Check if it's a scanned document or handwriting to trigger OCR fallback [cite: 7]
                if len(raw_text.strip()) < 50:
                    # Run OCR directly over our generated PIL image stream 
                    ocr_text = pytesseract.image_to_string(images[idx])
                    combined_content = f"{ocr_text.strip()}\n\n{structured_tables}".strip()
                else:
                    combined_content = f"{raw_text.strip()}\n\n{structured_tables}".strip()
                
                parsed_pages.append({
                    "page_number": page_number,
                    "content": combined_content,
                    "image_path": str(img_save_path.relative_to(settings.BASE_DIR))
                })
                
        # 3. Store structured JSON internally safely at the Storage layer [cite: 8, 30]
        output_json_path = settings.TEXT_DIR / f"{document_id}_parsed.json"
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(parsed_pages, f, indent=4, ensure_ascii=False)
            
        return parsed_pages

    @classmethod
    def parse_plain_text(cls, file_path: Path, document_id: str) -> List[Dict[str, Any]]:
        """Handles basic text files fallback processing pipelines safely[cite: 7]."""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        # Standard flat format encapsulation defaults to page index 1
        parsed_pages = [{
            "page_number": 1,
            "content": content.strip(),
            "image_path": ""  # Plain text doesn't explicitly generate thumbnail images
        }]
        
        output_json_path = settings.TEXT_DIR / f"{document_id}_parsed.json"
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(parsed_pages, f, indent=4)
            
        return parsed_pages