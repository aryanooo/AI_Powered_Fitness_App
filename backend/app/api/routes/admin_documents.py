import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import KnowledgeDocument, KnowledgeDocumentPublic, KnowledgeDocumentsPublic
from app.services.rag import RAGService

router = APIRouter(
    prefix="/admin/documents",
    tags=["admin-documents"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("/", response_model=KnowledgeDocumentsPublic)
def read_all_documents(session: SessionDep) -> Any:
    count_statement = select(func.count()).select_from(KnowledgeDocument)
    count = session.exec(count_statement).one()
    statement = select(KnowledgeDocument).order_by(
        col(KnowledgeDocument.created_at).desc()
    )
    documents = session.exec(statement).all()
    return KnowledgeDocumentsPublic(data=documents, count=count)


@router.delete("/{document_id}")
def delete_document(session: SessionDep, document_id: uuid.UUID) -> dict[str, str]:
    document = session.get(KnowledgeDocument, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    rag_service = RAGService()
    rag_service.delete_document(document_id)

    try:
        storage_path = Path(document.storage_path)
        storage_path.unlink(missing_ok=True)
    except Exception:
        pass

    session.delete(document)
    session.commit()
    return {"message": "Document deleted"}
