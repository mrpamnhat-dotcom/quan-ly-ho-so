# Kiến trúc ứng dụng

## Mục tiêu

Quản lý khoảng 100 người và các tài liệu mà Admin yêu cầu.

## Luồng chính

1. Admin tạo người.
2. Admin tạo loại giấy tờ.
3. Hệ thống tạo mã truy cập riêng cho từng người.
4. Người dùng mở đường dẫn và tải tài liệu.
5. Hệ thống lưu thông tin tài liệu vào Database và file vào Storage.
6. Admin xem hồ sơ theo người hoặc theo loại giấy tờ.

## Nguyên tắc bảo mật

- Người dùng chỉ được truy cập hồ sơ gắn với mã truy cập của mình.
- Không lưu file tải lên trực tiếp trong Git repository.
- Không đưa mật khẩu, khóa API hoặc thông tin bí mật vào Source code.
- File Storage phải kiểm soát quyền truy cập.

## Các thực thể dữ liệu

- People (người)
- Document Types (loại giấy tờ)
- Documents (tài liệu)
- Admins (quản trị viên)
