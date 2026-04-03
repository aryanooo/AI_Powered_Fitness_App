import uuid
from datetime import date, datetime, timezone
from typing import Optional

from pydantic import EmailStr
from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    profile: Optional["UserProfile"] = Relationship(
        back_populates="user", cascade_delete=True
    )
    fitness_plans: list["FitnessPlan"] = Relationship(
        back_populates="user", cascade_delete=True
    )
    chat_sessions: list["CoachChatSession"] = Relationship(
        back_populates="user", cascade_delete=True
    )
    progress_logs: list["ProgressLog"] = Relationship(
        back_populates="user", cascade_delete=True
    )
    subscription: Optional["Subscription"] = Relationship(
        back_populates="user", cascade_delete=True
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


class UserProfileBase(SQLModel):
    age: int | None = Field(default=None, ge=13, le=100)
    height_cm: float | None = Field(default=None, gt=0, le=300)
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    gender: str | None = Field(default=None, max_length=50)
    goal: str | None = Field(default=None, max_length=100)
    activity_level: str | None = Field(default=None, max_length=100)
    dietary_preference: str | None = Field(default=None, max_length=100)
    injuries: str | None = Field(default=None, max_length=500)
    experience_level: str | None = Field(default=None, max_length=100)
    preferred_workout_days: int | None = Field(default=None, ge=1, le=7)


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfile(UserProfileBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id", unique=True, nullable=False, ondelete="CASCADE"
    )
    user: User | None = Relationship(back_populates="profile")


class UserProfilePublic(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class FitnessPlanBase(SQLModel):
    plan_type: str = Field(max_length=50)
    title: str = Field(max_length=255)
    summary: str = Field(max_length=2000)
    content: str = Field(max_length=12000)
    status: str = Field(default="draft", max_length=50)


class FitnessPlanCreate(SQLModel):
    plan_type: str = Field(default="workout", max_length=50)
    goal_override: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=1000)
    include_workout_context: bool = Field(default=False)


class FitnessPlanUpdate(SQLModel):
    title: str | None = Field(default=None, max_length=255)


class FitnessPlan(FitnessPlanBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    user: User | None = Relationship(back_populates="fitness_plans")


class FitnessPlanPublic(FitnessPlanBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime | None = None


class FitnessPlansPublic(SQLModel):
    data: list["FitnessPlanPublic"]
    count: int


class CoachChatSessionBase(SQLModel):
    title: str = Field(default="New chat", min_length=1, max_length=255)


class CoachChatSessionCreate(CoachChatSessionBase):
    pass


class CoachChatSessionUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)


class CoachChatSession(CoachChatSessionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    user: User | None = Relationship(back_populates="chat_sessions")
    messages: list["CoachChatMessage"] = Relationship(
        back_populates="session", cascade_delete=True
    )


class CoachChatSessionPublic(CoachChatSessionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CoachChatSessionsPublic(SQLModel):
    data: list["CoachChatSessionPublic"]
    count: int


class CoachChatMessageBase(SQLModel):
    role: str = Field(max_length=20)
    content: str = Field(min_length=1, max_length=12000)
    citations: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class CoachChatMessage(CoachChatMessageBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    session_id: uuid.UUID = Field(
        foreign_key="coachchatsession.id", nullable=False, ondelete="CASCADE"
    )
    session: CoachChatSession | None = Relationship(back_populates="messages")


class CoachChatMessagePublic(CoachChatMessageBase):
    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime | None = None


class CoachChatMessagesPublic(SQLModel):
    data: list["CoachChatMessagePublic"]
    count: int


class KnowledgeDocumentBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    source_type: str = Field(default="upload", max_length=50)
    mime_type: str | None = Field(default=None, max_length=100)
    status: str = Field(default="indexed", max_length=50)
    chunk_count: int = 0


class KnowledgeDocument(KnowledgeDocumentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    storage_path: str = Field(max_length=500)


class KnowledgeDocumentPublic(KnowledgeDocumentBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    storage_path: str
    created_at: datetime | None = None


class KnowledgeDocumentsPublic(SQLModel):
    data: list["KnowledgeDocumentPublic"]
    count: int


class SubscriptionBase(SQLModel):
    plan: str = Field(default="free", max_length=30)
    status: str = Field(default="inactive", max_length=30)
    provider: str | None = Field(default=None, max_length=50)
    external_id: str | None = Field(default=None, max_length=255)
    current_period_end: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )


class SubscriptionUpdate(SQLModel):
    plan: str | None = Field(default=None, max_length=30)
    status: str | None = Field(default=None, max_length=30)
    provider: str | None = Field(default=None, max_length=50)
    external_id: str | None = Field(default=None, max_length=255)
    current_period_end: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )


class Subscription(SubscriptionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id", unique=True, nullable=False, ondelete="CASCADE"
    )
    user: User | None = Relationship(back_populates="subscription")


class SubscriptionPublic(SubscriptionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime | None = None


class UsageDaily(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    usage_date: date = Field(index=True)
    user_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    chat_count: int = 0
    upload_count: int = 0


class UsageLimits(SQLModel):
    plan: str
    chat_per_day: int
    uploads_per_day: int
    documents_total: int


class UsageSummary(SQLModel):
    date: date
    chat_count: int
    upload_count: int
    limits: UsageLimits


class ProgressLogBase(SQLModel):
    logged_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    workout_minutes: int | None = Field(default=None, ge=0, le=1000)
    workout_type: str | None = Field(default=None, max_length=100)
    calories: int | None = Field(default=None, ge=0, le=20000)
    protein_g: int | None = Field(default=None, ge=0, le=1000)
    carbs_g: int | None = Field(default=None, ge=0, le=2000)
    fat_g: int | None = Field(default=None, ge=0, le=1000)
    notes: str | None = Field(default=None, max_length=2000)


class ProgressLogCreate(ProgressLogBase):
    pass


class ProgressLogUpdate(SQLModel):
    logged_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)  # type: ignore
    )
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    workout_minutes: int | None = Field(default=None, ge=0, le=1000)
    workout_type: str | None = Field(default=None, max_length=100)
    calories: int | None = Field(default=None, ge=0, le=20000)
    protein_g: int | None = Field(default=None, ge=0, le=1000)
    carbs_g: int | None = Field(default=None, ge=0, le=2000)
    fat_g: int | None = Field(default=None, ge=0, le=1000)
    notes: str | None = Field(default=None, max_length=2000)


class ProgressLog(ProgressLogBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    user: User | None = Relationship(back_populates="progress_logs")


class ProgressLogPublic(ProgressLogBase):
    id: uuid.UUID
    user_id: uuid.UUID


class ProgressLogsPublic(SQLModel):
    data: list["ProgressLogPublic"]
    count: int


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class CoachChatRequest(SQLModel):
    question: str = Field(min_length=3, max_length=2000)
    session_id: uuid.UUID | None = None
    goal_override: str | None = Field(default=None, max_length=100)


class CoachChatResponse(SQLModel):
    session: CoachChatSessionPublic
    answer: CoachChatMessagePublic
    citations: list[str]
    context_snippets: list[str]


class CoachChatSessionSummary(SQLModel):
    session: CoachChatSessionPublic
    last_message: str | None = None
    last_role: str | None = None


class CoachChatSessionsSummaryPublic(SQLModel):
    data: list["CoachChatSessionSummary"]
    count: int


class RetrievalSnippet(SQLModel):
    document_title: str
    snippet: str
    score: float


class RetrievalResponse(SQLModel):
    data: list[RetrievalSnippet]
    count: int
