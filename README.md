# Quản lý hồ sơ

Ứng dụng web quản lý hồ sơ cho khoảng 100 người.

## Chức năng mục tiêu

- Admin (quản trị viên) quản lý danh sách người.
- Admin tự đăng ký các loại giấy tờ cần thu thập.
- Mỗi người có mã truy cập riêng, không cần tài khoản riêng.
- Người dùng tải tài liệu lên bằng điện thoại hoặc máy tính.
- Admin xem hồ sơ theo từng người hoặc theo từng loại giấy tờ.
- Theo dõi trạng thái đã nộp / chưa nộp.

## Kiến trúc dự kiến

- Frontend (giao diện): React + Vite
- Backend (phần xử lý): Python + FastAPI
- Database (cơ sở dữ liệu): PostgreSQL
- Storage (kho lưu file): dịch vụ lưu trữ file riêng
- Source code (mã nguồn): GitHub

## Cấu trúc dự án

```text
quan-ly-ho-so/
├── frontend/       # Giao diện web
├── backend/        # API và xử lý nghiệp vụ
├── database/       # Cấu trúc cơ sở dữ liệu
├── docs/           # Tài liệu thiết kế
├── README.md
└── .gitignore
```

## Trạng thái

Đang xây dựng phiên bản đầu tiên (MVP - Minimum Viable Product / phiên bản tối thiểu có thể sử dụng).
