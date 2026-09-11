# Bảo mật v0.8

- Rate Limiting (giới hạn tần suất): đăng nhập Admin 5 lần/5 phút/IP; mở Access Code 30 lần/phút/IP; upload 20 lần/5 phút/IP.
- Audit Log (nhật ký thao tác): ghi các thao tác đăng nhập/đăng xuất, tạo/xóa người, tạo/xóa loại giấy tờ, upload và tải tài liệu.
- Không ghi password (mật khẩu), session token (mã phiên), access code (mã truy cập) hoặc nội dung file vào nhật ký.
- Bộ giới hạn hiện tại nằm trong RAM (bộ nhớ) của một máy chủ. Khi chạy nhiều instance (nhiều máy chủ), cần chuyển sang Redis-backed rate limiting (giới hạn qua Redis).
