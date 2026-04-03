from fastapi import APIRouter

from app.api.routes import (
    admin_documents,
    billing,
    coach,
    documents,
    items,
    login,
    private,
    profiles,
    progress,
    users,
    utils,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(profiles.router)
api_router.include_router(documents.router)
api_router.include_router(coach.router)
api_router.include_router(progress.router)
api_router.include_router(billing.router)
api_router.include_router(admin_documents.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
