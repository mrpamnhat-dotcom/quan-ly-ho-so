# v0.7 — Bảo mật Admin

## Đã triển khai

- Mật khẩu Admin được kiểm tra bằng PBKDF2-HMAC-SHA256, không lưu mật khẩu dạng rõ.
- Session (phiên đăng nhập) lưu trong PostgreSQL dưới dạng SHA-256 token hash (mã băm token).
- Session tự hết hạn theo `ADMIN_SESSION_HOURS` (mặc định 12 giờ).
- Logout (đăng xuất) thu hồi session trong Database.
- Security headers (header bảo mật) cơ bản: chống MIME sniffing, clickjacking và giới hạn Referrer.
- Token truy cập Admin không được lưu nguyên dạng trong Database.

## Production

Không dùng giá trị mặc định `admin/change-me`. Tạo `ADMIN_PASSWORD_HASH` bằng công cụ quản trị đáng tin cậy trước khi Deploy (đưa lên Internet).

Access Code (mã truy cập) của người dùng vẫn là một bearer secret (bí mật cấp quyền). Bước tiếp theo cần thêm rate limiting (giới hạn tần suất), audit log (nhật ký thao tác) và cơ chế thu hồi/đổi mã truy cập.
