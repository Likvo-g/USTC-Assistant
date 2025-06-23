// 获取 HTML 元素
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatHistory = document.getElementById('chatHistory');

// 发送按钮点击事件监听器
sendButton.addEventListener('click', sendMessage);

// 输入框回车键事件监听器
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 发送消息函数
function sendMessage() {
    const message = userInput.value.trim(); // 获取用户输入并去除空格

    if (message === "") { // 如果消息为空，则不发送
        return;
    }

    // 显示用户消息
    appendMessage(message, 'user-message');

    // 清空输入框
    userInput.value = '';

    // --- 这里是关键：你将在这里调用你的 LLM 后端 ---
    // 这是一个模拟的 LLM 回复
    const llmReply = "抱歉，我目前只是一个 demo，还没有连接到真实的大模型。你说了：" + message;

    // 模拟延迟，看起来更像 AI 在思考
    setTimeout(() => {
        appendMessage(llmReply, 'llm-message');
        chatHistory.scrollTop = chatHistory.scrollHeight; // 滚动到底部
    }, 500);
    // --- 实际项目中，你会在这里发起 fetch() 或 XMLHttpRequest 请求到你的后端 API ---
    /*
    // 示例：使用 fetch API (需要后端支持 CORS)
    fetch('http://your_llm_backend_address/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: message }),
    })
    .then(response => response.json())
    .then(data => {
        const actualLlMReply = data.response || "未能获取到大模型回复。";
        appendMessage(actualLlMReply, 'llm-message');
        chatHistory.scrollTop = chatHistory.scrollHeight; // 滚动到底部
    })
    .catch(error => {
        console.error('Error:', error);
        appendMessage('调用大模型后端失败，请检查网络或后端服务。', 'llm-message');
        chatHistory.scrollTop = chatHistory.scrollHeight; // 滚动到底部
    });
    */
}

// 添加消息到聊天记录
function appendMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight; // 保持滚动条在最底部
}