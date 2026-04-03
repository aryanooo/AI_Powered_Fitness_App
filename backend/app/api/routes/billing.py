import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import Subscription, SubscriptionPublic, SubscriptionUpdate, UsageSummary
from app.services.usage import get_limits, get_usage_summary

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/subscription", response_model=SubscriptionPublic | None)
def read_subscription(session: SessionDep, current_user: CurrentUser) -> Any:
    statement = select(Subscription).where(Subscription.user_id == current_user.id)
    return session.exec(statement).first()


@router.post("/upgrade", response_model=SubscriptionPublic)
def upgrade_subscription(
    session: SessionDep, current_user: CurrentUser, body: SubscriptionUpdate
) -> Any:
    statement = select(Subscription).where(Subscription.user_id == current_user.id)
    subscription = session.exec(statement).first()
    now = datetime.now(timezone.utc)
    if not subscription:
        subscription = Subscription(
            user_id=current_user.id,
            plan=body.plan or "pro",
            status="active",
            provider=body.provider or "manual",
            external_id=body.external_id,
            current_period_end=body.current_period_end or (now + timedelta(days=30)),
        )
    else:
        update_data = body.model_dump(exclude_unset=True)
        update_data.setdefault("status", "active")
        if "current_period_end" not in update_data:
            update_data["current_period_end"] = now + timedelta(days=30)
        subscription.sqlmodel_update(update_data)
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription


@router.post("/cancel", response_model=SubscriptionPublic | None)
def cancel_subscription(session: SessionDep, current_user: CurrentUser) -> Any:
    statement = select(Subscription).where(Subscription.user_id == current_user.id)
    subscription = session.exec(statement).first()
    if not subscription:
        return None
    subscription.status = "canceled"
    subscription.plan = "free"
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription


@router.get("/usage", response_model=UsageSummary)
def read_usage(session: SessionDep, current_user: CurrentUser) -> Any:
    today = datetime.now(timezone.utc).date()
    usage, limits = get_usage_summary(session, current_user, today)
    return UsageSummary(
        date=today,
        chat_count=usage.chat_count,
        upload_count=usage.upload_count,
        limits=limits,
    )


@router.post(
    "/admin/subscription/{user_id}",
    response_model=SubscriptionPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def admin_update_subscription(
    session: SessionDep, user_id: uuid.UUID, body: SubscriptionUpdate
) -> Any:
    statement = select(Subscription).where(Subscription.user_id == user_id)
    subscription = session.exec(statement).first()
    if not subscription:
        subscription = Subscription(user_id=user_id)
    subscription.sqlmodel_update(body.model_dump(exclude_unset=True))
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription
