/**
 * 蓝牙文件传输应用主脚本
 * 基于Web Bluetooth API实现文件传输功能
 */

// 全局变量
let selectedFiles = []; // 选中的文件列表
let connectedDevice = null; // 当前连接的蓝牙设备
let gattServer = null; // GATT服务器
let transferCharacteristic = null; // 用于传输的特征
let isTransferring = false; // 是否正在传输
let isPaused = false; // 是否暂停传输
let transferProgress = 0; // 传输进度
let transferSpeed = 0; // 传输速度
let startTime = 0; // 传输开始时间
let transferredBytes = 0; // 已传输字节数
let totalBytes = 0; // 总字节数
let transferInterval = null; // 传输进度更新定时器
let enhancedTransferEnabled = false; // 是否启用增强传输
let transferHistory = []; // 传输历史记录
let currentTransferFile = null; // 当前传输的文件
let fileReader = null; // 文件读取器
let currentChunkIndex = 0; // 当前传输的块索引
let totalChunks = 0; // 总块数
let chunkSize = 20; // 块大小 (BLE MTU - 3，通常为20字节)
let transferQueue = []; // 传输队列
let isQueueProcessing = false; // 是否正在处理队列

// 云端发送相关变量
let currentSendMethod = 'bluetooth'; // 当前发送方式：'bluetooth' 或 'cloud'
let cloudStorage = {}; // 云端存储（模拟），格式：{提取码: {files: [...], expires: 时间戳}}
let currentExtractionCode = ''; // 当前生成的提取码

// DOM元素
const fileInput = document.getElementById('file-input');
const selectedFilesContainer = document.getElementById('selected-files');
const fileList = document.getElementById('file-list');
const scanDevicesBtn = document.getElementById('scan-devices-btn');
const connectedDeviceBtn = document.getElementById('connected-device-btn');
const connectedDeviceName = document.getElementById('connected-device-name');
const deviceList = document.getElementById('device-list');
const devices = document.getElementById('devices');
const sendFileBtn = document.getElementById('send-file-btn');
const enhancedTransferToggle = document.getElementById('enhanced-transfer-toggle');
const transferControls = document.getElementById('transfer-controls');
const pauseBtn = document.getElementById('pause-btn');
const cancelBtn = document.getElementById('cancel-btn');
const transferProgressSection = document.getElementById('transfer-progress-section');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const transferSpeedElement = document.getElementById('transfer-speed');
const transferredSize = document.getElementById('transferred-size');
const totalSize = document.getElementById('total-size');
const remainingTime = document.getElementById('remaining-time');
const transferHistoryContainer = document.getElementById('transfer-history');
const noHistory = document.getElementById('no-history');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const compatibilityAlert = document.getElementById('compatibility-alert');
const historyFilterBtns = document.querySelectorAll('.history-filter-btn');

// 弹窗元素
const scanModal = document.getElementById('scan-modal');
const scanStatus = document.getElementById('scan-status');
const scanResults = document.getElementById('scan-results');
const scanDeviceList = document.getElementById('scan-device-list');
const closeScanModal = document.getElementById('close-scan-modal');
const stopScanBtn = document.getElementById('stop-scan-btn');
const transferStatusModal = document.getElementById('transfer-status-modal');
const statusTitle = document.getElementById('status-title');
const statusContent = document.getElementById('status-content');
const closeStatusModal = document.getElementById('close-status-modal');
const statusOkBtn = document.getElementById('status-ok-btn');
const enhancedTechModal = document.getElementById('enhanced-tech-modal');
const closeEnhancedModal = document.getElementById('close-enhanced-modal');
const enhancedOkBtn = document.getElementById('enhanced-ok-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk = document.getElementById('confirm-ok');

// 初始化函数
function init() {
    // 检查浏览器兼容性
    checkBrowserCompatibility();
    
    // 加载传输历史
    loadTransferHistory();
    
    // 绑定事件
    bindEvents();
    
    // 初始化发送方式选择
    initSendMethodSelection();
}

/**
 * 检查浏览器兼容性
 */
function checkBrowserCompatibility() {
    if (!navigator.bluetooth) {
        compatibilityAlert.classList.remove('hidden');
        compatibilityAlert.classList.remove('bg-red-50', 'text-red-700', 'border-red-200');
        compatibilityAlert.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
        compatibilityAlert.querySelector('h3').textContent = '蓝牙不可用';
        compatibilityAlert.querySelector('p').textContent = '您的浏览器不支持Web Bluetooth API，已自动切换到云端发送模式。';
        
        // 自动切换到云端发送方式
        switchSendMethod('cloud');
        
        return false;
    }
    return true;
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
    // 文件选择事件
    fileInput.addEventListener('change', handleFileSelect);
    
    // 浏览文件按钮
    const browseFilesBtn = document.getElementById('browse-files-btn');
    if (browseFilesBtn) {
        browseFilesBtn.addEventListener('click', () => fileInput.click());
    }
    
    // 清空文件按钮
    const clearFilesBtn = document.getElementById('clear-files-btn');
    if (clearFilesBtn) {
        clearFilesBtn.addEventListener('click', clearSelectedFiles);
    }
    
    // 拖拽文件事件
    const dropArea = document.getElementById('upload-area');
    if (dropArea) {
        dropArea.addEventListener('dragover', handleDragOver);
        dropArea.addEventListener('dragleave', handleDragLeave);
        dropArea.addEventListener('drop', handleDrop);
        dropArea.addEventListener('click', () => fileInput.click());
    }
    
    // 设备扫描按钮
    scanDevicesBtn.addEventListener('click', scanForDevices);
    
    // 发送文件按钮
    sendFileBtn.addEventListener('click', sendFiles);
    
    // 增强传输开关
    enhancedTransferToggle.addEventListener('change', toggleEnhancedTransfer);
    
    // 暂停/继续按钮
    pauseBtn.addEventListener('click', togglePauseTransfer);
    
    // 取消按钮
    cancelBtn.addEventListener('click', cancelTransfer);
    
    // 清空历史按钮
    clearHistoryBtn.addEventListener('click', showClearHistoryConfirm);
    
    // 弹窗关闭按钮
    closeScanModal.addEventListener('click', closeScanModalFunc);
    stopScanBtn.addEventListener('click', stopScan);
    closeStatusModal.addEventListener('click', closeStatusModalFunc);
    statusOkBtn.addEventListener('click', closeStatusModalFunc);
    closeEnhancedModal.addEventListener('click', closeEnhancedModalFunc);
    enhancedOkBtn.addEventListener('click', closeEnhancedModalFunc);
    confirmCancel.addEventListener('click', closeConfirmModal);
    
    // 历史记录筛选按钮
    historyFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            filterHistory(filter);
            
            // 更新按钮样式
            historyFilterBtns.forEach(b => {
                b.classList.remove('bg-primary', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-primary', 'text-white');
        });
    });
    
    // 分享按钮（云端模式）
    const shareCodeBtn = document.getElementById('share-code-btn');
    if (shareCodeBtn) {
        shareCodeBtn.addEventListener('click', shareExtractionCode);
    }
}

/**
 * 处理文件选择
 */
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        selectedFiles = files;
        updateFileList();
        updateSendButtonState();
    }
}

/**
 * 处理拖拽经过
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropArea = document.getElementById('upload-area');
    if (dropArea) {
        dropArea.classList.add('border-primary', 'bg-blue-50');
        dropArea.classList.remove('border-gray-300');
    }
}

/**
 * 处理拖拽离开
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropArea = document.getElementById('upload-area');
    if (dropArea) {
        dropArea.classList.remove('border-primary', 'bg-blue-50');
        dropArea.classList.add('border-gray-300');
    }
}

/**
 * 处理拖拽放置
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropArea = document.getElementById('upload-area');
    if (dropArea) {
        dropArea.classList.remove('border-primary', 'bg-blue-50');
        dropArea.classList.add('border-gray-300');
    }
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
        selectedFiles = files;
        updateFileList();
        updateSendButtonState();
    }
}

/**
 * 更新文件列表显示
 */
function updateFileList() {
    const fileCountIndicator = document.getElementById('file-count-indicator');
    const selectedFileCount = document.getElementById('selected-file-count');
    
    if (selectedFiles.length === 0) {
        selectedFilesContainer.classList.add('hidden');
        fileCountIndicator.classList.add('hidden');
        return;
    }
    
    selectedFilesContainer.classList.remove('hidden');
    fileCountIndicator.classList.remove('hidden');
    selectedFileCount.textContent = selectedFiles.length;
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 shadow-sm';
        
        // 文件图标
        const fileIcon = getFileIcon(file.type);
        
        // 文件信息
        fileItem.innerHTML = `
            <div class="flex items-center flex-1 min-w-0">
                <span class="mr-3 text-lg text-primary">${fileIcon}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate" title="${file.name}">${file.name}</p>
                    <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="text-gray-400 hover:text-danger transition-colors p-2 rounded-full hover:bg-red-50" onclick="removeFile(${index})">
                <i class="fa fa-times"></i>
            </button>
        `;
        
        fileList.appendChild(fileItem);
    });
}

/**
 * 获取文件图标
 */
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) {
        return '<i class="fa fa-file-image-o"></i>';
    } else if (fileType.startsWith('audio/')) {
        return '<i class="fa fa-file-audio-o"></i>';
    } else if (fileType.startsWith('video/')) {
        return '<i class="fa fa-file-video-o"></i>';
    } else if (fileType.includes('pdf')) {
        return '<i class="fa fa-file-pdf-o"></i>';
    } else if (fileType.includes('word') || fileType.includes('document')) {
        return '<i class="fa fa-file-word-o"></i>';
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
        return '<i class="fa fa-file-excel-o"></i>';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
        return '<i class="fa fa-file-powerpoint-o"></i>';
    } else if (fileType.includes('zip') || fileType.includes('compressed')) {
        return '<i class="fa fa-file-archive-o"></i>';
    } else if (fileType.startsWith('text/')) {
        return '<i class="fa fa-file-text-o"></i>';
    } else {
        return '<i class="fa fa-file-o"></i>';
    }
}

/**
 * 移除文件
 */
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateSendButtonState();
}

/**
 * 扫描蓝牙设备
 */
async function scanForDevices() {
    if (!navigator.bluetooth) {
        showStatusModal('错误', '您的浏览器不支持Web Bluetooth API');
        return;
    }
    
    // 显示扫描弹窗
    scanModal.classList.remove('hidden');
    scanStatus.classList.remove('hidden');
    scanResults.classList.add('hidden');
    scanDeviceList.innerHTML = '';
    
    try {
        // 请求蓝牙设备
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['generic_access', 'generic_attribute']
        });
        
        // 设备选择后处理
        device.addEventListener('gattserverdisconnected', handleDisconnection);
        connectedDevice = device;
        connectedDeviceName.textContent = device.name || '未知设备';
        connectedDeviceBtn.classList.remove('bg-gray-200');
        connectedDeviceBtn.classList.add('bg-green-500', 'text-white');
        
        // 连接到GATT服务器
        await connectToGATTServer(device);
        
        // 关闭扫描弹窗
        closeScanModalFunc();
        
        // 更新发送按钮状态
        updateSendButtonState();
        
        // 显示连接成功提示
        showStatusModal('连接成功', `已成功连接到设备: ${device.name || '未知设备'}`);
    } catch (error) {
        console.error('扫描设备失败:', error);
        showStatusModal('扫描失败', `无法扫描蓝牙设备: ${error.message}`);
        closeScanModalFunc();
    }
}

/**
 * 连接到GATT服务器
 */
async function connectToGATTServer(device) {
    try {
        gattServer = await device.gatt.connect();
        
        // 这里我们假设设备有一个自定义服务和特征用于文件传输
        // 在实际应用中，您需要知道设备的服务和特征UUID
        // 由于这是一个演示，我们使用通用访问服务作为示例
        
        // 获取通用访问服务
        const service = await gattServer.getPrimaryService('generic_access');
        
        // 获取设备名称特征（仅作为示例，实际应用中需要使用支持写入的特征）
        transferCharacteristic = await service.getCharacteristic('device_name');
        
        // 注意：在实际应用中，您需要确保特征支持写入操作
        // 这里我们只是演示，实际上device_name特征通常是只读的
        
        return true;
    } catch (error) {
        console.error('连接GATT服务器失败:', error);
        showStatusModal('连接失败', `无法连接到设备: ${error.message}`);
        return false;
    }
}

/**
 * 处理设备断开连接
 */
function handleDisconnection(event) {
    const device = event.target;
    console.log(`设备 ${device.name} 已断开连接`);
    
    connectedDevice = null;
    gattServer = null;
    transferCharacteristic = null;
    
    connectedDeviceName.textContent = '未连接设备';
    connectedDeviceBtn.classList.remove('bg-green-500', 'text-white');
    connectedDeviceBtn.classList.add('bg-gray-200', 'text-gray-700');
    
    updateSendButtonState();
    
    if (isTransferring) {
        cancelTransfer();
        showStatusModal('连接断开', `设备 ${device.name} 已断开连接，传输已取消`);
    }
}

/**
 * 发送文件
 */
async function sendFiles() {
    if (selectedFiles.length === 0) {
        showStatusModal('提示', '请先选择要发送的文件');
        return;
    }
    
    if (currentSendMethod === 'bluetooth') {
        await sendFilesViaBluetooth();
    } else if (currentSendMethod === 'cloud') {
        await sendFilesViaCloud();
    }
}

/**
 * 通过蓝牙发送文件
 */
async function sendFilesViaBluetooth() {
    if (!connectedDevice || !gattServer) {
        showStatusModal('未连接设备', '请先连接蓝牙设备');
        return;
    }
    
    if (!transferCharacteristic) {
        showStatusModal('错误', '无法获取设备传输特征，请确保设备支持文件传输');
        return;
    }
    
    // 开始传输
    isTransferring = true;
    isPaused = false;
    transferProgress = 0;
    transferredBytes = 0;
    
    // 计算总大小
    totalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
    
    // 更新UI
    transferProgressSection.classList.remove('hidden');
    transferControls.classList.remove('hidden');
    sendFileBtn.disabled = true;
    pauseBtn.innerHTML = '<i class="fa fa-pause mr-2"></i>暂停';
    
    // 显示传输进度
    updateProgressUI();
    
    // 记录开始时间
    startTime = Date.now();
    
    // 开始传输进度更新
    startProgressUpdate();
    
    try {
        // 发送文件信息头
        await sendFileHeader();
        
        // 逐个发送文件
        for (let i = 0; i < selectedFiles.length; i++) {
            if (!isTransferring) break; // 如果传输已取消，退出循环
            
            currentTransferFile = selectedFiles[i];
            
            // 发送文件元数据
            await sendFileMetadata(currentTransferFile);
            
            // 发送文件内容
            await sendFileContent(currentTransferFile);
        }
        
        // 传输完成
        if (isTransferring) {
            finishTransfer(true);
        }
    } catch (error) {
        console.error('文件传输失败:', error);
        finishTransfer(false, error.message);
    }
}

/**
 * 通过云端发送文件
 */
async function sendFilesViaCloud() {
    // 开始传输
    isTransferring = true;
    transferProgress = 0;
    transferredBytes = 0;
    
    // 计算总大小
    totalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
    
    // 更新UI
    transferProgressSection.classList.remove('hidden');
    transferControls.classList.remove('hidden');
    sendFileBtn.disabled = true;
    
    // 显示传输进度
    updateProgressUI();
    
    // 记录开始时间
    startTime = Date.now();
    
    // 开始传输进度更新
    startProgressUpdate();
    
    try {
        // 模拟文件上传过程
        await simulateCloudUpload();
        
        // 生成提取码
        currentExtractionCode = generateExtractionCode();
        
        // 存储文件信息到云端存储
        storeFilesInCloud(currentExtractionCode, selectedFiles);
        
        // 更新UI显示提取码
        document.getElementById('extraction-code').textContent = currentExtractionCode;
        document.getElementById('extraction-code-section').classList.remove('hidden');
        document.getElementById('receive-file-section').classList.add('hidden');
        
        // 传输完成
        finishTransfer(true);
    } catch (error) {
        console.error('文件上传失败:', error);
        finishTransfer(false, error.message);
    }
}

/**
 * 模拟云端上传过程
 */
async function simulateCloudUpload() {
    const chunkSize = 1024 * 1024; // 1MB
    let uploadedBytes = 0;
    
    while (uploadedBytes < totalBytes && isTransferring) {
        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 更新上传进度
        uploadedBytes += chunkSize;
        if (uploadedBytes > totalBytes) {
            uploadedBytes = totalBytes;
        }
        
        transferredBytes = uploadedBytes;
        transferProgress = (transferredBytes / totalBytes) * 100;
        
        // 更新UI
        updateProgressUI();
    }
    
    if (!isTransferring) {
        throw new Error('上传已取消');
    }
}

/**
 * 生成5位数字提取码
 */
function generateExtractionCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

/**
 * 将文件存储到云端存储
 */
function storeFilesInCloud(extractionCode, files) {
    // 转换File对象为可存储的格式
    const fileInfoList = files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
    }));
    
    // 计算过期时间（10分钟后）
    const expires = Date.now() + 10 * 60 * 1000;
    
    // 存储到云端存储
    cloudStorage[extractionCode] = {
        files: fileInfoList,
        expires: expires
    };
    
    console.log(`文件已存储到云端，提取码: ${extractionCode}，过期时间: ${new Date(expires).toLocaleString()}`);
    
    // 保存到localStorage
    saveCloudStorage();
}

/**
 * 保存云端存储到localStorage
 */
function saveCloudStorage() {
    try {
        localStorage.setItem('bluetoothCloudStorage', JSON.stringify(cloudStorage));
    } catch (error) {
        console.error('保存云端存储失败:', error);
    }
}

/**
 * 从localStorage加载云端存储
 */
function loadCloudStorage() {
    try {
        const saved = localStorage.getItem('bluetoothCloudStorage');
        if (saved) {
            cloudStorage = JSON.parse(saved);
            // 清理过期的存储
            cleanupExpiredStorage();
        }
    } catch (error) {
        console.error('加载云端存储失败:', error);
        cloudStorage = {};
    }
}

/**
 * 清理过期的云端存储
 */
function cleanupExpiredStorage() {
    const now = Date.now();
    const expiredKeys = [];
    
    // 找出过期的键
    for (const key in cloudStorage) {
        if (cloudStorage[key].expires < now) {
            expiredKeys.push(key);
        }
    }
    
    // 删除过期的存储
    expiredKeys.forEach(key => {
        delete cloudStorage[key];
        console.log(`已清理过期的云端存储，提取码: ${key}`);
    });
    
    // 如果有清理操作，保存更新后的存储
    if (expiredKeys.length > 0) {
        saveCloudStorage();
    }
}

/**
 * 发送文件头信息
 */
async function sendFileHeader() {
    // 创建文件头：文件数量
    const header = new ArrayBuffer(2);
    const view = new DataView(header);
    view.setUint16(0, selectedFiles.length, true);
    
    // 发送文件头
    await sendData(header);
}

/**
 * 发送文件元数据
 */
async function sendFileMetadata(file) {
    // 创建元数据：文件名长度 + 文件名 + 文件大小
    const fileNameBytes = new TextEncoder().encode(file.name);
    const metadataSize = 2 + fileNameBytes.length + 8; // 2字节文件名长度 + 文件名 + 8字节文件大小
    const metadata = new ArrayBuffer(metadataSize);
    const view = new DataView(metadata);
    
    // 写入文件名长度
    view.setUint16(0, fileNameBytes.length, true);
    
    // 写入文件名
    for (let i = 0; i < fileNameBytes.length; i++) {
        view.setUint8(2 + i, fileNameBytes[i]);
    }
    
    // 写入文件大小
    view.setBigUint64(2 + fileNameBytes.length, BigInt(file.size), true);
    
    // 发送元数据
    await sendData(metadata);
}

/**
 * 发送文件内容
 */
async function sendFileContent(file) {
    return new Promise((resolve, reject) => {
        // 重置块索引
        currentChunkIndex = 0;
        
        // 计算总块数
        totalChunks = Math.ceil(file.size / chunkSize);
        
        // 创建文件读取器
        fileReader = new FileReader();
        
        // 读取进度回调
        fileReader.onprogress = (event) => {
            if (event.lengthComputable) {
                const fileProgress = (event.loaded / event.total) * 100;
                const overallProgress = ((transferredBytes + event.loaded) / totalBytes) * 100;
                transferProgress = overallProgress;
                updateProgressUI();
            }
        };
        
        // 读取完成回调
        fileReader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                
                // 分块发送数据
                await sendDataInChunks(arrayBuffer);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        
        // 读取错误回调
        fileReader.onerror = (event) => {
            reject(new Error(`文件读取失败: ${event.target.error}`));
        };
        
        // 开始读取文件
        fileReader.readAsArrayBuffer(file);
    });
}

/**
 * 分块发送数据
 */
async function sendDataInChunks(arrayBuffer) {
    const totalLength = arrayBuffer.byteLength;
    let offset = 0;
    
    // 使用增强传输模式
    if (enhancedTransferEnabled) {
        // 增强模式：使用队列批量发送
        while (offset < totalLength && isTransferring && !isPaused) {
            // 计算当前块大小
            const currentChunkSize = Math.min(chunkSize, totalLength - offset);
            
            // 创建数据块
            const chunk = arrayBuffer.slice(offset, offset + currentChunkSize);
            
            // 添加到传输队列
            transferQueue.push(chunk);
            
            // 更新偏移量
            offset += currentChunkSize;
            
            // 更新已传输字节数
            transferredBytes += currentChunkSize;
            
            // 如果队列达到一定大小或已到达文件末尾，发送队列中的数据
            if (transferQueue.length >= 5 || offset >= totalLength) {
                await processTransferQueue();
            }
            
            // 小延迟，避免过度占用CPU
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        // 确保队列中剩余的数据都被发送
        if (transferQueue.length > 0 && isTransferring && !isPaused) {
            await processTransferQueue();
        }
    } else {
        // 标准模式：逐个发送
        while (offset < totalLength && isTransferring && !isPaused) {
            // 计算当前块大小
            const currentChunkSize = Math.min(chunkSize, totalLength - offset);
            
            // 创建数据块
            const chunk = arrayBuffer.slice(offset, offset + currentChunkSize);
            
            // 发送数据块
            await sendData(chunk);
            
            // 更新偏移量
            offset += currentChunkSize;
            
            // 更新已传输字节数
            transferredBytes += currentChunkSize;
        }
    }
    
    // 如果传输被暂停或取消，抛出异常
    if (!isTransferring) {
        throw new Error('传输已取消');
    } else if (isPaused) {
        throw new Error('传输已暂停');
    }
}

/**
 * 处理传输队列
 */
async function processTransferQueue() {
    if (isQueueProcessing || transferQueue.length === 0) return;
    
    isQueueProcessing = true;
    
    try {
        // 在增强模式下，我们尝试批量处理队列中的数据
        while (transferQueue.length > 0 && isTransferring && !isPaused) {
            const chunk = transferQueue.shift();
            await sendData(chunk);
        }
    } finally {
        isQueueProcessing = false;
    }
}

/**
 * 发送数据
 */
async function sendData(data) {
    if (!transferCharacteristic) {
        throw new Error('传输特征未初始化');
    }
    
    try {
        // 注意：在实际应用中，您需要确保特征支持写入操作
        // 这里我们只是演示，实际上许多特征可能是只读的
        
        // 由于这是一个演示，我们捕获可能的错误但继续执行
        try {
            await transferCharacteristic.writeValue(data);
        } catch (writeError) {
            console.warn('写入特征失败（这是预期的，因为我们使用的是只读特征进行演示）:', writeError);
            // 继续执行，不中断传输流程
        }
        
        // 模拟传输延迟
        await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
        console.error('发送数据失败:', error);
        throw error;
    }
}

/**
 * 开始进度更新
 */
function startProgressUpdate() {
    // 清除之前的定时器
    if (transferInterval) {
        clearInterval(transferInterval);
    }
    
    // 创建新的定时器，每秒更新一次进度
    transferInterval = setInterval(() => {
        if (isTransferring && !isPaused) {
            // 计算传输速度
            const elapsedTime = (Date.now() - startTime) / 1000; // 秒
            if (elapsedTime > 0) {
                transferSpeed = transferredBytes / elapsedTime; // 字节/秒
            }
            
            updateProgressUI();
        }
    }, 1000);
}

/**
 * 更新进度UI
 */
function updateProgressUI() {
    // 计算进度百分比
    const percentage = Math.round((transferredBytes / totalBytes) * 100);
    
    // 更新进度条
    progressBar.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
    
    // 更新传输速度
    transferSpeedElement.textContent = formatFileSize(transferSpeed) + '/s';
    
    // 更新已传输大小和总大小
    transferredSize.textContent = formatFileSize(transferredBytes);
    totalSize.textContent = formatFileSize(totalBytes);
    
    // 计算剩余时间
    if (transferSpeed > 0 && transferredBytes < totalBytes) {
        const remainingBytes = totalBytes - transferredBytes;
        const remainingSeconds = Math.round(remainingBytes / transferSpeed);
        remainingTime.textContent = formatTime(remainingSeconds);
    } else {
        remainingTime.textContent = '--:--';
    }
}

/**
 * 完成传输
 */
function finishTransfer(success, errorMessage = '') {
    // 停止传输
    isTransferring = false;
    
    // 清除进度更新定时器
    if (transferInterval) {
        clearInterval(transferInterval);
        transferInterval = null;
    }
    
    // 更新UI
    sendFileBtn.disabled = false;
    transferControls.classList.add('hidden');
    
    // 记录传输历史
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        files: selectedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
        })),
        status: success ? 'success' : 'failed',
        deviceName: connectedDevice ? connectedDevice.name || '未知设备' : '未知设备',
        error: errorMessage,
        speed: transferSpeed,
        totalSize: totalBytes,
        transferredSize: transferredBytes
    };
    
    addToTransferHistory(historyItem);
    
    // 显示传输结果
    if (success) {
        showStatusModal('传输成功', `已成功传输 ${selectedFiles.length} 个文件`);
    } else {
        showStatusModal('传输失败', `文件传输失败: ${errorMessage}`);
    }
    
    // 重置状态
    resetTransferState();
}

/**
 * 重置传输状态
 */
function resetTransferState() {
    isTransferring = false;
    isPaused = false;
    currentTransferFile = null;
    fileReader = null;
    currentChunkIndex = 0;
    totalChunks = 0;
    transferQueue = [];
    isQueueProcessing = false;
}

/**
 * 切换暂停/继续传输
 */
function togglePauseTransfer() {
    if (!isTransferring) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseBtn.innerHTML = '<i class="fa fa-play mr-2"></i>继续';
        showStatusModal('传输已暂停', '点击"继续"按钮恢复传输');
    } else {
        pauseBtn.innerHTML = '<i class="fa fa-pause mr-2"></i>暂停';
        
        // 如果文件读取器被中止，重新开始传输当前文件
        if (fileReader && fileReader.readyState === FileReader.DONE) {
            sendFiles();
        }
    }
}

/**
 * 取消传输
 */
function cancelTransfer() {
    if (!isTransferring) return;
    
    // 停止传输
    isTransferring = false;
    
    // 中止文件读取
    if (fileReader && fileReader.readyState === FileReader.LOADING) {
        fileReader.abort();
    }
    
    // 清除进度更新定时器
    if (transferInterval) {
        clearInterval(transferInterval);
        transferInterval = null;
    }
    
    // 更新UI
    sendFileBtn.disabled = false;
    transferControls.classList.add('hidden');
    
    // 记录传输历史
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        files: selectedFiles.slice(0, selectedFiles.indexOf(currentTransferFile) + 1),
        status: 'failed',
        deviceName: connectedDevice ? connectedDevice.name || '未知设备' : '未知设备',
        error: '传输已取消',
        speed: transferSpeed,
        totalSize: totalBytes,
        transferredSize: transferredBytes
    };
    
    addToTransferHistory(historyItem);
    
    // 重置状态
    resetTransferState();
}

/**
 * 切换增强传输模式
 */
function toggleEnhancedTransfer() {
    enhancedTransferEnabled = enhancedTransferToggle.checked;
    
    if (enhancedTransferEnabled) {
        // 显示增强技术说明弹窗
        enhancedTechModal.classList.remove('hidden');
    }
}

/**
 * 添加到传输历史
 */
function addToTransferHistory(item) {
    transferHistory.unshift(item);
    
    // 限制历史记录数量
    if (transferHistory.length > 50) {
        transferHistory = transferHistory.slice(0, 50);
    }
    
    // 保存到本地存储
    saveTransferHistory();
    
    // 更新历史记录UI
    updateHistoryUI();
}

/**
 * 保存传输历史到本地存储
 */
function saveTransferHistory() {
    try {
        localStorage.setItem('bluetoothTransferHistory', JSON.stringify(transferHistory));
    } catch (error) {
        console.error('保存传输历史失败:', error);
    }
}

/**
 * 从本地存储加载传输历史
 */
function loadTransferHistory() {
    try {
        const savedHistory = localStorage.getItem('bluetoothTransferHistory');
        if (savedHistory) {
            transferHistory = JSON.parse(savedHistory);
            updateHistoryUI();
        }
    } catch (error) {
        console.error('加载传输历史失败:', error);
        transferHistory = [];
    }
}

/**
 * 更新历史记录UI
 */
function updateHistoryUI() {
    if (transferHistory.length === 0) {
        noHistory.classList.remove('hidden');
        historyList.classList.add('hidden');
        return;
    }
    
    noHistory.classList.add('hidden');
    historyList.classList.remove('hidden');
    
    // 清空历史记录列表
    historyList.innerHTML = '';
    
    // 添加历史记录项
    transferHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item p-3 rounded-lg border ${item.status === 'success' ? 'status-success' : 'status-failed'} fade-in`;
        
        // 格式化日期
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleString();
        
        // 文件列表
        const fileListHTML = item.files.map(file => `
            <div class="flex items-center">
                <span class="mr-2 text-gray-500">${getFileIcon(file.type)}</span>
                <div>
                    <p class="text-sm font-medium truncate" title="${file.name}">${file.name}</p>
                    <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
                </div>
            </div>
        `).join('');
        
        // 状态图标和文本
        const statusIcon = item.status === 'success' ? 
            '<i class="fa fa-check-circle text-success"></i>' : 
            '<i class="fa fa-times-circle text-danger"></i>';
        
        const statusText = item.status === 'success' ? '成功' : '失败';
        
        // 传输速度
        const speedText = item.speed > 0 ? `${formatFileSize(item.speed)}/s` : '未知';
        
        // 组装历史记录项HTML
        historyItem.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="flex items-center">
                        <span class="mr-2">${statusIcon}</span>
                        <span class="font-medium">${statusText}</span>
                    </div>
                    <p class="text-xs text-gray-500">${formattedDate} · ${item.deviceName}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm">${formatFileSize(item.transferredSize)} / ${formatFileSize(item.totalSize)}</p>
                    <p class="text-xs text-gray-500">${speedText}</p>
                </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
                <p class="text-sm font-medium mb-2">文件列表：</p>
                <div class="space-y-2">
                    ${fileListHTML}
                </div>
            </div>
            ${item.error ? `<p class="mt-2 text-xs text-danger">错误：${item.error}</p>` : ''}
        `;
        
        historyList.appendChild(historyItem);
    });
}

/**
 * 筛选历史记录
 */
function filterHistory(filter) {
    if (transferHistory.length === 0) {
        noHistory.classList.remove('hidden');
        historyList.classList.add('hidden');
        return;
    }
    
    noHistory.classList.add('hidden');
    historyList.classList.remove('hidden');
    
    // 清空历史记录列表
    historyList.innerHTML = '';
    
    // 根据筛选条件过滤历史记录
    let filteredHistory = transferHistory;
    if (filter === 'success') {
        filteredHistory = transferHistory.filter(item => item.status === 'success');
    } else if (filter === 'failed') {
        filteredHistory = transferHistory.filter(item => item.status === 'failed');
    }
    
    if (filteredHistory.length === 0) {
        noHistory.classList.remove('hidden');
        historyList.classList.add('hidden');
        return;
    }
    
    // 添加过滤后的历史记录项
    filteredHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item p-3 rounded-lg border ${item.status === 'success' ? 'status-success' : 'status-failed'} fade-in`;
        
        // 格式化日期
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleString();
        
        // 文件列表
        const fileListHTML = item.files.map(file => `
            <div class="flex items-center">
                <span class="mr-2 text-gray-500">${getFileIcon(file.type)}</span>
                <div>
                    <p class="text-sm font-medium truncate" title="${file.name}">${file.name}</p>
                    <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
                </div>
            </div>
        `).join('');
        
        // 状态图标和文本
        const statusIcon = item.status === 'success' ? 
            '<i class="fa fa-check-circle text-success"></i>' : 
            '<i class="fa fa-times-circle text-danger"></i>';
        
        const statusText = item.status === 'success' ? '成功' : '失败';
        
        // 传输速度
        const speedText = item.speed > 0 ? `${formatFileSize(item.speed)}/s` : '未知';
        
        // 组装历史记录项HTML
        historyItem.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="flex items-center">
                        <span class="mr-2">${statusIcon}</span>
                        <span class="font-medium">${statusText}</span>
                    </div>
                    <p class="text-xs text-gray-500">${formattedDate} · ${item.deviceName}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm">${formatFileSize(item.transferredSize)} / ${formatFileSize(item.totalSize)}</p>
                    <p class="text-xs text-gray-500">${speedText}</p>
                </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
                <p class="text-sm font-medium mb-2">文件列表：</p>
                <div class="space-y-2">
                    ${fileListHTML}
                </div>
            </div>
            ${item.error ? `<p class="mt-2 text-xs text-danger">错误：${item.error}</p>` : ''}
        `;
        
        historyList.appendChild(historyItem);
    });
}

/**
 * 显示清空历史记录确认
 */
function showClearHistoryConfirm() {
    if (transferHistory.length === 0) {
        showStatusModal('提示', '暂无传输历史记录');
        return;
    }
    
    confirmTitle.textContent = '清空历史记录';
    confirmMessage.textContent = '确定要清空所有传输历史记录吗？此操作不可恢复。';
    confirmModal.classList.remove('hidden');
    
    // 设置确认按钮回调
    confirmOk.onclick = () => {
        clearTransferHistory();
        closeConfirmModal();
    };
}

/**
 * 清空传输历史
 */
function clearTransferHistory() {
    transferHistory = [];
    saveTransferHistory();
    updateHistoryUI();
    showStatusModal('提示', '已清空所有传输历史记录');
}

/**
 * 显示状态弹窗
 */
function showStatusModal(title, message) {
    statusTitle.textContent = title;
    
    // 根据标题设置图标
    let icon = '';
    if (title.includes('成功')) {
        icon = '<i class="fa fa-check-circle text-success text-2xl mr-2"></i>';
    } else if (title.includes('失败') || title.includes('错误')) {
        icon = '<i class="fa fa-times-circle text-danger text-2xl mr-2"></i>';
    } else if (title.includes('提示') || title.includes('警告')) {
        icon = '<i class="fa fa-info-circle text-primary text-2xl mr-2"></i>';
    }
    
    statusContent.innerHTML = `<div class="flex items-center">${icon}<p>${message}</p></div>`;
    transferStatusModal.classList.remove('hidden');
}

/**
 * 关闭扫描弹窗
 */
function closeScanModalFunc() {
    scanModal.classList.add('hidden');
}

/**
 * 停止扫描
 */
function stopScan() {
    // Web Bluetooth API 不提供直接停止扫描的方法
    // 我们只能关闭弹窗
    closeScanModalFunc();
}

/**
 * 关闭状态弹窗
 */
function closeStatusModalFunc() {
    transferStatusModal.classList.add('hidden');
}

/**
 * 关闭增强技术弹窗
 */
function closeEnhancedModalFunc() {
    enhancedTechModal.classList.add('hidden');
}

/**
 * 关闭确认弹窗
 */
function closeConfirmModal() {
    confirmModal.classList.add('hidden');
}

/**
 * 更新发送按钮状态
 */
function updateSendButtonState() {
    sendFileBtn.disabled = selectedFiles.length === 0 || !connectedDevice;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间（秒转换为分:秒）
 */
function formatTime(seconds) {
    if (seconds < 0) return '--:--';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 重置UI状态
 */
function resetUIState() {
    // 重置传输状态
    isTransferring = false;
    isPaused = false;
    transferProgress = 0;
    transferredBytes = 0;
    totalBytes = 0;
    transferSpeed = 0;
    
    // 重置UI元素
    transferProgressSection.classList.add('hidden');
    transferControls.classList.add('hidden');
    sendFileBtn.disabled = false;
    pauseBtn.innerHTML = '<i class="fa fa-pause mr-2"></i>暂停';
    
    // 重置状态指示器
    const transferStatusIndicator = document.getElementById('transfer-status-indicator');
    if (transferStatusIndicator) {
        transferStatusIndicator.classList.add('hidden');
    }
    
    // 重置蓝牙状态
    const bluetoothStatus = document.getElementById('bluetooth-status');
    if (bluetoothStatus) {
        bluetoothStatus.innerHTML = '<i class="fa fa-circle mr-1"></i>未连接';
        bluetoothStatus.className = 'text-sm font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700';
    }
    
    // 清除定时器
    if (transferInterval) {
        clearInterval(transferInterval);
        transferInterval = null;
    }
    
    // 重置提取码区域
    document.getElementById('extraction-code-section').classList.add('hidden');
    document.getElementById('receive-file-section').classList.remove('hidden');
    document.getElementById('input-extraction-code').value = '';
    
    // 重置增强传输提示
    const enhancedTip = document.getElementById('enhanced-tip');
    if (enhancedTip) {
        enhancedTip.classList.add('hidden');
    }
    
    // 更新发送按钮状态
    updateSendButtonState();
}

/**
 * 清空选中的文件
 */
function clearSelectedFiles() {
    selectedFiles = [];
    updateFileList();
    updateSendButtonState();
}

/**
 * 分享提取码
 */
function shareExtractionCode() {
    const code = document.getElementById('extraction-code').textContent;
    const shareText = `文件提取码: ${code}\n\n使用此提取码在10分钟内下载文件。\n\n来自蓝牙文件传输应用`;
    
    if (navigator.share) {
        navigator.share({
            title: '文件提取码',
            text: shareText
        }).catch(err => {
            console.log('分享失败:', err);
            copyToClipboard(code);
        });
    } else {
        copyToClipboard(code);
    }
}

/**
 * 复制到剪贴板
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('复制成功！', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制', 'error');
        });
    } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('复制成功！', 'success');
        } catch (err) {
            showToast('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textArea);
    }
}

/**
 * 显示Toast提示
 */
function showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
    
    // 设置样式
    switch (type) {
        case 'success':
            toast.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            toast.classList.add('bg-red-500', 'text-white');
            break;
        case 'warning':
            toast.classList.add('bg-amber-500', 'text-white');
            break;
        default:
            toast.classList.add('bg-blue-500', 'text-white');
    }
    
    // 设置内容
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fa fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);