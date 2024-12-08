document.addEventListener('DOMContentLoaded', () => {
    // 开场动画
    const splashScreen = document.getElementById('splashScreen');
    setTimeout(() => {
        splashScreen.style.display = 'none';
    }, 3500); // 3.5秒后完全移除动画

    // 主题切换功能
    const themeToggle = document.getElementById('themeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 初始化主题
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // 切换主题
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const resultsList = document.getElementById('resultsList');
    let compressedFiles = new Map(); // 存储压缩后的文件

    let originalImage = null;

    // 处理文件拖放
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#007AFF';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#C7C7CC';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#C7C7CC';
        const files = e.dataTransfer.files;
        processMultipleImages(files);
    });

    // 处理点击上传
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            processMultipleImages(files);
        }
    });

    // 处理质量滑块变化
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
        if (originalImage) {
            compressImage(originalImage, qualitySlider.value / 100);
        }
    });

    // 添加批量处理函数
    function processMultipleImages(files) {
        compressedFiles.clear();
        resultsList.innerHTML = '';
        downloadAllBtn.disabled = true;
        
        Array.from(files).forEach(file => {
            if (file.type.match('image.*')) {
                const resultItem = createResultItem(file);
                resultsList.appendChild(resultItem);
                processImage(file, resultItem);
            }
        });
    }

    function createResultItem(file) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <img class="preview" src="${URL.createObjectURL(file)}">
            <div class="result-info">
                <div class="filename">${file.name}</div>
                <div class="size-info">
                    原始大小：${formatFileSize(file.size)}<br>
                    压缩后：<span class="compressed-size">处理中...</span><br>
                    <span class="compression-ratio"></span>
                </div>
            </div>
            <button class="download-btn" disabled>下载</button>
        `;
        return item;
    }

    function processImage(file, resultItem) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                compressImage(img, file.name, resultItem);
            };
        };
        reader.readAsDataURL(file);
    }

    function compressImage(image, filename, resultItem) {
        const quality = qualitySlider.value / 100;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            compressedFiles.set(filename, blob);
            
            const sizeInfo = resultItem.querySelector('.size-info');
            const compressedSize = formatFileSize(blob.size);
            const ratio = ((1 - blob.size / image.width / image.height / 3) * 100).toFixed(1);
            
            sizeInfo.querySelector('.compressed-size').textContent = compressedSize;
            sizeInfo.querySelector('.compression-ratio').textContent = 
                `节省 ${ratio}% 空间`;

            const downloadBtn = resultItem.querySelector('.download-btn');
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.download = `compressed-${filename}`;
                link.href = url;
                link.click();
            };

            downloadAllBtn.disabled = false;
        }, 'image/jpeg', quality);
    }

    // 添加批量下载功能
    downloadAllBtn.addEventListener('click', () => {
        const zip = new JSZip();
        const promises = [];

        compressedFiles.forEach((blob, filename) => {
            promises.push(
                blob.arrayBuffer().then(buffer => {
                    zip.file(`compressed-${filename}`, buffer);
                })
            );
        });

        Promise.all(promises).then(() => {
            zip.generateAsync({ type: 'blob' }).then(content => {
                const link = document.createElement('a');
                link.download = 'compressed-images.zip';
                link.href = URL.createObjectURL(content);
                link.click();
            });
        });
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 