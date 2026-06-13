import json
import httpx
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from app.core.config import settings

class DocumentClassificationSchema(BaseModel):
    """Defines the strict multi-dimensional schema requested for classification."""
    document_type: str = Field(description="The functional classification (e.g., 'Invoice', 'Legal Contract', 'Medical Report', 'Handwritten Note', 'Academic Paper')")
    primary_topic: str = Field(description="The core subject matter or theme discussed in the text content.")
    content_characteristics: List[str] = Field(description="Structural attributes detected, such as 'tabular_data', 'dense_text', 'bulleted_lists', 'handwritten_ocr'.")
    sensitivity_level: str = Field(description="Security data classification tier based on context: 'Public', 'Internal Use Only', 'Confidential', or 'Highly Restricted'.")
    summary: str = Field(description="A concise 2-3 sentence conceptual summary of the document contents.")

class DocumentClassifierService:
    @classmethod
    def _prepare_sample_text(cls, parsed_pages: List[Dict[str, Any]], max_chars: int = 15000) -> str:
        """
        Aggregates text from across the document up to a safe window limit 
        to ensure comprehensive topical assessment without bloated latency.
        """
        combined_text = []
        for page in parsed_pages:
            combined_text.append(f"--- Page {page['page_number']} ---\n{page['content']}")
        
        full_content = "\n\n".join(combined_text)
        if len(full_content) <= max_chars:
            return full_content
        
        # Smart compression window: take a balanced snippet from the beginning and end
        half_window = max_chars // 2
        return f"{full_content[:half_window]}\n\n[... CONTENT TRUNCATED FOR CLASSIFICATION EVALUATION ...]\n\n{full_content[-half_window:]}"

    @classmethod
    async def classify_document(cls, parsed_pages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Dispatches aggregated text snippets to the Cerebras API running zai-glm-4.7
        to return a validated structured JSON object.
        """
        if not settings.CEREBRAS_API_KEY:
            # Secure fallback to prevent system failures if API credentials are temporarily unconfigured
            return {
                "document_type": "Unclassified",
                "primary_topic": "Unknown",
                "content_characteristics": [],
                "sensitivity_level": "Internal Use Only",
                "summary": "Classification skipped due to missing API configuration credentials."
            }

        sample_text = cls._prepare_sample_text(parsed_pages)
        
        system_prompt = (
            "You are an expert Document Intelligence Agent. Analyze the provided multi-page document "
            "text and classify it with extreme analytical precision across multiple dimensions.\n"
            "You must respond with a single, valid JSON object that adheres strictly to this schema:\n"
            "{\n"
            "  \"document_type\": \"string\",\n"
            "  \"primary_topic\": \"string\",\n"
            "  \"content_characteristics\": [\"string\"],\n"
            "  \"sensitivity_level\": \"Public\" | \"Internal Use Only\" | \"Confidential\" | \"Highly Restricted\",\n"
            "  \"summary\": \"string\"\n"
            "}\n"
            "Do not include any preambles, introductory phrasing, conversational text, or markdown code blocks. "
            "Output only raw, valid, parseable JSON."
        )

        headers = {
            "Authorization": f"Bearer {settings.CEREBRAS_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": settings.CEREBRAS_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Document text content for analysis:\n\n{sample_text}"}
            ],
            # Ensure deterministic output parameters optimized for extraction
            "temperature": 0.1, 
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{settings.CEREBRAS_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                
                result = response.json()
                raw_json_str = result["choices"][0]["message"]["content"].strip()
                
                # Parse and validate structure via Pydantic representation
                validated_data = DocumentClassificationSchema.model_validate_json(raw_json_str)
                return validated_data.model_dump()
                
            except (httpx.HTTPStatusError, json.JSONDecodeError, KeyError, Exception) as e:
                # Resilient error containment layer 
                return {
                    "document_type": "Error/Unknown",
                    "primary_topic": "Processing Error",
                    "content_characteristics": ["error_fallback"],
                    "sensitivity_level": "Confidential",
                    "summary": f"Failed to successfully extract structured JSON categorization via LLM: {str(e)}"
                }