import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    CoachChatMessage,
    CoachChatMessagePublic,
    CoachChatMessagesPublic,
    CoachChatRequest,
    CoachChatResponse,
    CoachChatSession,
    CoachChatSessionCreate,
    CoachChatSessionPublic,
    CoachChatSessionsPublic,
    CoachChatSessionsSummaryPublic,
    CoachChatSessionSummary,
    CoachChatSessionUpdate,
    FitnessPlan,
    FitnessPlanCreate,
    FitnessPlanPublic,
    FitnessPlansPublic,
    FitnessPlanUpdate,
    KnowledgeDocument,
    Message,
)
from app.services.coach import CoachService
from app.services.rag import RAGService
from app.services.usage import check_and_increment_chat

router = APIRouter(prefix="/coach", tags=["coach"])


@router.get("/plans", response_model=FitnessPlansPublic)
def read_my_plans(session: SessionDep, current_user: CurrentUser) -> Any:
    count_statement = (
        select(func.count())
        .select_from(FitnessPlan)
        .where(FitnessPlan.user_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(FitnessPlan)
        .where(FitnessPlan.user_id == current_user.id)
        .order_by(col(FitnessPlan.created_at).desc())
    )
    plans = session.exec(statement).all()
    return FitnessPlansPublic(data=plans, count=count)


@router.post("/plans/generate", response_model=FitnessPlanPublic)
async def generate_plan(
    *, session: SessionDep, current_user: CurrentUser, plan_in: FitnessPlanCreate
) -> Any:
    coach_service = CoachService()
    recent_workout_plan = None
    if plan_in.plan_type.lower() == "diet" and plan_in.include_workout_context:
        workout_statement = (
            select(FitnessPlan)
            .where(
                FitnessPlan.user_id == current_user.id,
                FitnessPlan.plan_type == "workout",
            )
            .order_by(col(FitnessPlan.created_at).desc())
        )
        recent_workout_plan = session.exec(workout_statement).first()

    plan_payload = await coach_service.build_plan(
        current_user, current_user.profile, plan_in, recent_workout_plan
    )
    plan = FitnessPlan.model_validate(
        plan_payload,
        update={
            "user_id": current_user.id,
            "plan_type": plan_in.plan_type,
            "status": "generated",
        },
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@router.patch("/plans/{plan_id}", response_model=FitnessPlanPublic)
def update_plan(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    plan_id: uuid.UUID,
    plan_in: FitnessPlanUpdate,
) -> Any:
    plan = session.get(FitnessPlan, plan_id)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan_in.title is not None:
        plan.title = plan_in.title
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", response_model=Message)
def delete_plan(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    plan_id: uuid.UUID,
) -> Any:
    plan = session.get(FitnessPlan, plan_id)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
    session.delete(plan)
    session.commit()
    return {"message": "Plan deleted"}


@router.get("/sessions", response_model=CoachChatSessionsPublic)
def read_chat_sessions(session: SessionDep, current_user: CurrentUser) -> Any:
    count_statement = (
        select(func.count())
        .select_from(CoachChatSession)
        .where(CoachChatSession.user_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(CoachChatSession)
        .where(CoachChatSession.user_id == current_user.id)
        .order_by(col(CoachChatSession.updated_at).desc())
    )
    sessions = session.exec(statement).all()
    return CoachChatSessionsPublic(data=sessions, count=count)


@router.get("/sessions/summary", response_model=CoachChatSessionsSummaryPublic)
def read_chat_sessions_summary(session: SessionDep, current_user: CurrentUser) -> Any:
    statement = (
        select(CoachChatSession)
        .where(CoachChatSession.user_id == current_user.id)
        .order_by(col(CoachChatSession.updated_at).desc())
    )
    sessions = session.exec(statement).all()
    summaries: list[CoachChatSessionSummary] = []
    for chat_session in sessions:
        message_statement = (
            select(CoachChatMessage)
            .where(CoachChatMessage.session_id == chat_session.id)
            .order_by(col(CoachChatMessage.created_at).desc())
            .limit(1)
        )
        last_message = session.exec(message_statement).first()
        summaries.append(
            CoachChatSessionSummary(
                session=CoachChatSessionPublic.model_validate(chat_session),
                last_message=last_message.content if last_message else None,
                last_role=last_message.role if last_message else None,
            )
        )
    return CoachChatSessionsSummaryPublic(data=summaries, count=len(summaries))


@router.post("/sessions", response_model=CoachChatSessionPublic)
def create_chat_session(
    *, session: SessionDep, current_user: CurrentUser, session_in: CoachChatSessionCreate
) -> Any:
    chat_session = CoachChatSession.model_validate(
        session_in, update={"user_id": current_user.id}
    )
    session.add(chat_session)
    session.commit()
    session.refresh(chat_session)
    return chat_session


@router.patch("/sessions/{session_id}", response_model=CoachChatSessionPublic)
def update_chat_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    session_id: uuid.UUID,
    session_in: CoachChatSessionUpdate,
) -> Any:
    chat_session = session.get(CoachChatSession, session_id)
    if not chat_session or chat_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session_in.title is not None:
        chat_session.title = session_in.title
        chat_session.updated_at = datetime.now(timezone.utc)
    session.add(chat_session)
    session.commit()
    session.refresh(chat_session)
    return chat_session


@router.delete("/sessions/{session_id}", response_model=Message)
def delete_chat_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    session_id: uuid.UUID,
) -> Any:
    chat_session = session.get(CoachChatSession, session_id)
    if not chat_session or chat_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found")
    session.delete(chat_session)
    session.commit()
    return {"message": "Chat session deleted"}


@router.get("/sessions/{session_id}/messages", response_model=CoachChatMessagesPublic)
def read_chat_messages(
    session: SessionDep, current_user: CurrentUser, session_id: uuid.UUID
) -> Any:
    chat_session = session.get(CoachChatSession, session_id)
    if not chat_session or chat_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found")

    statement = (
        select(CoachChatMessage)
        .where(CoachChatMessage.session_id == session_id)
        .order_by(col(CoachChatMessage.created_at))
    )
    messages = session.exec(statement).all()
    return CoachChatMessagesPublic(data=messages, count=len(messages))


@router.post("/chat", response_model=CoachChatResponse)
async def ask_coach(
    *, session: SessionDep, current_user: CurrentUser, body: CoachChatRequest
) -> Any:
    now = datetime.now(timezone.utc)
    if body.session_id:
        chat_session = session.get(CoachChatSession, body.session_id)
        if not chat_session or chat_session.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session_title = body.question[:60].strip().capitalize()
        chat_session = CoachChatSession(
            title=session_title or "Fitness coach chat", user_id=current_user.id
        )
        session.add(chat_session)
        session.commit()
        session.refresh(chat_session)

    check_and_increment_chat(session, current_user, now.date())

    user_message = CoachChatMessage(
        role="user", content=body.question, citations=[], session_id=chat_session.id
    )
    session.add(user_message)

    rag_service = RAGService()
    document_ids = {
        str(document_id)
        for document_id in session.exec(
            select(KnowledgeDocument.id).where(
                KnowledgeDocument.owner_id == current_user.id
            )
        ).all()
    }
    retrieved_chunks = rag_service.retrieve(
        body.question, document_ids=(document_ids or None)
    )
    coach_service = CoachService()
    answer_text = await coach_service.answer_question(
        current_user, current_user.profile, body.question, retrieved_chunks
    )

    citations = [str(chunk["title"]) for chunk in retrieved_chunks]
    assistant_message = CoachChatMessage(
        role="assistant",
        content=answer_text,
        citations=citations,
        session_id=chat_session.id,
    )
    chat_session.updated_at = now
    session.add(assistant_message)
    session.add(chat_session)
    session.commit()
    session.refresh(chat_session)
    session.refresh(assistant_message)

    return CoachChatResponse(
        session=CoachChatSessionPublic.model_validate(chat_session),
        answer=CoachChatMessagePublic.model_validate(assistant_message),
        citations=citations,
        context_snippets=[str(chunk["text"]) for chunk in retrieved_chunks],
    )
