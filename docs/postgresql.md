# PostgreSQL (cơ sở dữ liệu quan hệ)

Phiên bản 0.4 chuyển Backend (phần xử lý) sang SQLAlchemy (thư viện ORM - ánh xạ đối tượng với cơ sở dữ liệu) và PostgreSQL.

## Chạy Database (cơ sở dữ liệu) bằng Docker Compose

Tại thư mục `database/`:

```bash
docker compose up -d
```

## Biến môi trường

Tạo file `backend/.env` từ `.env.example` và đặt `DATABASE_URL` phù hợp.

Không commit (ghi vào Git) file `.env` vì file này có thể chứa mật khẩu.

## Kiểm tra

Backend có endpoint `GET /api/health`. Khi kết nối thành công, API trả về `database: postgresql`.
