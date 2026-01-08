# 蓝牙文件传输网页应用

这是一个基于Web Bluetooth API的蓝牙文件传输网页应用，允许用户在支持Web Bluetooth API的浏览器中，通过蓝牙技术与其他蓝牙设备进行文件传输。

## 功能特点

- **文件选择**：支持选择本地任意格式文件（文档、图片、音频、视频等），展示文件名称、大小、格式等信息
- **蓝牙设备管理**：实现蓝牙设备的搜索、配对与连接功能，展示可连接的蓝牙设备列表
- **文件传输**：通过蓝牙将选中文件传输至已连接设备，实时展示传输进度（百分比、进度条）
- **蓝牙发送增强技术**：优化传输速度，提升文件蓝牙传输速率
- **传输控制**：支持暂停、继续、取消传输操作
- **传输记录**：记录历史传输记录，包括文件名、传输时间、传输状态、传输速度等信息，支持清空记录
- **错误处理**：提供完善的错误处理机制，包括设备连接失败提示、文件未选择时提示等
- **响应式设计**：适配手机、平板、桌面等不同尺寸设备

## 技术栈

- HTML5
- CSS3 (Tailwind CSS)
- JavaScript
- Web Bluetooth API

## 浏览器兼容性

Web Bluetooth API目前主要在Chrome、Edge等基于Chromium的浏览器中支持，且需要HTTPS环境。

- Chrome 56+ (Android)
- Chrome 70+ (macOS, Windows 10)
- Edge 79+ (Windows 10)

## 使用方法

1. 打开应用（确保使用支持Web Bluetooth API的浏览器）
2. 选择要传输的文件（点击或拖拽文件到文件选择区域）
3. 点击"搜索设备"按钮，选择并连接到目标蓝牙设备
4. 点击"发送文件"按钮开始传输
5. 可选：开启"增强传输"开关以提升传输速度
6. 传输完成后，可在"传输记录"区域查看历史记录

## 注意事项

1. 由于Web Bluetooth API的限制，实际传输速度可能受到蓝牙协议本身的限制
2. 某些设备可能需要特定的服务和特征UUID才能进行文件传输
3. 本应用在不支持Web Bluetooth API的浏览器中会显示兼容性提示
4. 由于安全限制，Web Bluetooth API通常需要在HTTPS环境下运行

## 本地开发

1. 克隆或下载本项目
2. 使用本地服务器（如Node.js的http-server、Python的http.server等）提供项目文件
3. 在支持Web Bluetooth API的浏览器中访问应用

示例（使用Python）：
```bash
cd web-bluetooth-file-transfer
python -m http.server 8000
```

然后在浏览器中访问 http://localhost:8000

## 许可证

MIT