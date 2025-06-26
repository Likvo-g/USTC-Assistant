// 修正后的index.js
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
const mapContainer = document.getElementById('mapContainer');
const closeMapBtn = document.getElementById('closeMapBtn');

// 地图组件变量
let map = null;
let driving = null; // 用于驾车路径规划
let walking = null; // 用于步行路径规划
let markers = []; // 存储标记点
let currentRoute = null; // 存储当前路线

// 初始化高德地图
function initMap(centerCoords) {
    // 如果地图已经初始化，不需要重新初始化
    if (map !== null) {
        // 如果提供了新的中心点，更新地图中心
        if (centerCoords) {
            // 注意：高德地图使用[经度,纬度]格式
            map.setCenter([centerCoords[1], centerCoords[0]]);
        }
        return Promise.resolve();
    }

    // 默认中心点为中科大东区坐标
    const defaultCenter = [117.2544, 31.8427]; // 经度,纬度
    const center = centerCoords ? [centerCoords[1], centerCoords[0]] : defaultCenter;

    return new Promise((resolve, reject) => {
        // 使用AMapLoader加载高德地图
        AMapLoader.load({
            key: "4480dff2ef65fb788edbbbd6d4f4521e",      // 您申请的Key值
            version: "2.0",      // 指定要加载的JSAPI的版本
            plugins: ["AMap.Driving", "AMap.Walking", "AMap.ToolBar", "AMap.Scale"] // 需要使用的插件列表
        }).then((AMap) => {
            // 创建地图实例
            map = new AMap.Map("map", {
                center: center,  // 中心点坐标
                zoom: 16,        // 地图缩放级别
                resizeEnable: true // 自动调整大小
            });

            // 添加地图控件
            map.addControl(new AMap.ToolBar());
            map.addControl(new AMap.Scale());

            // 初始化路径规划插件
            driving = new AMap.Driving({
                map: map,
                panel: false, // 不使用路径规划面板
                policy: AMap.DrivingPolicy.LEAST_TIME // 最快路线
            });

            walking = new AMap.Walking({
                map: map,
                panel: false // 不使用路径规划面板
            });

            // 暴露地图组件给全局
            window.mapComponent = {
                showRoute: showRoute,
                showLocation: showLocation,
                clearMap: clearMap,
                switchTravelMode: switchTravelMode
            };

            resolve();
        }).catch(e => {
            console.error("地图加载失败：", e);
            reject(e);
        });
    });
}

// 显示路线
async function showRoute(startCoords, endCoords, travelMode = 'driving') {
    try {
        // 确保地图已初始化
        await initMap(endCoords);

        // 显示地图容器
        mapContainer.classList.remove('d-none');
        document.body.classList.add('map-active');

        // 清除现有路线和标记
        clearMap();

        // 如果起点或终点坐标为空，则仅显示一个点
        if (!startCoords || !endCoords) {
            const coords = startCoords || endCoords;
            if (coords) {
                showLocation(coords);
            }
            return;
        }

        // 高德地图坐标 - [经度,纬度]格式
        const startLngLat = new AMap.LngLat(startCoords[1], startCoords[0]);
        const endLngLat = new AMap.LngLat(endCoords[1], endCoords[0]);

        // 添加起点和终点标记
        const startMarker = new AMap.Marker({
            position: startLngLat,
            map: map,
            title: '起点',
            icon: new AMap.Icon({
                size: new AMap.Size(25, 34),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png',
                imageSize: new AMap.Size(25, 34)
            })
        });

        const endMarker = new AMap.Marker({
            position: endLngLat,
            map: map,
            title: '终点',
            icon: new AMap.Icon({
                size: new AMap.Size(25, 34),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/end.png',
                imageSize: new AMap.Size(25, 34)
            })
        });

        markers.push(startMarker, endMarker);

        // 选择导航方式
        const router = travelMode === 'walking' ? walking : driving;

        // 保存当前路线信息，用于后续切换导航模式
        currentRoute = {
            start: startCoords,
            end: endCoords,
            mode: travelMode
        };

        // 使用选定的路径规划
        router.search(startLngLat, endLngLat, function(status, result) {
            if (status === 'complete') {
                console.log('规划路径成功');

                // 添加路线切换控件
                addTravelModeControl(travelMode);
            } else {
                console.error('规划路径失败:', result);
                // 如果路径规划失败，至少显示直线连接
                const polyline = new AMap.Polyline({
                    path: [startLngLat, endLngLat],
                    strokeColor: '#3366FF',
                    strokeWeight: 6,
                    strokeOpacity: 0.8
                });
                polyline.setMap(map);
            }

            // 调整视图以适应路线
            map.setFitView([startMarker, endMarker]);
        });
    } catch (error) {
        console.error('路线显示错误:', error);
        appendMessage(`地图加载失败: ${error.message}`, 'error-message');
    }
}

// 添加导航模式切换控件
function addTravelModeControl(currentMode) {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'travel-mode-control';
    controlDiv.innerHTML = `
        <div class="travel-mode-title">导航模式</div>
        <div class="travel-mode-options">
            <button class="travel-mode-btn ${currentMode === 'driving' ? 'active' : ''}" data-mode="driving">驾车</button>
            <button class="travel-mode-btn ${currentMode === 'walking' ? 'active' : ''}" data-mode="walking">步行</button>
        </div>
    `;

    // 添加按钮事件
    controlDiv.querySelectorAll('.travel-mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            switchTravelMode(mode);
        });
    });

    // 移除旧控件
    const oldControl = document.querySelector('.travel-mode-control');
    if (oldControl) {
        oldControl.remove();
    }

    // 添加到地图 - 使用自定义控件
    const customControl = {
        dom: controlDiv,
        position: 'RT' // 右上角
    };

    map.addControl(new AMap.Control(customControl));
}

// 切换导航模式
function switchTravelMode(mode) {
    if (currentRoute) {
        showRoute(currentRoute.start, currentRoute.end, mode);
    }
}

// 显示单个位置
async function showLocation(coords) {
    try {
        // 确保地图已初始化
        await initMap(coords);

        // 显示地图容器
        mapContainer.classList.remove('d-none');
        document.body.classList.add('map-active');

        // 清除现有路线和标记
        clearMap();

        // 高德地图坐标 - [经度,纬度]格式
        const lngLat = new AMap.LngLat(coords[1], coords[0]);

        // 添加位置标记
        const marker = new AMap.Marker({
            position: lngLat,
            map: map,
            title: '目的地',
            animation: 'AMAP_ANIMATION_DROP' // 添加动画效果
        });

        markers.push(marker);

        // 设置地图视图中心为该位置
        map.setCenter(lngLat);
        map.setZoom(17);

        // 添加信息窗体
        const infoWindow = new AMap.InfoWindow({
            content: '<div class="info-window">目的地</div>',
            offset: new AMap.Pixel(0, -30)
        });

        infoWindow.open(map, lngLat);

        // 点击标记时打开信息窗体
        marker.on('click', function() {
            infoWindow.open(map, lngLat);
        });
    } catch (error) {
        console.error('位置显示错误:', error);
        appendMessage(`地图加载失败: ${error.message}`, 'error-message');
    }
}

// 清除地图上的路线和标记
function clearMap() {
    if (map) {
        if (driving) {
            driving.clear();
        }

        if (walking) {
            walking.clear();
        }

        // 清除所有标记
        markers.forEach(marker => {
            marker.setMap(null);
        });
        markers = [];

        // 清除地图上的所有覆盖物
        map.clearMap();

        // 重置当前路线
        currentRoute = null;
    }
}

// 事件监听
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 关闭地图按钮事件
closeMapBtn.addEventListener('click', function() {
    mapContainer.classList.add('d-none');
    document.body.classList.remove('map-active');
});

// 发送消息函数
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "") return;

    // 显示用户消息
    appendMessage(message, 'user-message');
    userInput.value = '';

    // 显示加载状态
    const loaderId = showLoader();

    try {
        // 调用后端API
        const response = await fetch('http://0.0.0.0:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: message }),
        });

        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);

        const data = await response.json();

        // 处理不同类型的响应
        if (data.intent === 'campus_navigation') {
            // 导航类型响应，有特殊处理
            handleNavigationResponse(data);
        } else if (data.response) {
            // 普通响应，直接渲染
            appendMarkdownMessage(data.response, 'llm-message');
        } else if (data.answer) {
            // 新版API格式
            appendMarkdownMessage(data.answer, 'llm-message');
        } else {
            // 未知格式
            appendMessage("收到未知格式的响应", 'error-message');
        }

    } catch (error) {
        console.error('错误:', error);
        appendMessage(`请求失败: ${error.message}`, 'error-message');
    } finally {
        // 移除加载状态
        hideLoader(loaderId);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

// 处理导航响应
function handleNavigationResponse(data) {
    // 显示导航回答
    appendMarkdownMessage(data.answer, 'llm-message');

    // 如果状态是错误，显示错误消息
    if (data.status === 'error') {
        appendMessage(`导航错误: ${data.message}`, 'error-message');
        return;
    }

    // 如果有导航数据，显示并处理地图
    if (data.navigation_data) {
        const navData = data.navigation_data;

        // 确定导航模式 - 如果API提供了mode则使用，否则默认驾车
        const travelMode = navData.travel_mode || 'driving';

        // 获取起点和终点坐标
        const startCoords = navData.start ? navData.start.coords : null;
        const endCoords = navData.end ? navData.end.coords : null;

        // 显示路线 - 使用指定的导航模式
        if (startCoords && endCoords) {
            showRoute(startCoords, endCoords, travelMode);
        } else if (endCoords) {
            showLocation(endCoords);
        }

        // 显示坐标信息
        let coordInfo = "**导航坐标信息**\n\n";
        if (navData.start) {
            coordInfo += `**起点:** ${navData.start.name} (${navData.start.coords.join(', ')})\n\n`;
        }
        if (navData.end) {
            coordInfo += `**终点:** ${navData.end.name} (${navData.end.coords.join(', ')})`;
        }
        if (navData.travel_mode) {
            const modeName = navData.travel_mode === 'walking' ? '步行' : '驾车';
            coordInfo += `\n\n**导航模式:** ${modeName}`;
        }

        // 如果有距离和时间信息，显示出来
        if (navData.distance) {
            const distance = navData.distance > 1000 ?
                (navData.distance / 1000).toFixed(1) + ' 公里' :
                Math.round(navData.distance) + ' 米';
            coordInfo += `\n\n**距离:** ${distance}`;
        }
        if (navData.duration) {
            const minutes = Math.ceil(navData.duration / 60);
            coordInfo += `\n\n**预计时间:** ${minutes} 分钟`;
        }

        appendMarkdownMessage(coordInfo, 'llm-message route-info');
    }
}

// 显示加载指示器
function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'message llm-message loader';
    loader.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatHistory.appendChild(loader);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return loader.id = 'loader-' + Date.now();
}

// 隐藏加载指示器
function hideLoader(loaderId) {
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();
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
    messageDiv.classList.add('message', 'llm-message', 'markdown-content');

    // 添加额外的类（如route-info）
    if (type && type !== 'llm-message') {
        const extraClasses = type.split(' ').filter(cls => cls !== 'llm-message');
        messageDiv.classList.add(...extraClasses);
    }

    try {
        // 确保markdown是字符串类型
        const markdownContent = typeof markdown === 'string' ? markdown :
            (markdown ? JSON.stringify(markdown) : "无内容");

        // 渲染Markdown为HTML
        messageDiv.innerHTML = md.render(markdownContent);
    } catch (error) {
        console.error('Markdown渲染错误:', error);
        // 渲染失败时显示原始内容
        messageDiv.textContent = typeof markdown === 'string' ? markdown :
            JSON.stringify(markdown, null, 2);
    }

    // 添加代码复制功能
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

// 保存聊天历史到本地存储
function saveChatHistory() {
    const messages = [];
    document.querySelectorAll('#chatHistory .message').forEach(msg => {
        if (msg.classList.contains('loader')) return; // 跳过加载指示器

        const type = msg.classList.contains('user-message') ? 'user' : 'assistant';
        // 保存HTML内容以保留格式
        const content = msg.classList.contains('markdown-content') ?
            msg.innerHTML : msg.textContent;
        const isHtml = msg.classList.contains('markdown-content');

        messages.push({ type, content, isHtml });
    });

    localStorage.setItem('ustcAssistantChat', JSON.stringify(messages));
}

// 加载聊天历史
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('ustcAssistantChat');
        if (saved) {
            const messages = JSON.parse(saved);
            // 清空当前历史
            chatHistory.innerHTML = '';
            // 只加载最近的20条消息，防止过多
            const recentMessages = messages.slice(-20);
            recentMessages.forEach(msg => {
                if (msg.type === 'user') {
                    appendMessage(msg.content, 'user-message');
                } else {
                    if (msg.isHtml) {
                        // 如果是HTML内容（渲染过的markdown）
                        const messageDiv = document.createElement('div');
                        messageDiv.classList.add('message', 'llm-message', 'markdown-content');
                        messageDiv.innerHTML = msg.content;
                        chatHistory.appendChild(messageDiv);
                    } else {
                        appendMessage(msg.content, 'llm-message');
                    }
                }
            });
        }
    } catch (e) {
        console.error('加载聊天历史失败:', e);
        // 如果加载失败，添加默认欢迎消息
        appendMarkdownMessage('你好，这里是USTC-Assistant！', 'llm-message');
    }
}

// 清空聊天历史
function clearChatHistory() {
    chatHistory.innerHTML = '';
    localStorage.removeItem('ustcAssistantChat');
    // 添加欢迎消息
    appendMarkdownMessage('你好，这里是USTC-Assistant！', 'llm-message');
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 添加全局样式，用于导航模式控件
    const style = document.createElement('style');
    style.textContent = `
        .travel-mode-control {
            background: white;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            margin: 10px;
            font-size: 14px;
        }
        .travel-mode-title {
            font-weight: bold;
            margin-bottom: 5px;
            text-align: center;
        }
        .travel-mode-options {
            display: flex;
            justify-content: center;
        }
        .travel-mode-btn {
            padding: 5px 10px;
            margin: 0 5px;
            border: 1px solid #ccc;
            border-radius: 3px;
            background: #f8f8f8;
            cursor: pointer;
        }
        .travel-mode-btn.active {
            background: #007bff;
            color: white;
            border-color: #0056b3;
        }
        .info-window {
            padding: 5px 10px;
            font-size: 14px;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    // 尝试加载历史聊天记录
    try {
        loadChatHistory();
    } catch (e) {
        console.error('加载聊天历史失败:', e);
        // 如果没有历史或加载失败，显示欢迎消息
        if (chatHistory.children.length === 0) {
            appendMarkdownMessage('你好，这里是USTC-Assistant！', 'llm-message');
        }
    }

    // 在发送消息后保存聊天历史
    const originalSendMessage = sendMessage;
    sendMessage = async function() {
        await originalSendMessage();
        setTimeout(saveChatHistory, 500); // 稍微延迟保存，确保消息已完全渲染
    };
});
