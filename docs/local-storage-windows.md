# Lưu hồ sơ vào ổ D trên Windows

## Cấu hình
Trong `backend/.env`:

`STORAGE_BACKEND=local`

`STORAGE_LOCAL_DIR=D:\Quản lý hồ sơ`

Backend sẽ tự tạo thư mục nếu chưa tồn tại. File không được lưu trong GitHub.

## Nhập danh sách nhân viên
Từ thư mục gốc dự án:

`python -m database.import_people`

Danh sách nguồn là `database/import/people.csv`, được tạo từ file Excel đã cung cấp.
