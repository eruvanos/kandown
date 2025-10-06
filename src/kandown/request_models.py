from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class TaskUpdateRequest(BaseModel):
    """Pydantic model for task update requests."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    status: Optional[str] = None
    text: Optional[str] = Field(default=None, min_length=1)
    tags: Optional[List[str]] = None
    order: Optional[int] = None


class TaskCreateRequest(BaseModel):
    """Pydantic model for task creation requests."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    text: str = Field(..., description="Task description")
    status: str = Field(..., description="Initial task status")
    tags: List[str] = Field(default_factory=list, description="Task tags")
    order: Optional[int] = Field(default=None, description="Task order")


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
