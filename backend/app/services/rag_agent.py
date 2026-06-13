import httpx
from typing import List, Dict, Any
from app.core.config import settings
from app.services.vector_store import LocalVectorStore

class AgenticRAGService:
    def __init__(self):
        self.vector_store = LocalVectorStore()

    async def answer_question(self, query: str, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Coordinates context retrieval and synthesis to answer user queries with 
        grounded inline citations and verified visual thumbnail references.
        """
        if chat_history is None:
            chat_history = []

        # 1. Retrieve raw reference blocks from the local vector database
        retrieved_contexts = self.vector_store.search(query, top_k=5)
        
        if not retrieved_contexts:
            return {
                "answer": "I am sorry, but no relevant content could be found in the current document knowledge base to accurately answer your question.",
                "citations": []
            }

        # 2. Format context entries cleanly for LLM processing context window consumption
        context_blocks = []
        for i, ctx in enumerate(retrieved_contexts):
            context_blocks.append(
                f"[Source ID: {i}]\n"
                f"Document Name: {ctx['document_name']}\n"
                f"Page Number: {ctx['page_number']}\n"
                f"Content Text: {ctx['text']}\n"
                f"---"
            )
        formatted_context = "\n\n".join(context_blocks)

        # 3. Construct explicit behavioral controls via System Prompt engineering rules
        system_prompt = (
            "You are an elite, highly-secure Agentic RAG system tasked with answering user questions "
            "based strictly on the extracted document snippets provided below.\n\n"
            "CRITICAL DIRECTIVES:\n"
            "1. Base your answer only and entirely on the provided Context blocks. Do not use outside facts.\n"
            "2. If the context does not contain enough concrete information to confidently fulfill the request, "
            "explicitly state: 'I cannot find relevant grounded content to answer this question based on current files.' "
            "Do not fabricate or hallucinate any details under any circumstances.\n"
            "3. Every factual statement or synthesis you produce must be followed immediately by an inline citation "
            "specifying the document name and page number in this exact format: (Document: filename, Page: X).\n"
            "4. Match your citations precisely to the underlying Source IDs provided in the context.\n\n"
            f"--- PROVIDED SOURCE CONTEXTS ---\n{formatted_context}"
        )

        # 4. Formulate the comprehensive conversational payload list
        messages = [{"role": "system", "content": system_prompt}]
        
        # Inject existing conversation memory to support multi-turn dialogues seamlessly
        for turn in chat_history[-6:]:  # Maintain a localized rolling memory block
            messages.append({"role": turn["role"], "content": turn["content"]})
            
        messages.append({"role": "user", "content": query})

        # 5. Execute inference through Cerebras cloud running zai-glm-4.7
        headers = {
            "Authorization": f"Bearer {settings.CEREBRAS_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": settings.CEREBRAS_MODEL,
            "messages": messages,
            "temperature": 0.0,  # Zero out creativity to minimize hallucination risks
            "max_tokens": 800
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                response = await client.post(
                    f"{settings.CEREBRAS_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                answer_text = result["choices"][0]["message"]["content"].strip()
                
            except Exception as e:
                return {
                    "answer": f"An internal connection error disrupted processing via the LLM pipeline: {str(e)}",
                    "citations": []
                }

        # 6. Extract unique thumbnail references from matching contexts to build frontend UI tracks
        # If the LLM declared it can't find information, don't supply false thumbnail components
        negative_responses = ["cannot find", "no relevant", "sorry, but", "unsupported"]
        unique_citations = {}
        
        if not any(phrase in answer_text.lower() for phrase in negative_responses):
            for ctx in retrieved_contexts:
                # Deduplicate records across unique combinations of Document + Page
                key = f"{ctx['document_name']}_p_{ctx['page_number']}"
                if key not in unique_citations and ctx["image_path"]:
                    unique_citations[key] = {
                        "document_name": ctx["document_name"],
                        "page_number": ctx["page_number"],
                        "image_path": ctx["image_path"]
                    }

        return {
            "answer": answer_text,
            "citations": list(unique_citations.values())
        }