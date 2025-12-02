# AWS Blog Translator - Web Application

Công cụ dịch bài viết AWS Blog sang tiếng Việt với định dạng Markdown, sử dụng Google Gemini AI.

## Tính năng

- ✅ Giao diện web đẹp và hiện đại
- ✅ Nhập URL bài viết AWS Blog
- ✅ Tự động dịch sang tiếng Việt
- ✅ Chuyển đổi sang định dạng Markdown
- ✅ Copy kết quả một cú click
- ✅ Tải xuống file Markdown
- ✅ Responsive design

## Cài đặt

1. Clone repository hoặc tải về thư mục dự án

2. Cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

3. Cấu hình API Key:
   - Lấy API Key từ [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Thêm API key vào biến môi trường:
     ```bash
     # Windows
     set GEMINI_API_KEY=your_api_key_here
     
     # Linux/Mac
     export GEMINI_API_KEY=your_api_key_here
     ```
   - Hoặc sửa trực tiếp trong file `app.py` dòng 12

## Chạy ứng dụng

```bash
python app.py
```

Sau đó mở trình duyệt và truy cập: `http://localhost:5000`

## Cấu trúc thư mục

```
blog-translate/
├── app.py                      # Flask web server
├── aws_blog_translator.py      # Script CLI gốc
├── requirements.txt            # Dependencies
├── templates/
│   └── index.html             # Giao diện web
├── static/
│   ├── css/
│   │   └── style.css          # Styling
│   └── js/
│       └── script.js          # Frontend logic
└── README.md                   # File này
```

## Sử dụng

### Cách 1: Sử dụng API Key mặc định
1. Mở trình duyệt và truy cập `http://localhost:5000`
2. Nhập URL bài viết AWS Blog (ví dụ: https://aws.amazon.com/blogs/...)
3. Nhấn nút "Dịch bài viết"
4. Đợi vài phút để AI xử lý
5. Copy hoặc tải xuống kết quả Markdown

### Cách 2: Sử dụng API Key riêng (Khuyến nghị)
1. Lấy API Key miễn phí tại [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Mở phần "Google Gemini API Key" (click để mở rộng)
3. Nhập API Key của bạn
4. Nhấn "Lưu API Key" (sẽ được lưu trong trình duyệt của bạn)
5. Từ lần sau, công cụ sẽ tự động dùng API Key của bạn
6. Dịch bài viết như bình thường

## Lưu ý

- API Key của Google Gemini có giới hạn requests miễn phí
- Quá trình dịch có thể mất 2-5 phút tùy độ dài bài viết
- Đảm bảo kết nối internet ổn định
- Bài viết quá dài (>200K tokens output) có thể bị cắt ngắn - trong trường hợp này sẽ có cảnh báo

## Xử lý lỗi thường gặp

### 1. Bài viết bị dịch thiếu/không đầy đủ
**Nguyên nhân**: Bài viết quá dài vượt quá giới hạn tokens (mặc định 200K tokens output)

**Giải pháp**:
- Kiểm tra console log để xem `finish_reason`
- Nếu `finish_reason = 3` (MAX_TOKENS), bài viết đã bị cắt
- Liên hệ admin để tăng giới hạn hoặc xử lý thủ công

### 2. Không tìm thấy nội dung bài viết
**Nguyên nhân**: URL không phải là bài viết AWS Blog hoặc cấu trúc HTML khác

**Giải pháp**:
- Đảm bảo URL là từ https://aws.amazon.com/blogs/...
- Kiểm tra bài viết có tồn tại không (không bị xóa/chuyển hướng)

### 3. Lỗi kết nối
**Nguyên nhân**: Mạng không ổn định hoặc API Key không hợp lệ

**Giải pháp**:
- Kiểm tra kết nối internet
- Xác nhận API Key còn hạn sử dụng
- Kiểm tra quota API tại [Google AI Studio](https://makersuite.google.com/)

## Công nghệ sử dụng

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **AI**: Google Gemini 2.5 Pro (200K tokens output)
- **Parser**: BeautifulSoup4
- **HTTP Client**: Requests

## License

MIT License

