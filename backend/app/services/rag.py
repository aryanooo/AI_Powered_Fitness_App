import hashlib
import json
import math
import uuid
from pathlib import Path

from pypdf import PdfReader

from app.core.config import settings


class RAGService:
    def __init__(self) -> None:
        self.storage_dir = settings.rag_storage_path
        self.documents_dir = self.storage_dir / "documents"
        self.index_path = self.storage_dir / "rag_index.json"
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def save_upload(self, document_id: uuid.UUID, filename: str, content: bytes) -> Path:
        suffix = Path(filename).suffix or ".txt"
        storage_path = self.documents_dir / f"{document_id}{suffix}"
        storage_path.write_bytes(content)
        return storage_path

    def extract_text(self, file_path: Path) -> str:
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            reader = PdfReader(str(file_path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        return file_path.read_text(encoding="utf-8", errors="ignore")

    def _hash_embedding(self, text: str) -> list[float]:
        dims = settings.RAG_EMBEDDING_DIMENSION
        vector = [0.0] * dims
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dims
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    def _chunk_text(self, text: str, chunk_size: int = 700, overlap: int = 120) -> list[str]:
        clean_text = " ".join(text.split())
        if not clean_text:
            return []

        chunks: list[str] = []
        start = 0
        while start < len(clean_text):
            end = min(len(clean_text), start + chunk_size)
            chunks.append(clean_text[start:end])
            if end >= len(clean_text):
                break
            start = max(end - overlap, start + 1)
        return chunks

    def _load_index(self) -> list[dict[str, object]]:
        if not self.index_path.exists():
            return []
        return json.loads(self.index_path.read_text(encoding="utf-8"))

    def _save_index(self, entries: list[dict[str, object]]) -> None:
        self.index_path.write_text(json.dumps(entries, indent=2), encoding="utf-8")

    def index_document(self, document_id: uuid.UUID, title: str, text: str) -> int:
        entries = self._load_index()
        entries = [entry for entry in entries if entry.get("document_id") != str(document_id)]

        chunks = self._chunk_text(text)
        for idx, chunk in enumerate(chunks):
            entries.append(
                {
                    "document_id": str(document_id),
                    "title": title,
                    "chunk_id": idx,
                    "text": chunk,
                    "embedding": self._hash_embedding(chunk),
                }
            )

        self._save_index(entries)
        return len(chunks)

    def delete_document(self, document_id: uuid.UUID) -> None:
        entries = self._load_index()
        entries = [entry for entry in entries if entry.get("document_id") != str(document_id)]
        self._save_index(entries)

    def retrieve(
        self,
        question: str,
        top_k: int | None = None,
        document_ids: set[str] | None = None,
    ) -> list[dict[str, object]]:
        entries = self._load_index()
        if not entries:
            return []

        query_embedding = self._hash_embedding(question)
        scored: list[dict[str, object]] = []

        for entry in entries:
            if document_ids and str(entry.get("document_id")) not in document_ids:
                continue
            embedding = entry.get("embedding", [])
            score = sum(
                float(a) * float(b) for a, b in zip(query_embedding, embedding, strict=False)
            )
            scored.append({**entry, "score": round(score, 4)})

        scored.sort(key=lambda item: float(item["score"]), reverse=True)
        return scored[: top_k or settings.RAG_TOP_K]
