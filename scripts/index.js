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
async function sendMessage() {
  const message = userInput.value.trim();
  if (message === "") return;
  // 显示用户消息
  appendMessage(message, 'user-message');
  userInput.value = '';
  try {
    // 调用真实后端APIhttp:
    const response = await fetch('http://110.42.45.71:8000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: message }),
    });
    if (!response.ok) throw new Error('API请求失败');
    const data = await response.json();
    appendMessage(data.response, 'llm-message');

  } catch (error) {
    console.error('Error:', error);
    appendMessage(`请求失败: ${error.message}`, 'llm-message');
  } finally {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

// 添加消息到聊天记录
function appendMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight; // 保持滚动条在最底部
}

