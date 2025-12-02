// DOM Elements - Translate Tab
const blogUrlInput = document.getElementById('blogUrl');
const translateBtn = document.getElementById('translateBtn');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');
const errorText = document.getElementById('errorText');
const resultSection = document.getElementById('resultSection');
const markdownContent = document.getElementById('markdownContent');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const logSection = document.getElementById('logSection');
const logContent = document.getElementById('logContent');
const logStatus = document.getElementById('logStatus');

// DOM Elements - Summarize Tab
const markdownInput = document.getElementById('markdownInput');
const originalLink = document.getElementById('originalLink');
const translatedLink = document.getElementById('translatedLink');
const summarizeBtn = document.getElementById('summarizeBtn');
const loadingSectionSummarize = document.getElementById('loadingSectionSummarize');
const errorSectionSummarize = document.getElementById('errorSectionSummarize');
const errorTextSummarize = document.getElementById('errorTextSummarize');
const resultSectionSummarize = document.getElementById('resultSectionSummarize');
const summaryContent = document.getElementById('summaryContent');
const copyBtnSummarize = document.getElementById('copyBtnSummarize');
const downloadBtnSummarize = document.getElementById('downloadBtnSummarize');
const logSectionSummarize = document.getElementById('logSectionSummarize');
const logContentSummarize = document.getElementById('logContentSummarize');
const logStatusSummarize = document.getElementById('logStatusSummarize');

// Tab Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const translateTab = document.getElementById('translateTab');
const summarizeTab = document.getElementById('summarizeTab');

// API Key Elements
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
const saveApiKey = document.getElementById('saveApiKey');
const clearApiKey = document.getElementById('clearApiKey');
const openConfigModal = document.getElementById('openConfigModal');
const closeConfigModal = document.getElementById('closeConfigModal');
const configModal = document.getElementById('configModal');
const apiConfigStatus = document.getElementById('apiConfigStatus');
const configButtonText = document.getElementById('configButtonText');

// State
let currentMarkdown = '';
let currentSummary = '';
const API_KEY_STORAGE_KEY = 'gemini_api_key';
const DEFAULT_MODEL = 'gemini-2.5-pro';

// Log Functions
function showLogSection() {
    logSection.classList.remove('hidden');
    updateLogStatus('processing');
}

function hideLogSection() {
    logSection.classList.add('hidden');
}

function updateLogStatus(status) {
    logStatus.className = 'log-status-badge';
    if (status === 'processing') {
        logStatus.textContent = 'Processing...';
        logStatus.classList.add('processing');
    } else if (status === 'completed') {
        logStatus.textContent = 'Completed';
        logStatus.classList.add('completed');
    } else if (status === 'error') {
        logStatus.textContent = 'Error';
        logStatus.classList.add('error');
    }
}

function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString('vi-VN');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<span class="log-time">[${time}]</span>${message}`;
    logContent.appendChild(logEntry);
    logContent.scrollTop = logContent.scrollHeight;
}

function clearLogs() {
    logContent.innerHTML = '';
}

// Event Listeners - Translate Tab
translateBtn.addEventListener('click', handleTranslate);
blogUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleTranslate();
    }
});
copyBtn.addEventListener('click', handleCopy);
downloadBtn.addEventListener('click', handleDownload);

// Event Listeners - Summarize Tab
summarizeBtn.addEventListener('click', handleSummarize);
copyBtnSummarize.addEventListener('click', handleCopySummary);
downloadBtnSummarize.addEventListener('click', handleDownloadSummary);

// Tab Navigation
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// API Key & Modal Event Listeners
openConfigModal.addEventListener('click', openModal);
closeConfigModal.addEventListener('click', closeModal);
toggleApiKeyVisibility.addEventListener('click', togglePasswordVisibility);
saveApiKey.addEventListener('click', handleSaveApiKey);
clearApiKey.addEventListener('click', handleClearApiKey);

// Close modal when clicking overlay
configModal.addEventListener('click', (e) => {
    if (e.target === configModal || e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

// Close modal with ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !configModal.classList.contains('hidden')) {
        closeModal();
    }
});

// Main translate function
async function handleTranslate() {
    const url = blogUrlInput.value.trim();
    
    // Check if API Key is configured
    const userApiKey = getUserApiKey();
    
    if (!userApiKey) {
        showError('⚠️ Vui lòng cấu hình API Key trước khi dịch bài viết!');
        openModal();
        apiKeyInput.focus();
        return;
    }
    
    // Validate URL
    if (!url) {
        showError('Vui lòng nhập URL bài viết');
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('URL không hợp lệ. Vui lòng nhập URL đầy đủ (bắt đầu bằng http:// hoặc https://)');
        return;
    }
    
    // Show loading state and log section
    showLoading();
    showLogSection();
    clearLogs();
    
    // Add initial logs
    addLog('🚀 Bắt đầu quá trình dịch bài viết...', 'info');
    addLog(`📝 URL: ${url}`, 'info');
    addLog('⏳ Đang tải nội dung từ AWS Blog...', 'info');
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                url: url,
                api_key: userApiKey,
                model: DEFAULT_MODEL
            }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            // Add success logs
            addLog('✅ Tải nội dung HTML thành công', 'success');
            addLog('🤖 Đang gửi request đến Gemini 2.5 Pro...', 'info');
            addLog('📊 Đang xử lý và dịch nội dung...', 'info');
            
            // Show metadata if available
            if (data.metadata) {
                addLog(`📏 Kích thước HTML: ${data.metadata.html_size} ký tự (~${data.metadata.estimated_tokens} tokens)`, 'info');
                addLog(`📄 Kết quả dịch: ${data.metadata.output_size} ký tự`, 'info');
                addLog(`⚙️ Finish reason: ${data.metadata.finish_reason_text || data.metadata.finish_reason}`, 'info');
            }
            
            addLog(`✅ Hoàn thành! Thời gian xử lý: ${duration}s`, 'success');
            updateLogStatus('completed');
            
            currentMarkdown = data.markdown;
            showResult(data.markdown);
            
            // Hiển thị cảnh báo nếu bài viết bị cắt ngắn
            if (data.warning) {
                addLog(`⚠️ ${data.warning}`, 'warning');
                showWarning(data.warning);
            }
        } else {
            addLog(`❌ Lỗi: ${data.error}`, 'error');
            updateLogStatus('error');
            showError(data.error || 'Đã xảy ra lỗi không xác định');
        }
    } catch (error) {
        console.error('Error:', error);
        addLog(`❌ Lỗi kết nối: ${error.message}`, 'error');
        updateLogStatus('error');
        showError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.');
    }
}

// Copy to clipboard
async function handleCopy() {
    try {
        await navigator.clipboard.writeText(currentMarkdown);
        
        // Update button state
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Đã copy!';
        copyBtn.classList.add('copied');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.remove('copied');
        }, 2000);
    } catch (error) {
        console.error('Copy failed:', error);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = currentMarkdown;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Đã copy!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Markdown';
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            alert('Không thể copy. Vui lòng copy thủ công.');
        }
        document.body.removeChild(textArea);
    }
}

// Download markdown file
function handleDownload() {
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename from date
    const date = new Date();
    const filename = `aws-blog-translated-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.md`;
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// UI State Management
function showLoading() {
    hideAllSections();
    loadingSection.classList.remove('hidden');
    translateBtn.disabled = true;
}

function showError(message) {
    hideAllSections();
    errorText.textContent = message;
    errorSection.classList.remove('hidden');
    translateBtn.disabled = false;
}

function showResult(markdown) {
    hideAllSections();
    markdownContent.textContent = markdown;
    resultSection.classList.remove('hidden');
    translateBtn.disabled = false;
}

function showWarning(message) {
    // Tạo một thông báo cảnh báo nhẹ dưới result header
    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning-banner';
    warningDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    warningDiv.style.cssText = 'background: #fff3cd; color: #856404; padding: 12px 20px; border-left: 4px solid #ffc107; margin-bottom: 15px; border-radius: 4px; display: flex; align-items: center; gap: 10px;';
    
    const resultBody = resultSection.querySelector('.result-card-body');
    resultBody.insertBefore(warningDiv, resultBody.firstChild);
}

function hideAllSections() {
    loadingSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    resultSection.classList.add('hidden');
}

function resetForm() {
    hideAllSections();
    hideLogSection();
    blogUrlInput.value = '';
    blogUrlInput.focus();
    currentMarkdown = '';
    translateBtn.disabled = false;
}

// Utility Functions
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Modal Functions
function openModal() {
    configModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeModal() {
    configModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scroll
}

// API Key Functions
function togglePasswordVisibility() {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleApiKeyVisibility.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        apiKeyInput.type = 'password';
        toggleApiKeyVisibility.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function handleSaveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('⚠️ Vui lòng nhập API Key');
        apiKeyInput.focus();
        return;
    }
    
    // Validate API Key format (basic check)
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        alert('❌ API Key không hợp lệ.\n\nAPI Key của Google AI thường:\n• Bắt đầu bằng "AIza"\n• Dài hơn 30 ký tự\n\nVui lòng kiểm tra lại!');
        apiKeyInput.focus();
        return;
    }
    
    // Save API Key to localStorage
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    
    // Show success message
    const originalHTML = saveApiKey.innerHTML;
    saveApiKey.innerHTML = '<i class="fas fa-check"></i> Đã lưu!';
    saveApiKey.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    
    setTimeout(() => {
        saveApiKey.innerHTML = originalHTML;
        saveApiKey.style.background = '';
        closeModal(); // Close modal after success
    }, 1500);
    
    // Update status badge
    updateApiKeyStatus();
}

function handleClearApiKey() {
    if (!confirm('🗑️ Bạn có chắc muốn xóa API Key đã lưu?\n\nSau khi xóa, bạn cần nhập lại API Key để sử dụng.')) {
        return;
    }
    
    // Clear from localStorage
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    
    // Reset UI
    apiKeyInput.value = '';
    
    // Show success message
    const originalHTML = clearApiKey.innerHTML;
    clearApiKey.innerHTML = '<i class="fas fa-check"></i> Đã xóa!';
    
    setTimeout(() => {
        clearApiKey.innerHTML = originalHTML;
    }, 2000);
    
    // Update status badge
    updateApiKeyStatus();
}

function loadSavedConfig() {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
    
    updateApiKeyStatus();
}

function updateApiKeyStatus() {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    
    if (savedApiKey) {
        apiConfigStatus.className = 'config-status configured';
        apiConfigStatus.innerHTML = '<i class="fas fa-check-circle"></i> Đã cấu hình';
        configButtonText.textContent = 'Chỉnh sửa cấu hình';
    } else {
        apiConfigStatus.className = 'config-status not-configured';
        apiConfigStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Chưa cấu hình';
        configButtonText.textContent = 'Cấu hình API Key';
    }
}

function getUserApiKey() {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || null;
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update tab content
    if (tabName === 'translate') {
        translateTab.classList.add('active');
        summarizeTab.classList.remove('active');
    } else if (tabName === 'summarize') {
        translateTab.classList.remove('active');
        summarizeTab.classList.add('active');
    }
}

// Summarize Tab Functions
async function handleSummarize() {
    const markdown = markdownInput.value.trim();
    const origLink = originalLink.value.trim();
    const transLink = translatedLink.value.trim();
    
    // Check API Key
    const userApiKey = getUserApiKey();
    if (!userApiKey) {
        showErrorSummarize('⚠️ Vui lòng cấu hình API Key trước khi sử dụng!');
        openModal();
        apiKeyInput.focus();
        return;
    }
    
    // Validate inputs
    if (!markdown) {
        showErrorSummarize('Vui lòng nhập nội dung Markdown');
        markdownInput.focus();
        return;
    }
    
    if (!origLink || !isValidUrl(origLink)) {
        showErrorSummarize('Vui lòng nhập link bài viết gốc hợp lệ');
        originalLink.focus();
        return;
    }
    
    if (!transLink || !isValidUrl(transLink)) {
        showErrorSummarize('Vui lòng nhập link bản dịch hợp lệ');
        translatedLink.focus();
        return;
    }
    
    // Show loading
    showLoadingSummarize();
    showLogSectionSummarize();
    clearLogsSummarize();
    
    addLogSummarize('🚀 Bắt đầu tạo tóm tắt Facebook...', 'info');
    addLogSummarize(`📝 Độ dài markdown: ${markdown.length} ký tự`, 'info');
    addLogSummarize('🤖 Đang gửi request đến Gemini 2.5 Pro...', 'info');
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                markdown: markdown,
                original_link: origLink,
                translated_link: transLink,
                api_key: userApiKey,
                model: DEFAULT_MODEL
            }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            addLogSummarize('✅ Tạo tóm tắt thành công', 'success');
            if (data.metadata) {
                addLogSummarize(`📄 Kết quả: ${data.metadata.output_size} ký tự`, 'info');
                addLogSummarize(`⚙️ Finish reason: ${data.metadata.finish_reason_text}`, 'info');
            }
            addLogSummarize(`✅ Hoàn thành! Thời gian xử lý: ${duration}s`, 'success');
            updateLogStatusSummarize('completed');
            
            currentSummary = data.summary;
            showResultSummarize(data.summary);
            
            if (data.warning) {
                addLogSummarize(`⚠️ ${data.warning}`, 'warning');
            }
        } else {
            addLogSummarize(`❌ Lỗi: ${data.error}`, 'error');
            updateLogStatusSummarize('error');
            showErrorSummarize(data.error || 'Đã xảy ra lỗi không xác định');
        }
    } catch (error) {
        console.error('Error:', error);
        addLogSummarize(`❌ Lỗi kết nối: ${error.message}`, 'error');
        updateLogStatusSummarize('error');
        showErrorSummarize('Không thể kết nối đến server. Vui lòng thử lại.');
    }
}

async function handleCopySummary() {
    try {
        await navigator.clipboard.writeText(currentSummary);
        
        const originalHTML = copyBtnSummarize.innerHTML;
        copyBtnSummarize.innerHTML = '<i class="fas fa-check"></i> Đã copy!';
        copyBtnSummarize.classList.add('copied');
        
        setTimeout(() => {
            copyBtnSummarize.innerHTML = originalHTML;
            copyBtnSummarize.classList.remove('copied');
        }, 2000);
    } catch (error) {
        alert('Không thể copy. Vui lòng copy thủ công.');
    }
}

function handleDownloadSummary() {
    const blob = new Blob([currentSummary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const date = new Date();
    const filename = `facebook-summary-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.txt`;
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Summarize UI State Management
function showLoadingSummarize() {
    hideAllSectionsSummarize();
    loadingSectionSummarize.classList.remove('hidden');
    summarizeBtn.disabled = true;
}

function showErrorSummarize(message) {
    hideAllSectionsSummarize();
    errorTextSummarize.textContent = message;
    errorSectionSummarize.classList.remove('hidden');
    summarizeBtn.disabled = false;
}

function showResultSummarize(summary) {
    hideAllSectionsSummarize();
    summaryContent.textContent = summary;
    resultSectionSummarize.classList.remove('hidden');
    summarizeBtn.disabled = false;
}

function hideAllSectionsSummarize() {
    loadingSectionSummarize.classList.add('hidden');
    errorSectionSummarize.classList.add('hidden');
    resultSectionSummarize.classList.add('hidden');
}

function resetSummarizeForm() {
    hideAllSectionsSummarize();
    hideLogSectionSummarize();
    markdownInput.value = '';
    originalLink.value = '';
    translatedLink.value = '';
    markdownInput.focus();
    currentSummary = '';
    summarizeBtn.disabled = false;
}

// Summarize Log Functions
function showLogSectionSummarize() {
    logSectionSummarize.classList.remove('hidden');
    updateLogStatusSummarize('processing');
}

function hideLogSectionSummarize() {
    logSectionSummarize.classList.add('hidden');
}

function updateLogStatusSummarize(status) {
    logStatusSummarize.className = 'log-status-badge';
    if (status === 'processing') {
        logStatusSummarize.textContent = 'Processing...';
        logStatusSummarize.classList.add('processing');
    } else if (status === 'completed') {
        logStatusSummarize.textContent = 'Completed';
        logStatusSummarize.classList.add('completed');
    } else if (status === 'error') {
        logStatusSummarize.textContent = 'Error';
        logStatusSummarize.classList.add('error');
    }
}

function addLogSummarize(message, type = 'info') {
    const time = new Date().toLocaleTimeString('vi-VN');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<span class="log-time">[${time}]</span>${message}`;
    logContentSummarize.appendChild(logEntry);
    logContentSummarize.scrollTop = logContentSummarize.scrollHeight;
}

function clearLogsSummarize() {
    logContentSummarize.innerHTML = '';
}

// Auto-focus input on load
window.addEventListener('load', () => {
    loadSavedConfig();
    
    // Focus on appropriate input
    const savedApiKey = getUserApiKey();
    if (savedApiKey) {
        blogUrlInput.focus();
    } else {
        apiKeyInput.focus();
    }
});

// Handle paste event
blogUrlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const url = blogUrlInput.value.trim();
        if (isValidUrl(url)) {
            blogUrlInput.style.borderColor = 'var(--success-color)';
            setTimeout(() => {
                blogUrlInput.style.borderColor = '';
            }, 1000);
        }
    }, 10);
});

