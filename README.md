# Quản lý hồ sơ — v1.2

Ứng dụng web quản lý hồ sơ cho khoảng 100 nhân viên.

## Mô hình truy cập v1.1

- Chỉ có **1 link / 1 QR Code dùng chung** cho tất cả nhân viên.
- Nhân viên mở QR chung, gõ/tìm tên của mình trong danh sách và nhập **mã xác thực 6 số**.
- Mã xác thực do hệ thống tự sinh khi Admin (quản trị viên) tạo nhân viên.
- Admin có thể **tạo lại mã xác thực**; mã cũ hết hiệu lực và các phiên của nhân viên đó bị thu hồi.
- Trình duyệt lưu danh sách nhân viên đã dùng gần đây để lần sau chọn tên nhanh hơn. Đây chỉ là tiện ích trên thiết bị, không phải thông tin xác thực.
- Nhân viên không có tài khoản riêng và không cần link riêng.
- Admin truy cập khu vực riêng tại `/admin`.

## Luồng sử dụng

```text
QR dùng chung
    ↓
Trang nộp hồ sơ
    ↓
Chọn / tìm tên nhân viên
    ↓
Nhập mã xác thực 6 số
    ↓
Phiên xác thực tạm thời
    ↓
Xem danh sách giấy tờ của chính mình
    ↓
Upload (tải lên) / nộp lại tài liệu
```

## Chức năng Admin

- Đăng nhập Admin.
- Tạo / xóa nhân viên.
- Hệ thống tự sinh mã xác thực 6 số.
- Tạo lại mã xác thực khi cần.
- Tạo / xóa loại giấy tờ.
- Xem tổng quan tiến độ.
- Tìm kiếm và lọc tài liệu.
- Tải file hồ sơ.
- Hiển thị QR dùng chung để in hoặc chia sẻ.

## Bảo mật

- Không lưu mã xác thực dạng rõ trong Database (cơ sở dữ liệu).
- Sau khi tạo hoặc tạo lại mã, mã chỉ được hiển thị một lần trong màn hình Admin.
- Phiên nhân viên có thời hạn và được lưu dưới dạng hash (băm).
- Tạo lại mã sẽ thu hồi các phiên cũ của nhân viên.
- Có Rate limit (giới hạn tần suất) cho các API công khai.
- Không lưu mật khẩu, mã xác thực, token (mã phiên) hoặc nội dung file vào Audit log (nhật ký kiểm toán).
- File hồ sơ không lưu trong Git repository (kho mã nguồn Git).
- Production (môi trường thật) nên dùng Storage (kho lưu file) riêng và HTTPS.

## Công nghệ

- Frontend (giao diện): React + Vite
- Backend (phần xử lý): Python + FastAPI
- Database (cơ sở dữ liệu): PostgreSQL
- Storage (kho lưu file): local cho phát triển, S3-compatible cho production
- Source code (mã nguồn): GitHub

## Cấu trúc

```text
quan-ly-ho-so/
├── frontend/
├── backend/
├── database/
├── docs/
├── README.md
└── .gitignore
```

## Chạy local (máy tính cá nhân)

1. Cài Python, Node.js và Docker Desktop.
2. Chạy PostgreSQL bằng Docker Compose (cấu hình nhiều container):

```bash
cd database
docker compose up -d
```

3. Tạo môi trường Python và cài thư viện Backend.
4. Chạy FastAPI.
5. Chạy Frontend bằng Vite.
6. Mở `http://localhost:5173/` để thử luồng nhân viên hoặc `http://localhost:5173/admin` để quản trị.

### Demo

- Admin: `admin / change-me` nếu chưa cấu hình `ADMIN_PASSWORD_HASH`.
- Nhân viên demo: `Nguyễn Văn A / 123456` nếu chưa đổi `DEMO_PERSON_PIN`.

Không dùng thông tin demo này khi Deploy (đưa hệ thống lên Internet).


## Nhận diện Khoa Ngoại Ung Bướu & Chăm sóc giảm nhẹ
- Logo chính thức nằm tại `frontend/public/logo.jpg`.
- Tên hiển thị: **KHOA NGOẠI UNG BƯỚU & CHĂM SÓC GIẢM NHẸ**.
- Đơn vị: **BỆNH VIỆN HỮU NGHỊ VIỆT TIỆP**.
- Slogan: **Đức trí tận tâm – Nâng tầm chất lượng**.

## Lưu hồ sơ tại ổ D
Mặc định Local Storage (lưu trữ cục bộ) là `D:\Quản lý hồ sơ`. Có thể đổi bằng `STORAGE_LOCAL_DIR` trong `backend/.env`.

## Nhập danh sách nhân viên
Danh sách từ Excel được chuẩn hóa thành `database/import/people.csv`. Chạy `python -m database.import_people` từ môi trường Python của backend để đồng bộ. Mã xác thực 6 số chỉ được in một lần cho nhân viên mới. Dữ liệu nhân viên thực tế nên nằm ngoài GitHub và được đặt trong thư mục `database/import/` (đã được bỏ qua bởi Git).
