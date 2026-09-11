from pathlib import Path
import os
from uuid import uuid4

from fastapi import HTTPException

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").lower()
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}

_s3 = None
if STORAGE_BACKEND == "s3":
    import boto3
    _s3 = boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT_URL") or None,
        region_name=os.getenv("S3_REGION", "auto"),
        aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY"),
    )


def validate_filename(filename: str) -> str:
    safe = Path(filename or "").name
    ext = Path(safe).suffix.lower()
    if not safe or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Chỉ hỗ trợ PDF, JPG, PNG, DOC, DOCX")
    return safe


def new_key(original_name: str, person_id: int, document_type_id: int) -> str:
    ext = Path(original_name).suffix.lower()
    return f"people/{person_id}/documents/{document_type_id}/{uuid4().hex}{ext}"


def put_bytes(key: str, content: bytes, content_type: str | None = None) -> None:
    if STORAGE_BACKEND == "s3":
        kwargs = {"Bucket": os.environ["S3_BUCKET"], "Key": key, "Body": content}
        if content_type:
            kwargs["ContentType"] = content_type
        _s3.put_object(**kwargs)
    else:
        (UPLOAD_DIR / key).parent.mkdir(parents=True, exist_ok=True)
        (UPLOAD_DIR / key).write_bytes(content)


def delete(key: str | None) -> None:
    if not key:
        return
    if STORAGE_BACKEND == "s3":
        _s3.delete_object(Bucket=os.environ["S3_BUCKET"], Key=key)
    else:
        (UPLOAD_DIR / key).unlink(missing_ok=True)


def signed_url(key: str, expires_seconds: int = 300) -> str | None:
    if STORAGE_BACKEND != "s3":
        return None
    return _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["S3_BUCKET"], "Key": key},
        ExpiresIn=expires_seconds,
    )


def local_path(key: str) -> Path:
    return UPLOAD_DIR / key
