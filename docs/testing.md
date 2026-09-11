# Testing (kiểm thử)

## Smoke Test (kiểm tra nhanh)

1. Admin login (đăng nhập).
2. Tạo một người thử nghiệm.
3. Tạo một loại giấy tờ.
4. Mở Access Code (mã truy cập) của người thử nghiệm.
5. Upload (tải lên) một file PDF/JPG thử nghiệm.
6. Kiểm tra bản ghi tài liệu trong Database.
7. Kiểm tra file trong Storage.
8. Admin xem/tải file bằng Signed URL (đường dẫn có thời hạn).
9. Logout (đăng xuất).
10. Thử lại API quản trị khi không có session và xác nhận bị từ chối.

## Security Test (kiểm thử bảo mật)

- Không gửi mật khẩu hoặc session token vào Audit Log.
- File quá 10 MB phải bị từ chối.
- Phần mở rộng không hỗ trợ phải bị từ chối.
- Access Code không được hiển thị trong log.
- Session hết hạn phải yêu cầu đăng nhập lại.
- Signed URL hết hạn không còn tải được.
