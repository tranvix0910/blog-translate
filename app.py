from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
import os
import traceback

app = Flask(__name__)
CORS(app)

# --- CẤU HÌNH ---
DEFAULT_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Cấu hình Model
generation_config = {
    "temperature": 0.1,
    "top_p": 0.95,
    "max_output_tokens": 200000,  # Tăng lên tối đa để xử lý bài dài
    "response_mime_type": "text/plain",
}

# --- SYSTEM PROMPT ---
system_instruction = """
Bạn là một Biên tập viên Kỹ thuật và Chuyên gia Dịch thuật cho AWS Blog. Nhiệm vụ của bạn là chuyển đổi mã nguồn HTML của một bài viết kỹ thuật sang định dạng Markdown tối ưu cho WordPress, đồng thời dịch nội dung sang tiếng Việt chuyên ngành.

Hãy tuân thủ nghiêm ngặt các nguyên tắc sau:

### 1. NGUYÊN TẮC CỐT LÕI: "CODE IS LAW"
Đây là quy tắc quan trọng nhất. Bạn phải xử lý các đoạn mã (code snippet) như sau:
- **BẢO TOÀN TUYỆT ĐỐI:** Không được dịch, không được sửa đổi, không được thêm bớt bất kỳ ký tự nào bên trong khối code. Giữ nguyên tên biến, comment tiếng Anh, namespace, string...
- **ĐỊNH DẠNG CHUẨN:**
  - Phát hiện ngôn ngữ lập trình dựa trên ngữ cảnh (ví dụ: C#, JSON, Bash, XML).
  - Sử dụng cú pháp Markdown fence code block:
    ```csharp
    // Code here
    ```
  - Nếu code nằm trong thẻ `<code>` đơn lẻ (inline code), hãy bọc nó bằng dấu backtick (`code`).
- **KHÔNG DỊCH NỘI DUNG TRONG CODE:** Kể cả dòng comment `// Opt in to preview features` cũng phải giữ nguyên tiếng Anh để đảm bảo tính toàn vẹn.

### 2. QUY TẮC ĐỊNH DẠNG HEADER (QUAN TRỌNG NHẤT)
Cấu trúc Heading phải được map lại để phù hợp với giao diện web đích:
- Thẻ `<h1>` chuyển thành `#` (Heading 1).
- Thẻ `<h2>` chuyển thành `###` (Heading 3).
- Thẻ `<h3>` chuyển thành `####` (Heading 4).
- Thẻ `<h4>` (và nhỏ hơn) chuyển thành đoạn văn bản in đậm (**Bold Text**), không dùng thẻ heading.
- Các thẻ `<h1>`, `<h2>`, `<h3>` không cần tô đậm (**Bold Text**) chỉ cần chuyển thành #, ###, ####.
- Header luôn ở đầu bài viết là "#" luôn ở đầu: Ví dụ:
+ "# Giới thiệu AWS Infrastructure as Code MCP Server: Hỗ trợ CDK và CloudFormation bằng AI" luôn ở đầu.
+ Tiếp theo sẽ là phần tác giả và bài viết.

### 3. QUY TẮC DỊCH THUẬT & TỪ VỰNG
- **Phong cách:** Dịch sang tiếng Việt trôi chảy, giọng văn chuyên nghiệp, kỹ thuật (Technical Writing). Tránh văn phong "word-by-word" máy móc.
- **Thuật ngữ KHÔNG DỊCH (Giữ nguyên tiếng Anh):**
  - Tên tất cả các dịch vụ AWS (Amazon Bedrock, AWS Lambda, Amazon Cognito, AWS Amplify, S3, EC2...).
  - Các khái niệm kỹ thuật đặc thù của AWS hoặc Cloud: Region, Availability Zone, Stack, User Pool, Identity Pool, Action Group, Agent, Action Schema, Foundation Model (FM), Backend, Frontend.
  - Các từ khóa trong giao diện (Console) nếu cần thiết để hướng dẫn: Output, Stacks, Delete, Region.
- **Xử lý tên riêng:** Giữ nguyên tên tác giả.

### 4. CẤU TRÚC BÀI VIẾT
- **Phần Metadata (Đầu bài):** Tạo một blockquote (>) chứa các thông tin: Tác giả, Ngày phát hành, Chuyên mục (giữ nguyên link của chuyên mục).
  - *Ví dụ:*
    > **Tác giả:** [Tên]
    > **Ngày phát hành:** [Ngày]
    > **Chuyên mục:** [Link chuyên mục]
- **Phần Nội dung:** Dịch chi tiết, giữ nguyên cấu trúc đoạn văn.
- **Phần Hình ảnh & Link:**
  - **Link:** Giữ nguyên tất cả thẻ `<a>` dưới dạng `[Text](URL)`.
  - **Hình ảnh:** Chuyển đổi thẻ `<img>` thành cú pháp Markdown `![Alt Text](URL_gốc_của_ảnh)`. 
    * Giữ nguyên URL gốc của ảnh từ bài viết.
    * Nếu có caption hoặc mô tả ảnh (thường ở dưới ảnh), đặt nó trên một dòng riêng dưới ảnh với định dạng in nghiêng.
    * Ví dụ:
      ```
      ![Mô tả ảnh](https://example.com/image.png)
      *Hình 1: Mô tả chi tiết về ảnh*
      ```
- **Phần Code:** Nếu có code snippet, hãy đặt trong ` ``` ` (code block).
- **Phần Tác giả (Cuối bài):** Giữ nguyên ảnh và bio của tác giả (dịch phần mô tả bio sang tiếng Việt).

### 5. QUY TẮC VỀ TÁC GIẢ
- Giữ nguyên tên tác giả.
- Giữ nguyên ảnh và bio của tác giả.
- Dịch phần mô tả bio sang tiếng Việt.
- Nếu không có tác giả, thì không cần dịch phần tác giả.
- Bên trên mỗi phần tác giả hãy thêm cho tôi header gồm "### Về tác giả" ( Trong trường hợp không có Header thì cần thêm Header này, Nếu đã có Header thì không cần thêm Header này)
- Chỉ có duy nhất 1 Header là "### Về tác giả". Không có vụ mỗi tác giả một Header.


### 6. ĐẦU RA (OUTPUT)
- Chỉ trả về kết quả là **Mã Markdown thuần túy**.
- Không thêm các câu giao tiếp như "Dưới đây là bài dịch...", "Tôi đã làm xong...".
- Bắt đầu ngay bằng tiêu đề bài viết (# Title).
"""

def create_model(api_key, model_name="gemini-2.5-pro"):
    """Tạo model với API key và tên model được chỉ định"""
    genai.configure(api_key=api_key)
    
    return genai.GenerativeModel(
        model_name=model_name, 
        generation_config=generation_config,
        system_instruction=system_instruction,
    )

def get_blog_html(url):
    """Hàm lấy HTML thô của thẻ article từ URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')
        article = soup.find('article', class_='blog-post')

        if article:
            # Loại bỏ phần Share dialog và Comments không cần thiết
            for div in article.find_all("div", class_="blog-share-dialog"):
                div.decompose()
            for aside in article.find_all("aside", id="Comments"):
                aside.decompose()
            
            return str(article)
        else:
            return None
    except Exception as e:
        raise Exception(f"Lỗi khi tải trang web: {str(e)}")

def estimate_tokens(text):
    """Ước tính số tokens (đơn giản: ~4 ký tự = 1 token)"""
    return len(text) // 4

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/translate', methods=['POST'])
def translate_blog():
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        user_api_key = data.get('api_key', '').strip()
        model_name = data.get('model', '').strip() or 'gemini-2.5-pro'
        
        # Validate required fields
        if not user_api_key:
            return jsonify({'error': '⚠️ API Key là bắt buộc. Vui lòng cấu hình API Key trước khi sử dụng.'}), 400
        
        if not url:
            return jsonify({'error': 'URL không được để trống'}), 400
        
        # Kiểm tra URL hợp lệ
        if not url.startswith('http'):
            return jsonify({'error': 'URL không hợp lệ'}), 400
        
        # Log API key and model usage
        print(f"[INFO] Sử dụng API Key của người dùng (***{user_api_key[-4:]})")
        print(f"[INFO] Model: {model_name}")
        
        # Lấy HTML
        print(f"[INFO] Đang tải nội dung từ URL: {url}")
        html_content = get_blog_html(url)
        
        if not html_content:
            return jsonify({'error': 'Không tìm thấy nội dung bài viết (thẻ article.blog-post)'}), 404
        
        # Ước tính tokens
        estimated_tokens = estimate_tokens(html_content)
        print(f"[INFO] Kích thước HTML: {len(html_content)} ký tự (~{estimated_tokens} tokens)")
        
        # Tạo model với API key và model name
        model = create_model(user_api_key, model_name)
        
        # Gửi cho Gemini xử lý (system instruction đã được cấu hình trong model)
        # Không cần gửi lại system_instruction ở đây vì đã có trong model
        full_prompt = f"Hãy xử lý bài blog này giúp tôi:\n\n{html_content}"
        
        print(f"[INFO] Đang gửi request đến {model_name}...")
        chat = model.start_chat(history=[])
        response = chat.send_message(full_prompt)
        
        # Kiểm tra xem có bị cắt cụt không
        finish_reason = response.candidates[0].finish_reason if response.candidates else None
        print(f"[INFO] Finish reason: {finish_reason}")
        print(f"[INFO] Kết quả dịch: {len(response.text)} ký tự")
        
        is_truncated = finish_reason == 3  # 3 = MAX_TOKENS
        
        # Map finish_reason to text
        finish_reason_map = {
            0: "FINISH_REASON_UNSPECIFIED",
            1: "STOP (Hoàn thành bình thường)",
            2: "SAFETY (Bị chặn do nội dung)",
            3: "MAX_TOKENS (Vượt quá giới hạn tokens)",
            4: "RECITATION (Vi phạm bản quyền)",
            5: "OTHER"
        }
        
        result = {
            'success': True,
            'markdown': response.text,
            'metadata': {
                'html_size': len(html_content),
                'estimated_tokens': estimated_tokens,
                'output_size': len(response.text),
                'finish_reason': finish_reason,
                'finish_reason_text': finish_reason_map.get(finish_reason, 'Unknown')
            }
        }
        
        # Thêm cảnh báo nếu bị cắt cụt
        if is_truncated:
            result['warning'] = 'Bài viết có thể bị cắt ngắn do quá dài. Nếu thiếu nội dung, vui lòng liên hệ admin.'
            print(f"[WARNING] Phản hồi bị cắt cụt do vượt quá giới hạn tokens!")
        
        return jsonify(result)
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[ERROR] {error_trace}")
        return jsonify({
            'error': f'Đã xảy ra lỗi: {str(e)}'
        }), 500

@app.route('/summarize', methods=['POST'])
def summarize_blog():
    try:
        data = request.get_json()
        markdown_content = data.get('markdown', '').strip()
        original_link = data.get('original_link', '').strip()
        translated_link = data.get('translated_link', '').strip()
        user_api_key = data.get('api_key', '').strip()
        model_name = data.get('model', '').strip() or 'gemini-2.5-pro'
        
        # Validate required fields
        if not user_api_key:
            return jsonify({'error': '⚠️ API Key là bắt buộc'}), 400
        
        if not markdown_content:
            return jsonify({'error': 'Nội dung Markdown không được để trống'}), 400
            
        if not original_link:
            return jsonify({'error': 'Link bài viết gốc không được để trống'}), 400
            
        if not translated_link:
            return jsonify({'error': 'Link bản dịch không được để trống'}), 400
        
        print(f"[INFO] Đang tạo tóm tắt Facebook...")
        print(f"[INFO] Sử dụng API Key: ***{user_api_key[-4:]}")
        print(f"[INFO] Model: {model_name}")
        print(f"[INFO] Độ dài markdown: {len(markdown_content)} ký tự")
        
        # System instruction cho summarize
        summarize_instruction = """
Hãy đóng vai một người viết blog AWS có 2 năm kinh nghiệm, chuyên tóm tắt các bài viết dài thành bài đăng Facebook ngắn, chuyên nghiệp và dễ đọc.

Nhiệm vụ:
Tóm tắt nội dung blog dưới đây thành một bài post Facebook hoàn chỉnh, đúng chuẩn cộng đồng AWS tại Việt Nam, không sử dụng icon hoặc emoji.

**QUAN TRỌNG**: Output chỉ sử dụng **plain text** (text thuần), KHÔNG sử dụng markdown, HTML, hoặc bất kỳ format đặc biệt nào. Khi copy-paste vào Facebook sẽ giữ nguyên format text thông thường.

Yêu cầu về cấu trúc:

1. Tiêu đề:
   - Ngắn, dạng headline, IN HOA
   - Không quá một dòng
   - Phản ánh đúng chủ đề blog

2. Phần mở đầu:
   - Giới thiệu ngắn gọn nội dung chính của blog
   - Giữ giọng văn chuyên nghiệp, dễ đọc

3. Tóm tắt key points:
   - Tóm tắt các nội dung quan trọng nhất từ bài blog gốc
   - Sử dụng bullet points (• hoặc -)
   - Mỗi key point ngắn gọn, dễ hiểu
   - Không bỏ sót ý chính
   - Diễn đạt lại, không copy nguyên văn
   - Giải thích rõ ràng theo tone của AWS Blog

4. Hình minh họa:
   - Chèn placeholder dạng: [Ảnh minh họa: mô tả ngắn nội dung hình]

5. Kết luận / CTA:
   - Tóm tắt giá trị chính
   - Kêu gọi mọi người chia sẻ kinh nghiệm
   - Giữ tính chuyên nghiệp

Yêu cầu về nội dung & tone:
- Tone AWS Blog: rõ ràng, súc tích, mang tính hướng dẫn
- Đúng AWS Naming Convention:
  * Luôn viết đầy đủ tên dịch vụ: AWS Lambda, Amazon S3, Amazon EC2
  * Không viết tắt tùy tiện
  * Không viết sai chính tả các dịch vụ AWS
- Không nhồi chữ
- Không thêm icon hoặc emoji
- Không thêm thông tin không có trong blog
- Tóm tắt bao quát toàn bộ nội dung blog, tránh sót phần quan trọng

Metadata cần thêm cuối bài:
---
Link bài viết gốc: {original_link}
Bản dịch bởi AWS Study Group: {translated_link}
"""
        
        # Tạo model với instruction cho summarize
        model = create_model(user_api_key, model_name)
        
        # Tạo prompt
        full_prompt = f"""Nội dung blog:

{markdown_content}

---
Link bài viết gốc: {original_link}
Bản dịch bởi AWS Study Group: {translated_link}

Hãy tạo tóm tắt Facebook theo đúng format yêu cầu."""
        
        print(f"[INFO] Đang gửi request đến {model_name}...")
        
        # Cấu hình riêng cho summarize
        summarize_config = {
            "temperature": 0.3,
            "top_p": 0.95,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain",
        }
        
        # Tạo model với config riêng
        genai.configure(api_key=user_api_key)
        summarize_model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=summarize_config,
            system_instruction=summarize_instruction,
        )
        
        chat = summarize_model.start_chat(history=[])
        response = chat.send_message(full_prompt)
        
        # Kiểm tra finish reason
        finish_reason = response.candidates[0].finish_reason if response.candidates else None
        print(f"[INFO] Finish reason: {finish_reason}")
        print(f"[INFO] Kết quả tóm tắt: {len(response.text)} ký tự")
        
        is_truncated = finish_reason == 3
        
        finish_reason_map = {
            0: "FINISH_REASON_UNSPECIFIED",
            1: "STOP (Hoàn thành bình thường)",
            2: "SAFETY (Bị chặn do nội dung)",
            3: "MAX_TOKENS (Vượt quá giới hạn tokens)",
            4: "RECITATION (Vi phạm bản quyền)",
            5: "OTHER"
        }
        
        result = {
            'success': True,
            'summary': response.text,
            'metadata': {
                'input_size': len(markdown_content),
                'output_size': len(response.text),
                'finish_reason': finish_reason,
                'finish_reason_text': finish_reason_map.get(finish_reason, 'Unknown')
            }
        }
        
        if is_truncated:
            result['warning'] = 'Tóm tắt có thể bị cắt ngắn. Vui lòng kiểm tra lại.'
            print(f"[WARNING] Phản hồi bị cắt cụt!")
        
        return jsonify(result)
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[ERROR] {error_trace}")
        return jsonify({
            'error': f'Đã xảy ra lỗi: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

