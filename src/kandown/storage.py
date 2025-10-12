from pathlib import Path


class AttachmentResolver:
    """Provides a file path for storing and loading attachments."""

    def __init__(self, attachment_folder: Path):
        self.attachment_folder = attachment_folder.absolute()

    def resolve(self, filename: str) -> Path:
        self.attachment_folder.mkdir(parents=True, exist_ok=True)
        return self.attachment_folder / filename
