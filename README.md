# Quản lý hồ sơ

Ứng dụng web quản lý hồ sơ cho khoảng 100 người.

## Công nghệ

- Frontend (giao diện web): React + Vite
- Backend (phần xử lý): Python + FastAPI + SQLAlchemy
- Database (cơ sở dữ liệu): PostgreSQL
- Storage (kho file): sẽ chuyển sang dịch vụ lưu trữ riêng ở bước bảo mật
- Source code (mã nguồn): GitHub

## Chạy nhanh PostgreSQL

```bash
cd database
docker compose up -d
```

## Chạy Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tạo `backend/.env` từ `.env.example` và đặt mật khẩu thật trước khi sử dụng.

## Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Mặc định Frontend (giao diện) gọi Backend tại `http://localhost:8000`.

## Lưu ý bảo mật

- Không commit (ghi vào Git) file `.env`.
- Không lưu hồ sơ cá nhân vào repository GitHub.
- Bản 0.4 chỉ dùng local storage (kho file cục bộ) cho môi trường phát triển. Production (môi trường thật) sẽ chuyển sang Storage riêng.


## v0.8

Đã bổ sung bảo mật Admin với PBKDF2 password hash (mã băm mật khẩu), PostgreSQL session (phiên đăng nhập) có thời hạn và security headers (header bảo mật).


## v0.8

Đã bổ sung Rate Limiting (giới hạn tần suất) và Audit Log (nhật ký thao tác) cho các luồng quan trọng.


## Phiên bản hiện tại

**v1.0 — Production Ready Baseline (nền tảng sẵn sàng triển khai)**

Đã có PostgreSQL, SQLAlchemy, Storage abstraction (lớp trừu tượng lưu file), Signed URL, Admin session, Rate Limiting và Audit Log. Trước khi dùng dữ liệu thật cần hoàn tất cấu hình môi trường, HTTPS, backup và kiểm thử triển khai theo `docs/production-checklist.md`.
