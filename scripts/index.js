import markdownit from 'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/+esm'

// 初始化Markdown渲染器
const md = markdownit({
    html: true,         // 允许HTML标签
    linkify: true,      // 自动转换URL为链接
    typographer: true   // 启用排版优化
});

// 获取HTML元素
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatHistory = document.getElementById('chatHistory');

// 发送按钮点击事件监听器
sendButton.addEventListener('click', sendMessage);

// 输入框回车键事件监听器
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage()
    }
});

// 发送消息函数
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "") return;

    // 显示用户消息（保持纯文本）
    appendMessage(message, 'user-message');

    userInput.value = '';
    try {
        // 调用真实后端API
        const response = await fetch('http://0.0.0.0:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: message }),
        });

        if (!response.ok) throw new Error('API请求失败');
        const data = await response.json();

        // 渲染LLM返回的Markdown内容
        appendMarkdownMessage(data.response, 'llm-message');

    } catch (error) {
        console.error('Error:', error);
        appendMessage(`请求失败: ${error.message}`, 'llm-message');
    } finally {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

// 添加纯文本消息（用户消息）
function appendMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 添加Markdown渲染消息（LLM消息）
function appendMarkdownMessage(markdown, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type, 'markdown-content');

    // 渲染Markdown为HTML
    messageDiv.innerHTML = md.render(markdown);

    // 添加复制代码功能
    addCodeCopyButtons(messageDiv);

    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 为代码块添加复制按钮
function addCodeCopyButtons(container) {
    container.querySelectorAll('pre code').forEach(codeBlock => {
        const pre = codeBlock.parentNode;
        if (!pre.classList.contains('code-block')) {
            pre.classList.add('code-block');

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-button';
            copyButton.textContent = '复制';
            copyButton.title = '复制代码';

            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(codeBlock.textContent)
                    .then(() => {
                        copyButton.textContent = '已复制!';
                        setTimeout(() => {
                            copyButton.textContent = '复制';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('复制失败:', err);
                        copyButton.textContent = '失败';
                    });
            });

            pre.insertBefore(copyButton, pre.firstChild);
        }
    });
}
