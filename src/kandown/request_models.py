from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from kandown.models import TaskType


class TaskUpdateRequest(BaseModel):
    """Pydantic model for task update requests."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    status: str | None = None
    text: str | None = Field(default=None, min_length=1)
    tags: List[str] | None = None
    order: int | None = None
    type: TaskType | None = Field(None, alias="type")


class TaskCreateRequest(BaseModel):
    """Pydantic model for task creation requests."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    text: str = Field(..., description="Task description")
    status: str = Field(..., description="Initial task status")
    tags: List[str] = Field(default_factory=list, description="Task tags")
    order: Optional[int] = Field(default=None, description="Task order")
    type: TaskType = Field(default=TaskType.feature, description="Task type (chore, feature, bug)")


class SettingsUpdateRequest(BaseModel):
    """Pydantic model for settings update requests."""

    model_config = ConfigDict(
        extra="allow",  # Allow extra settings for extensibility
        str_strip_whitespace=True,
    )

    columns: Optional[List[str]] = None
    title: Optional[str] = None
    theme: Optional[str] = None
    auto_save: Optional[bool] = None
