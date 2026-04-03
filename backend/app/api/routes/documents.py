import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.services.usage import check_and_increment_upload, get_limits
from app.models import (
    KnowledgeDocument,
    KnowledgeDocumentPublic,
    KnowledgeDocumentsPublic,
    RetrievalResponse,
    RetrievalSnippet,
)
from app.services.rag import RAGService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=KnowledgeDocumentsPublic)
def read_documents(session: SessionDep, current_user: CurrentUser) -> Any:
    count_statement = (
        select(func.count())
        .select_from(KnowledgeDocument)
        .where(KnowledgeDocument.owner_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.owner_id == current_user.id)
        .order_by(col(KnowledgeDocument.created_at).desc())
    )
    documents = session.exec(statement).all()
    return KnowledgeDocumentsPublic(data=documents, count=count)


@router.post("/upload", response_model=KnowledgeDocumentPublic)
async def upload_document(
    session: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)
) -> Any:
    if not file.filename:
        raise HTTPException(status_code=400, detail="A filename is required")

    limits = get_limits(session, current_user)
    total_docs = session.exec(
        select(func.count())
        .select_from(KnowledgeDocument)
        .where(KnowledgeDocument.owner_id == current_user.id)
    ).one()
    if total_docs >= limits.documents_total:
        raise HTTPException(
            status_code=429,
            detail="Document limit reached. Upgrade to Pro for higher limits.",
        )

    check_and_increment_upload(session, current_user, datetime.now(timezone.utc).date())

    rag_service = RAGService()
    document_id = uuid.uuid4()
    content = await file.read()
    max_bytes = settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {settings.UPLOAD_MAX_SIZE_MB} MB.",
        )
    storage_path = rag_service.save_upload(document_id, file.filename, content)
    extracted_text = rag_service.extract_text(storage_path)

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400, detail="The uploaded file does not contain readable text"
        )

    chunk_count = rag_service.index_document(document_id, file.filename, extracted_text)
    document = KnowledgeDocument(
        id=document_id,
        title=file.filename,
        source_type="upload",
        mime_type=file.content_type,
        owner_id=current_user.id,
        storage_path=str(storage_path),
        chunk_count=chunk_count,
        status="indexed",
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


@router.get("/search", response_model=RetrievalResponse)
def search_documents(
    question: str, session: SessionDep, current_user: CurrentUser
) -> Any:
    rag_service = RAGService()
    statement = select(KnowledgeDocument.id).where(
        KnowledgeDocument.owner_id == current_user.id
    )
    document_ids = {str(document_id) for document_id in session.exec(statement).all()}
    snippets = [
        RetrievalSnippet(
            document_title=str(chunk["title"]),
            snippet=str(chunk["text"]),
            score=float(chunk["score"]),
        )
        for chunk in rag_service.retrieve(
            question, document_ids=(document_ids or None)
        )
    ]
    return RetrievalResponse(data=snippets, count=len(snippets))
