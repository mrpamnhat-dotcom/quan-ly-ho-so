# Production Checklist (danh sách kiểm tra trước khi sử dụng thật)

- PostgreSQL backup (sao lưu) tự động.
- Object Storage private (kho file riêng tư).
- HTTPS bắt buộc.
- Secret được cấp qua environment (biến môi trường).
- Admin password mạnh và không dùng giá trị mẫu.
- CORS giới hạn đúng domain.
- Rate Limiting bật.
- Audit Log được lưu và có chính sách lưu trữ.
- Logging không chứa dữ liệu hồ sơ nhạy cảm.
- Kiểm thử khôi phục Database và Storage.
- Xóa toàn bộ dữ liệu thử nghiệm trước khi bàn giao.
