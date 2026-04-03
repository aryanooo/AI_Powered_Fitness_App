from datetime import date

from fastapi import HTTPException
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Subscription, UsageDaily, UsageLimits, User


def _get_subscription(session: Session, user: User) -> Subscription | None:
    statement = select(Subscription).where(Subscription.user_id == user.id)
    return session.exec(statement).first()


def get_limits(session: Session, user: User) -> UsageLimits:
    subscription = _get_subscription(session, user)
    plan = subscription.plan if subscription and subscription.status == "active" else "free"
    if plan == "pro":
        return UsageLimits(
            plan="pro",
            chat_per_day=settings.PRO_MAX_CHAT_PER_DAY,
            uploads_per_day=settings.PRO_MAX_UPLOADS_PER_DAY,
            documents_total=settings.PRO_MAX_DOCUMENTS_TOTAL,
        )
    return UsageLimits(
        plan="free",
        chat_per_day=settings.FREE_MAX_CHAT_PER_DAY,
        uploads_per_day=settings.FREE_MAX_UPLOADS_PER_DAY,
        documents_total=settings.FREE_MAX_DOCUMENTS_TOTAL,
    )


def _get_or_create_usage(session: Session, user: User, day: date) -> UsageDaily:
    statement = (
        select(UsageDaily)
        .where(UsageDaily.user_id == user.id)
        .where(UsageDaily.usage_date == day)
    )
    usage = session.exec(statement).first()
    if usage:
        return usage
    usage = UsageDaily(user_id=user.id, usage_date=day, chat_count=0, upload_count=0)
    session.add(usage)
    session.commit()
    session.refresh(usage)
    return usage


def check_and_increment_chat(session: Session, user: User, day: date) -> UsageDaily:
    usage = _get_or_create_usage(session, user, day)
    limits = get_limits(session, user)
    if usage.chat_count >= limits.chat_per_day:
        raise HTTPException(
            status_code=429,
            detail="Daily chat limit reached. Upgrade to Pro for higher limits.",
        )
    usage.chat_count += 1
    session.add(usage)
    session.commit()
    session.refresh(usage)
    return usage


def check_and_increment_upload(session: Session, user: User, day: date) -> UsageDaily:
    usage = _get_or_create_usage(session, user, day)
    limits = get_limits(session, user)
    if usage.upload_count >= limits.uploads_per_day:
        raise HTTPException(
            status_code=429,
            detail="Daily upload limit reached. Upgrade to Pro for higher limits.",
        )
    usage.upload_count += 1
    session.add(usage)
    session.commit()
    session.refresh(usage)
    return usage


def get_usage_summary(session: Session, user: User, day: date) -> tuple[UsageDaily, UsageLimits]:
    usage = _get_or_create_usage(session, user, day)
    limits = get_limits(session, user)
    return usage, limits
