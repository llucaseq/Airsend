/**
 * 蓝牙文件传输应用模拟数据
 * 用于在不支持Web Bluetooth API的环境中演示应用功能
 */

// 模拟设备列表
const mockDevices = [
    {
        id: 'device1',
        name: '我的手机',
        gatt: {
            connect: async () => {
                console.log('模拟连接到设备:', '我的手机');
                return mockGATTServer;
            }
        }
    },
    {
        id: 'device2',
        name: '蓝牙耳机',
        gatt: {
            connect: async () => {
                console.log('模拟连接到设备:', '蓝牙耳机');
                return mockGATTServer;
            }
        }
    },
    {
        id: 'device3',
        name: '智能手表',
        gatt: {
            connect: async () => {
                console.log('模拟连接到设备:', '智能手表');
                return mockGATTServer;
            }
        }
    },
    {
        id: 'device4',
        name: '蓝牙音箱',
        gatt: {
            connect: async () => {
                console.log('模拟连接到设备:', '蓝牙音箱');
                return mockGATTServer;
            }
        }
    }
];

// 模拟GATT服务器
const mockGATTServer = {
    connected: true,
    getPrimaryService: async (serviceUUID) => {
        console.log('模拟获取服务:', serviceUUID);
        return mockService;
    },
    disconnect: () => {
        console.log('模拟断开GATT服务器连接');
        mockGATTServer.connected = false;
    }
};

// 模拟服务
const mockService = {
    getCharacteristic: async (characteristicUUID) => {
        console.log('模拟获取特征:', characteristicUUID);
        return mockCharacteristic;
    }
};

// 模拟特征
const mockCharacteristic = {
    writeValue: async (value) => {
        console.log('模拟写入数据，长度:', value.byteLength);
        // 模拟写入延迟
        await new Promise(resolve => setTimeout(resolve, 5));
        return true;
    },
    readValue: async () => {
        console.log('模拟读取数据');
        // 返回模拟数据
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, 42);
        return view;
    },
    startNotifications: async () => {
        console.log('模拟启用通知');
        return true;
    },
    stopNotifications: async () => {
        console.log('模拟停止通知');
        return true;
    }
};

// 模拟navigator.bluetooth
const mockBluetooth = {
    requestDevice: async (options) => {
        console.log('模拟请求蓝牙设备', options);
        
        // 显示模拟设备选择界面
        return new Promise((resolve, reject) => {
            // 创建模拟设备选择弹窗
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold">选择蓝牙设备</h3>
                        <button class="text-gray-500 hover:text-gray-700 close-modal">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                    <div class="mb-4">
                        <p class="mb-3">请选择要连接的蓝牙设备：</p>
                        <ul class="space-y-2 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded">
                            ${mockDevices.map(device => `
                                <li class="device-item p-2 rounded cursor-pointer hover:bg-blue-50 flex items-center justify-between">
                                    <div>
                                        <p class="font-medium">${device.name}</p>
                                        <p class="text-xs text-gray-500">ID: ${device.id}</p>
                                    </div>
                                    <i class="fa fa-bluetooth text-primary"></i>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="mt-4 flex justify-end">
                        <button class="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg close-modal">
                            取消
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 添加事件监听器
            modal.querySelectorAll('.device-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(mockDevices[index]);
                });
            });
            
            modal.querySelectorAll('.close-modal').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    reject(new Error('用户取消了设备选择'));
                });
            });
        });
    }
};

// 检测是否需要使用模拟数据
function shouldUseMockData() {
    // 如果浏览器不支持Web Bluetooth API，使用模拟数据
    return !navigator.bluetooth;
}

// 应用模拟数据
function applyMockData() {
    if (shouldUseMockData()) {
        console.log('使用模拟蓝牙数据');
        
        // 添加兼容性提示
        const compatibilityAlert = document.getElementById('compatibility-alert');
        if (compatibilityAlert) {
            compatibilityAlert.classList.remove('hidden');
            compatibilityAlert.classList.remove('bg-red-50', 'text-red-700', 'border-red-200');
            compatibilityAlert.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
            compatibilityAlert.querySelector('h3').textContent = '使用模拟蓝牙数据';
            compatibilityAlert.querySelector('p').textContent = '您的浏览器不支持Web Bluetooth API，正在使用模拟数据进行演示。';
        }
        
        // 模拟navigator.bluetooth
        navigator.bluetooth = mockBluetooth;
        
        // 模拟文件传输速度（更快）
        window.mockTransferSpeed = true;
    }
}

// 导出函数
window.applyMockData = applyMockData;
window.shouldUseMockData = shouldUseMockData;