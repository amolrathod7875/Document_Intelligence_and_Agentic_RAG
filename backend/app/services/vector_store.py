import os
import json
import pickle
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import settings

class LocalVectorStore:
    def __init__(self):
        # Using a highly-optimized, lightweight open-source embedding model
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.index_path = settings.VECTOR_DB_DIR / "vector_index.pkl"
        self.kb = self._load_index()

    def _load_index(self) -> Dict[str, Any]:
        """Loads the vector index from disk if it exists, otherwise initializes an empty index."""
        if self.index_path.exists():
            try:
                with open(self.index_path, "rb") as f:
                    return pickle.load(f)
            except Exception:
                pass
        return {"embeddings": [], "metadata": []}

    def _save_index(self):
        """Persists the updated index structure back to disk safely."""
        with open(self.index_path, "wb") as f:
            pickle.dump(self.kb, f)

    def _chunk_text(self, text: str, chunk_size: int = 600, overlap: int = 120) -> List[str]:
        """Splits flat text into overlapping windows to protect context boundaries."""
        words = text.split()
        if len(words) <= chunk_size:
            return [text]
        
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            if i + chunk_size >= len(words):
                break
        return chunks

    def add_document(self, document_name: str, parsed_pages: List[Dict[str, Any]]):
        """
        Chunks the content of each page individually, generates vector embeddings,
        and links them firmly to their source metadata for tracking citations.
        """
        new_texts = []
        new_metadata = []

        for page in parsed_pages:
            page_num = page["page_number"]
            page_content = page["content"]
            image_path = page["image_path"]

            if not page_content.strip():
                continue

            # Chunk each individual page separately to keep citations highly precise
            chunks = self._chunk_text(page_content)
            for chunk in chunks:
                new_texts.append(chunk)
                new_metadata.append({
                    "document_name": document_name,
                    "page_number": page_num,
                    "image_path": image_path,
                    "text": chunk
                })

        if not new_texts:
            return

        # Generate embeddings in batch
        embeddings = self.model.encode(new_texts, convert_to_numpy=True)

        if len(self.kb["embeddings"]) == 0:
            self.kb["embeddings"] = embeddings
        else:
            self.kb["embeddings"] = np.vstack([self.kb["embeddings"], embeddings])
            
        self.kb["metadata"].extend(new_metadata)
        self._save_index()

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """Performs a cosine similarity search across the embedded vector field."""
        if len(self.kb["embeddings"]) == 0:
            return []

        query_embedding = self.model.encode([query], convert_to_numpy=True)[0]
        
        # Calculate cosine similarities
        norm_matrix = np.linalg.norm(self.kb["embeddings"], axis=1)
        norm_query = np.linalg.norm(query_embedding)
        
        if norm_query == 0 or np.any(norm_matrix == 0):
            return []

        similarities = np.dot(self.kb["embeddings"], query_embedding) / (norm_matrix * norm_query)
        
        # Sort indices by highest score descending
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            # Only include contextually viable results
            if similarities[idx] > 0.15: 
                item = self.kb["metadata"][idx].copy()
                item["score"] = float(similarities[idx])
                results.append(item)
                
        return results