# Storage (kho lưu trữ hồ sơ) v0.6

Backend hỗ trợ 2 chế độ:

- `local`: lưu file cục bộ, chỉ dùng cho phát triển/thử nghiệm.
- `s3`: lưu vào S3-compatible Object Storage (kho đối tượng tương thích S3).

Khi dùng `s3`, file không nằm trong Git repository. Database chỉ lưu `file_url` dưới dạng object key (khóa đối tượng).

Admin tải file qua **Signed URL (đường dẫn có chữ ký và thời hạn)**, mặc định 5 phút.

## Biến môi trường

Đặt `STORAGE_BACKEND=s3`, sau đó cấu hình `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` và nếu cần `S3_ENDPOINT_URL`.

Không commit (ghi vào kho mã nguồn) file `.env` hoặc khóa Storage.
