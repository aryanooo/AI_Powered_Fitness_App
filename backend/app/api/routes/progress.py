import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ProgressLog,
    ProgressLogCreate,
    ProgressLogPublic,
    ProgressLogUpdate,
    ProgressLogsPublic,
)

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/logs", response_model=ProgressLogsPublic)
def read_progress_logs(session: SessionDep, current_user: CurrentUser) -> Any:
    count_statement = (
        select(func.count())
        .select_from(ProgressLog)
        .where(ProgressLog.user_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(ProgressLog)
        .where(ProgressLog.user_id == current_user.id)
        .order_by(col(ProgressLog.logged_at).desc())
    )
    logs = session.exec(statement).all()
    return ProgressLogsPublic(data=logs, count=count)


@router.post("/logs", response_model=ProgressLogPublic)
def create_progress_log(
    *, session: SessionDep, current_user: CurrentUser, log_in: ProgressLogCreate
) -> Any:
    log = ProgressLog.model_validate(log_in, update={"user_id": current_user.id})
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.patch("/logs/{log_id}", response_model=ProgressLogPublic)
def update_progress_log(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    log_id: uuid.UUID,
    log_in: ProgressLogUpdate,
) -> Any:
    log = session.get(ProgressLog, log_id)
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Progress log not found")
    update_data = log_in.model_dump(exclude_unset=True)
    log.sqlmodel_update(update_data)
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.delete("/logs/{log_id}")
def delete_progress_log(
    session: SessionDep, current_user: CurrentUser, log_id: uuid.UUID
) -> dict[str, str]:
    log = session.get(ProgressLog, log_id)
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Progress log not found")
    session.delete(log)
    session.commit()
    return {"message": "Progress log deleted"}
