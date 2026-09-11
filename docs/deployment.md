# Hướng dẫn Deploy (đưa ứng dụng lên Internet)

## Kiến trúc đề xuất

- Frontend (giao diện): máy chủ web tĩnh.
- Backend (phần xử lý): FastAPI.
- Database (cơ sở dữ liệu): PostgreSQL.
- Storage (kho file): S3-compatible Object Storage.

## Biến môi trường

Không commit (ghi vào Git) file `.env` chứa mật khẩu, secret key hoặc access key.

Các biến quan trọng:
- DATABASE_URL
- ADMIN_PASSWORD
- SESSION_SECRET
- STORAGE_MODE
- S3_ENDPOINT
- S3_BUCKET
- S3_ACCESS_KEY
- S3_SECRET_KEY

## Checklist trước khi Deploy

- [ ] Đổi mật khẩu Admin.
- [ ] Dùng HTTPS.
- [ ] Tắt debug.
- [ ] Database có backup.
- [ ] Storage bật quyền riêng tư.
- [ ] Không cho Git track (theo dõi) `.env` và thư mục upload.
- [ ] Kiểm tra giới hạn file.
- [ ] Kiểm tra Rate Limiting (giới hạn tần suất).
- [ ] Kiểm tra Audit Log (nhật ký thao tác).
- [ ] Kiểm tra CORS (chính sách truy cập giữa các nguồn) chỉ cho domain Frontend.
