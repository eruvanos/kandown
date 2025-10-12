"""Pydantic models for type-safe task and settings handling."""

from enum import Enum
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field, ConfigDict


class TaskType(str, Enum):
    chore = "chore"
    feature = "feature"
    bug = "bug"
    epic = "epic"
    request = "request"
    experiment = "experiment"


class Task(BaseModel):
    """Pydantic model for a kanban task."""

    model_config = ConfigDict(
        extra="allow",  # Allow extra fields for backward compatibility
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: Optional[str] = None
    text: str = Field(..., description="Task description")
    status: str = Field(..., description="Task status (e.g., todo, in-progress, done)")
    tags: List[str] = Field(default_factory=list, description="List of task tags")
    order: Optional[int] = Field(default=0, description="Task order for sorting")
    created_at: Optional[str] = Field(default=None, description="Creation timestamp")
    updated_at: Optional[str] = Field(default=None, description="Last update timestamp")
    closed_at: Optional[str] = Field(default=None, description="Completion timestamp")
    type: Optional[TaskType] = Field(default=TaskType.feature, description="Task type (e\.g\., chore)")

    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary format for JSON serialization."""
        return self.model_dump(exclude_none=True, mode="json")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        """Create task from dictionary data."""
        return cls(**data)


class Settings(BaseModel):
    """Pydantic model for kanban board settings."""

    model_config = ConfigDict(
        extra="allow",  # Allow extra fields for future extensions
        validate_assignment=True,
    )

    dark_mode: bool = Field(default=False, description="Enable dark mode")
    random_port: bool = Field(default=False, description="Use random port on startup")

    def to_dict(self) -> Dict[str, Any]:
        """Convert settings to dictionary format for JSON serialization."""
        return self.model_dump(exclude_none=True, mode="json")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Settings":
        """Create settings from dictionary data."""
        return cls(**data)


class BacklogData(BaseModel):
    """Pydantic model for the entire backlog file structure."""

    model_config = ConfigDict(
        extra="forbid",  # Strict validation for the main structure
        validate_assignment=True,
    )

    settings: Settings = Field(default_factory=Settings, description="Board settings")
    tasks: List[Task] = Field(default_factory=list, description="List of tasks")

    def to_dict(self) -> Dict[str, Any]:
        """Convert backlog data to dictionary format for JSON serialization."""
        return self.model_dump(exclude_none=True, mode="json")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Settings":
        """Create settings from dictionary data."""
        return cls(**data)
