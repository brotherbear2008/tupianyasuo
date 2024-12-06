document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewContainer = document.querySelector('.preview-container');
    const controls = document.querySelector('.controls');

    let currentFile = null;

    // 拖拽上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 质量滑块
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value + '%';
        if (currentFile) {
            compressImage(currentFile, e.target.value / 100);
        }
    });

    // 处理上传的文件
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件！');
            return;
        }
        
        if (file.size < 50 * 1024) {
            if (!confirm('这个图片已经很小了，压缩可能不会有明显效果。是否继续？')) {
                return;
            }
        }

        currentFile = file;
        originalSize.textContent = formatFileSize(file.size);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            compressImage(file, qualitySlider.value / 100);
            previewContainer.style.display = 'grid';
            controls.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // 压缩图片
    function compressImage(file, quality) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                console.log('Original dimensions:', img.width, 'x', img.height);
                console.log('Original type:', file.type);
                console.log('Original size:', file.size);
                
                let { width, height } = calculateNewDimensions(img.width, img.height);
                console.log('New dimensions:', width, 'x', height);
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                let mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                let compressionQuality = quality;
                
                // 处理JPEG图片
                if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                    compressionQuality = Math.min(quality, 0.9);
                    if (file.size > 1024 * 1024) {
                        compressionQuality = Math.min(compressionQuality, 0.8);
                    }
                    if (file.size > 2 * 1024 * 1024) {
                        compressionQuality = Math.min(compressionQuality, 0.7);
                    }
                }
                
                // 处理PNG图片
                if (file.type === 'image/png') {
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const hasTransparency = hasTransparentPixels(imageData);
                    
                    if (!hasTransparency) {
                        mimeType = 'image/jpeg';
                        compressionQuality = Math.min(quality, 0.9);
                    } else {
                        compressionQuality = Math.max(0.6, quality);
                    }
                }
                
                console.log('Using mime type:', mimeType);
                console.log('Using quality:', compressionQuality);
                
                canvas.toBlob((blob) => {
                    if (blob.size >= file.size) {
                        // 第一次压缩失败，尝试更激进的压缩
                        const aggressiveQuality = Math.min(compressionQuality * 0.5, 0.5);
                        canvas.toBlob((aggressiveBlob) => {
                            if (aggressiveBlob.size < file.size) {
                                updatePreview(aggressiveBlob);
                            } else if (mimeType === 'image/png') {
                                // PNG转换为JPEG尝试
                                canvas.toBlob((jpegBlob) => {
                                    updatePreview(jpegBlob.size < file.size ? jpegBlob : file);
                                }, 'image/jpeg', 0.7);
                            } else {
                                updatePreview(file);
                            }
                        }, mimeType, aggressiveQuality);
                    } else {
                        updatePreview(blob);
                    }
                }, mimeType, compressionQuality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 检查透明像素
    function hasTransparentPixels(imageData) {
        const data = imageData.data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 254) {
                return true;
            }
        }
        return false;
    }

    // 更新预览
    function updatePreview(blob) {
        compressedImage.src = URL.createObjectURL(blob);
        compressedSize.textContent = formatFileSize(blob.size);
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'compressed_' + currentFile.name;
            link.click();
        };
    }

    // 计算新尺寸
    function calculateNewDimensions(width, height) {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        
        if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
            return { width, height };
        }
        
        let ratio = width / height;
        
        if (width > MAX_WIDTH) {
            width = MAX_WIDTH;
            height = Math.round(width / ratio);
        }
        
        if (height > MAX_HEIGHT) {
            height = MAX_HEIGHT;
            width = Math.round(height * ratio);
        }
        
        return { width, height };
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 