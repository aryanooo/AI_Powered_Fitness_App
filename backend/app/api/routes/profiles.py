from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.models import UserProfile, UserProfilePublic, UserProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=UserProfilePublic | None)
def read_my_profile(session: SessionDep, current_user: CurrentUser) -> Any:
    return current_user.profile


@router.put("/me", response_model=UserProfilePublic)
def upsert_my_profile(
    *, session: SessionDep, current_user: CurrentUser, profile_in: UserProfileUpdate
) -> Any:
    profile = current_user.profile
    profile_data = profile_in.model_dump(exclude_unset=True)
    now = datetime.now(timezone.utc)

    if profile:
        profile.sqlmodel_update(profile_data)
        profile.updated_at = now
    else:
        profile = UserProfile.model_validate(
            profile_data,
            update={
                "user_id": current_user.id,
                "created_at": now,
                "updated_at": now,
            },
        )

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
