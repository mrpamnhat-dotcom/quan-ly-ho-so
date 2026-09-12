from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
import os
import secrets
import threading
import time

from fastapi import FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import func, inspect, select, text
from sqlalchemy.exc import IntegrityError

from .db import engine, get_db
from .models import AdminSession, AuditLog, Base, Document, DocumentType, Person, PersonSession
from .security import hash_password, session_expiry, token_hash, verify_password
from .storage import MAX_FILE_SIZE, delete as storage_delete, local_path, new_key, put_bytes, signed_url, validate_filename

app = FastAPI(title="Quan Ly Ho So API", version="1.1.0")


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in cors_origins.split(",") if item.strip()],
    allow_origin_regex=r"^https?://(localhost|127.0.0.1|192.168.1.152)(:[0-9]+)?$", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_RATE_LIMIT_LOCK = threading.Lock()
_RATE_LIMIT_EVENTS: dict[str, deque[float]] = defaultdict(deque)


def enforce_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    with _RATE_LIMIT_LOCK:
        events = _RATE_LIMIT_EVENTS[key]
        cutoff = now - window_seconds
        while events and events[0] <= cutoff:
            events.popleft()
        if len(events) >= limit:
            raise HTTPException(429, "Quá nhiều yêu cầu, vui lòng thử lại sau")
        events.append(now)


def client_key(request: Request, prefix: str) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{prefix}:{host}"


def audit(db, action: str, target_type: str, target_id: int | None = None, detail: str | None = None) -> None:
    # Never store passwords, PINs, session tokens, access codes, or file contents.
    db.add(AuditLog(action=action, target_type=target_type, target_id=target_id, detail=detail))


ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")
if not ADMIN_PASSWORD_HASH:
    ADMIN_PASSWORD_HASH = hash_password(os.getenv("ADMIN_PASSWORD", "change-me"))

PERSON_SESSION_HOURS = int(os.getenv("PERSON_SESSION_HOURS", "12"))


def new_person_pin() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def person_session_expiry():
    return datetime.now(timezone.utc) + timedelta(hours=PERSON_SESSION_HOURS)


def migrate_v1_person_pins():
    inspector = inspect(engine)
    columns = {c["name"] for c in inspector.get_columns("people")} if inspector.has_table("people") else set()
    if not columns or "access_pin_hash" in columns:
        return

    # v1.0 used access_code for per-person links. Keep that legacy column for
    # compatibility, but replace its authentication role with a hashed PIN.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE people ADD COLUMN access_pin_hash VARCHAR(255)"))
        rows = conn.execute(text("SELECT id FROM people WHERE access_pin_hash IS NULL")).fetchall()
        for row in rows:
            conn.execute(
                text("UPDATE people SET access_pin_hash = :h WHERE id = :id"),
                {"h": hash_password(new_person_pin()), "id": row[0]},
            )
        conn.execute(text("ALTER TABLE people ALTER COLUMN access_pin_hash SET NOT NULL"))


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    migrate_v1_person_pins()
    seed_demo_data()
    with get_db() as db:
        now = datetime.now(timezone.utc)
        for session in db.scalars(select(AdminSession)).all():
            if session.expires_at <= now:
                db.delete(session)
        for session in db.scalars(select(PersonSession)).all():
            if session.expires_at <= now:
                db.delete(session)


def seed_demo_data():
    with get_db() as db:
        if db.scalar(select(func.count(Person.id))) == 0:
            pin = os.getenv("DEMO_PERSON_PIN", "123456")
            db.add(Person(name="Nguyễn Văn A", code="NV001", phone="0900000000", access_pin_hash=hash_password(pin)))
        if db.scalar(select(func.count(DocumentType.id))) == 0:
            db.add_all([
                DocumentType(name="CCCD", required=True),
                DocumentType(name="Bằng cấp", required=True),
                DocumentType(name="Ảnh thẻ", required=False),
            ])


def auth_token(authorization: str | None) -> str:
    return (authorization or "").removeprefix("Bearer ").strip()


def require_admin(authorization: str | None):
    token = auth_token(authorization)
    if not token:
        raise HTTPException(401, "Cần đăng nhập Admin")
    with get_db() as db:
        session = db.scalar(select(AdminSession).where(AdminSession.token_hash == token_hash(token)))
        if not session or session.expires_at <= datetime.now(timezone.utc):
            if session:
                db.delete(session)
            raise HTTPException(401, "Phiên đăng nhập đã hết hạn")
    return True


def require_person_session(authorization: str | None) -> Person:
    token = auth_token(authorization)
    if not token:
        raise HTTPException(401, "Cần xác thực nhân viên")
    with get_db() as db:
        session = db.scalar(select(PersonSession).where(PersonSession.token_hash == token_hash(token)))
        if not session or session.expires_at <= datetime.now(timezone.utc):
            if session:
                db.delete(session)
            raise HTTPException(401, "Phiên xác thực đã hết hạn")
        person = db.get(Person, session.person_id)
        if not person:
            raise HTTPException(401, "Nhân viên không còn tồn tại")
        return person


def person_dict(person: Person) -> dict:
    return {
        "id": person.id,
        "name": person.name,
        "code": person.code,
        "phone": person.phone,
        "created_at": person.created_at,
    }


def type_dict(item: DocumentType) -> dict:
    return {"id": item.id, "name": item.name, "required": item.required, "created_at": item.created_at}


def document_status_rows(db, person_id: int):
    rows = db.execute(
        select(DocumentType, Document)
        .outerjoin(Document, (Document.document_type_id == DocumentType.id) & (Document.person_id == person_id))
        .order_by(DocumentType.id)
    ).all()
    return [{
        "id": dtype.id,
        "name": dtype.name,
        "required": dtype.required,
        "file_name": doc.file_name if doc else None,
        "uploaded_at": doc.uploaded_at if doc else None,
        "submitted": 1 if doc else 0,
    } for dtype, doc in rows]


@app.get("/api/health")
def health():
    try:
        with get_db() as db:
            db.execute(select(func.count(Person.id))).scalar_one()
        return {"status": "ok", "database": "postgresql", "version": "1.1.0"}
    except Exception as exc:
        raise HTTPException(503, "Database chưa sẵn sàng") from exc


@app.post("/api/admin/login")
def admin_login(payload: dict, request: Request):
    enforce_rate_limit(client_key(request, "admin-login"), 5, 300)
    username = str(payload.get("username", ""))
    password = str(payload.get("password", ""))
    if not secrets.compare_digest(username, ADMIN_USERNAME) or not verify_password(password, ADMIN_PASSWORD_HASH):
        raise HTTPException(401, "Sai tài khoản hoặc mật khẩu")
    token = secrets.token_urlsafe(32)
    with get_db() as db:
        db.add(AdminSession(token_hash=token_hash(token), expires_at=session_expiry()))
        audit(db, "admin.login", "admin", detail="Đăng nhập thành công")
    return {"token": token, "username": username, "expires_in_hours": int(os.getenv("ADMIN_SESSION_HOURS", "12"))}


@app.post("/api/admin/logout")
def admin_logout(authorization: str | None = Header(default=None)):
    token = auth_token(authorization)
    if token:
        with get_db() as db:
            session = db.scalar(select(AdminSession).where(AdminSession.token_hash == token_hash(token)))
            if session:
                db.delete(session)
                audit(db, "admin.logout", "admin", detail="Đăng xuất")
    return {"ok": True}


@app.get("/api/people")
def get_people(q: str = Query(default="", max_length=100), authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        stmt = select(Person)
        text_q = q.strip()
        if text_q:
            like = f"%{text_q}%"
            stmt = stmt.where((Person.name.ilike(like)) | (Person.code.ilike(like)) | (Person.phone.ilike(like)))
        people = db.scalars(stmt.order_by(Person.id.desc())).all()
        counts = dict(db.execute(select(Document.person_id, func.count(Document.id)).group_by(Document.person_id)).all())
        return [{**person_dict(p), "submitted_count": counts.get(p.id, 0)} for p in people]


@app.post("/api/people")
def create_person(payload: dict, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    name = str(payload.get("name", "")).strip()
    code = str(payload.get("code", "")).strip()
    phone = str(payload.get("phone", "")).strip() or None
    if not name or not code:
        raise HTTPException(400, "name và code là bắt buộc")
    with get_db() as db:
        if db.scalar(select(Person.id).where(Person.code == code)):
            raise HTTPException(409, "Mã nhân viên đã tồn tại")
        pin = new_person_pin()
        person = Person(name=name, code=code, phone=phone, access_pin_hash=hash_password(pin))
        db.add(person)
        try:
            db.flush()
        except IntegrityError as exc:
            raise HTTPException(409, "Mã nhân viên đã tồn tại") from exc
        audit(db, "person.create", "person", person.id, detail=f"code={person.code}")
        result = person_dict(person)
        result["pin"] = pin  # returned once; never stored in plaintext
        return result


@app.post("/api/people/{person_id}/reset-pin")
def reset_person_pin(person_id: int, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        person = db.get(Person, person_id)
        if not person:
            raise HTTPException(404, "Không tìm thấy nhân viên")
        pin = new_person_pin()
        person.access_pin_hash = hash_password(pin)
        db.query(PersonSession).filter(PersonSession.person_id == person_id).delete(synchronize_session=False)
        audit(db, "person.pin_reset", "person", person_id, detail=f"code={person.code}")
        return {"ok": True, "pin": pin}


@app.get("/api/document-types")
def get_document_types(authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        return [type_dict(t) for t in db.scalars(select(DocumentType).order_by(DocumentType.id.desc())).all()]


@app.post("/api/document-types")
def create_document_type(payload: dict, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    name = str(payload.get("name", "")).strip()
    required = bool(payload.get("required", True))
    if not name:
        raise HTTPException(400, "Tên loại giấy tờ là bắt buộc")
    with get_db() as db:
        if db.scalar(select(DocumentType.id).where(func.lower(DocumentType.name) == name.lower())):
            raise HTTPException(409, "Loại giấy tờ đã tồn tại")
        item = DocumentType(name=name, required=required)
        db.add(item)
        try:
            db.flush()
        except IntegrityError as exc:
            raise HTTPException(409, "Loại giấy tờ đã tồn tại") from exc
        audit(db, "document_type.create", "document_type", item.id, detail=f"name={item.name}")
        return type_dict(item)


@app.delete("/api/people/{person_id}")
def delete_person(person_id: int, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        person = db.get(Person, person_id)
        if not person:
            raise HTTPException(404, "Không tìm thấy nhân viên")
        for doc in db.scalars(select(Document).where(Document.person_id == person_id)).all():
            storage_delete(doc.file_url)
        db.query(PersonSession).filter(PersonSession.person_id == person_id).delete(synchronize_session=False)
        audit(db, "person.delete", "person", person_id, detail=f"code={person.code}")
        db.delete(person)
        return {"ok": True}


@app.delete("/api/document-types/{document_type_id}")
def delete_document_type(document_type_id: int, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        item = db.get(DocumentType, document_type_id)
        if not item:
            raise HTTPException(404, "Không tìm thấy loại giấy tờ")
        docs = db.scalars(select(Document).where(Document.document_type_id == document_type_id)).all()
        for doc in docs:
            storage_delete(doc.file_url)
        audit(db, "document_type.delete", "document_type", document_type_id, detail=f"name={item.name}")
        db.delete(item)
        return {"ok": True}


@app.get("/api/admin/overview")
def overview(authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        people_count = db.scalar(select(func.count(Person.id))) or 0
        type_count = db.scalar(select(func.count(DocumentType.id))) or 0
        required_count = db.scalar(select(func.count(DocumentType.id)).where(DocumentType.required.is_(True))) or 0
        submitted = db.scalar(
            select(func.count(Document.id)).join(DocumentType, Document.document_type_id == DocumentType.id).where(DocumentType.required.is_(True))
        ) or 0
        expected = people_count * required_count
        return {
            "people": people_count,
            "document_types": type_count,
            "missing": max(expected - submitted, 0),
            "submitted": submitted,
            "expected": expected,
            "completion_percent": round((submitted / expected) * 100, 1) if expected else 0,
        }


@app.get("/api/admin/documents")
def admin_documents(
    person_id: int | None = Query(default=None),
    document_type_id: int | None = Query(default=None),
    q: str = Query(default="", max_length=100),
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)
    with get_db() as db:
        stmt = select(Document, Person, DocumentType).join(Person, Document.person_id == Person.id).join(DocumentType, Document.document_type_id == DocumentType.id)
        if person_id is not None:
            stmt = stmt.where(Document.person_id == person_id)
        if document_type_id is not None:
            stmt = stmt.where(Document.document_type_id == document_type_id)
        text_q = q.strip()
        if text_q:
            like = f"%{text_q}%"
            stmt = stmt.where((Person.name.ilike(like)) | (Person.code.ilike(like)) | (DocumentType.name.ilike(like)) | (Document.file_name.ilike(like)))
        rows = db.execute(stmt.order_by(Person.name, DocumentType.name)).all()
        return [{
            "id": d.id, "person_id": p.id, "person_name": p.name, "person_code": p.code,
            "document_type_id": t.id, "document_type_name": t.name, "required": t.required,
            "file_name": d.file_name, "uploaded_at": d.uploaded_at,
        } for d, p, t in rows]


@app.get("/api/admin/person/{person_id}")
def admin_person(person_id: int, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        person = db.get(Person, person_id)
        if not person:
            raise HTTPException(404, "Không tìm thấy nhân viên")
        return {"person": person_dict(person), "documents": document_status_rows(db, person_id)}


# Public shared QR flow -----------------------------------------------------

@app.get("/api/portal/people")
def portal_people(q: str = Query(default="", max_length=100), request: Request = None):
    if request is not None:
        enforce_rate_limit(client_key(request, "portal-people"), 30, 60)
    with get_db() as db:
        stmt = select(Person.id, Person.name, Person.code).order_by(Person.name)
        text_q = q.strip()
        if text_q:
            like = f"%{text_q}%"
            stmt = stmt.where((Person.name.ilike(like)) | (Person.code.ilike(like)))
        rows = db.execute(stmt.limit(100)).all()
        return [{"id": r.id, "name": r.name, "code": r.code} for r in rows]


@app.post("/api/portal/login")
def portal_login(payload: dict, request: Request):
    enforce_rate_limit(client_key(request, "portal-login"), 8, 300)
    try:
        person_id = int(payload.get("person_id"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Nhân viên không hợp lệ")
    pin = str(payload.get("pin", "")).strip()
    if len(pin) != 6 or not pin.isdigit():
        raise HTTPException(400, "Mã xác thực phải gồm 6 chữ số")
    with get_db() as db:
        person = db.get(Person, person_id)
        if not person or not verify_password(pin, person.access_pin_hash):
            raise HTTPException(401, "Tên nhân viên hoặc mã xác thực không đúng")
        token = secrets.token_urlsafe(32)
        db.add(PersonSession(person_id=person.id, token_hash=token_hash(token), expires_at=person_session_expiry()))
        audit(db, "person.login", "person", person.id, detail=f"code={person.code}")
        return {"token": token, "person": person_dict(person), "expires_in_hours": PERSON_SESSION_HOURS}


@app.post("/api/portal/logout")
def portal_logout(authorization: str | None = Header(default=None)):
    token = auth_token(authorization)
    if token:
        with get_db() as db:
            session = db.scalar(select(PersonSession).where(PersonSession.token_hash == token_hash(token)))
            if session:
                db.delete(session)
    return {"ok": True}


@app.get("/api/portal/me")
def portal_me(authorization: str | None = Header(default=None)):
    person = require_person_session(authorization)
    with get_db() as db:
        return {"person": person_dict(person), "document_types": document_status_rows(db, person.id)}


@app.post("/api/portal/upload/{document_type_id}")
async def portal_upload(
    document_type_id: int,
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
    request: Request = None,
):
    person = require_person_session(authorization)
    if request is not None:
        enforce_rate_limit(client_key(request, "portal-upload"), 20, 300)
    with get_db() as db:
        dtype = db.get(DocumentType, document_type_id)
        if not dtype:
            raise HTTPException(404, "Không tìm thấy loại giấy tờ")
        original_name = validate_filename(file.filename or "")
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(400, "File vượt quá 10 MB")
        key = new_key(original_name, person.id, dtype.id)
        put_bytes(key, content, file.content_type)
        old = db.scalar(select(Document).where(Document.person_id == person.id, Document.document_type_id == dtype.id))
        old_key = old.file_url if old else None
        if old:
            old.file_name = original_name
            old.file_url = key
        else:
            db.add(Document(person_id=person.id, document_type_id=dtype.id, file_name=original_name, file_url=key))
        try:
            db.flush()
        except Exception:
            storage_delete(key)
            raise
        if old_key and old_key != key:
            storage_delete(old_key)
        audit(db, "document.upload", "document", old.id if old else None, detail=f"person_id={person.id};document_type_id={dtype.id}")
        return {"ok": True, "file_name": original_name}


# Legacy access-code routes intentionally removed in v1.1. Use the single shared QR route.

@app.get("/api/admin/document/{document_id}/download")
def download_document(document_id: int, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    with get_db() as db:
        document = db.get(Document, document_id)
        if not document:
            raise HTTPException(404, "Không tìm thấy tài liệu")
        audit(db, "document.download", "document", document_id, detail="Admin yêu cầu tải tài liệu")
        url = signed_url(document.file_url, expires_seconds=300)
        if url:
            return RedirectResponse(url, status_code=307)
        path = local_path(document.file_url)
        if not path.exists():
            raise HTTPException(404, "File không còn tồn tại")
        return FileResponse(path, filename=document.file_name)
