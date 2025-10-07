// File Upload Component
import { formatFileSize, getFileIcon } from '../utils/helpers.js';

class FileUpload {
    constructor(options) {
        this.container = options.container;
        this.onFilesSelected = options.onFilesSelected;
        
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = [
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Spreadsheets
            'text/csv',
            'application/csv',
            'text/comma-separated-values',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/excel',
            'application/x-excel',
            'application/x-msexcel',
            'application/vnd.ms-office',
            // Images
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/tiff',
            'image/tif',
            'image/svg+xml',
            'image/x-icon',
            'image/vnd.microsoft.icon'
        ];
        
        this.selectedFiles = [];
        this.isDragOver = false;
        
        this.init();
    }
    
    init() {
        this.findElements();
        this.bindEvents();
        this.setupDragAndDrop();
    }
    
    findElements() {
        this.uploadZone = this.container.querySelector('#upload-zone');
        this.fileInput = this.container.querySelector('#file-input');
        this.uploadedFilesContainer = this.container.querySelector('#uploaded-files');
    }
    
    bindEvents() {
        // File input change
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }
        
        // Upload zone click
        if (this.uploadZone) {
            this.uploadZone.addEventListener('click', () => {
                this.triggerFileSelection();
            });
        }
        
        // Keyboard accessibility
        if (this.uploadZone) {
            this.uploadZone.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.triggerFileSelection();
                }
            });
        }
    }
    
    setupDragAndDrop() {
        if (!this.uploadZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Visual feedback for drag over
        this.uploadZone.addEventListener('dragenter', (e) => {
            this.handleDragEnter(e);
        });
        
        this.uploadZone.addEventListener('dragover', (e) => {
            this.handleDragOver(e);
        });
        
        this.uploadZone.addEventListener('dragleave', (e) => {
            this.handleDragLeave(e);
        });
        
        // Handle dropped files
        this.uploadZone.addEventListener('drop', (e) => {
            this.handleDrop(e);
        });
        
        // Also handle drag events on the document to show/hide upload area
        document.addEventListener('dragenter', (e) => {
            if (this.containsFiles(e.dataTransfer)) {
                this.show();
            }
        });
        
        document.addEventListener('dragleave', (e) => {
            // Check if we're leaving the document
            if (e.clientX === 0 && e.clientY === 0) {
                setTimeout(() => {
                    if (!this.isDragOver && this.selectedFiles.length === 0) {
                        this.hide();
                    }
                }, 100);
            }
        });
        
        document.addEventListener('drop', (e) => {
            this.isDragOver = false;
            if (this.selectedFiles.length === 0) {
                this.hide();
            }
        });
    }
    
    containsFiles(dataTransfer) {
        return dataTransfer && dataTransfer.types && 
               (dataTransfer.types.includes('Files') || dataTransfer.types.includes('application/x-moz-file'));
    }
    
    handleDragEnter(e) {
        this.isDragOver = true;
        this.uploadZone.classList.add('drag-over');
        this.show();
    }
    
    handleDragOver(e) {
        e.dataTransfer.dropEffect = 'copy';
        this.uploadZone.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        // Only remove drag-over class if we're leaving the upload zone entirely
        const rect = this.uploadZone.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            this.isDragOver = false;
            this.uploadZone.classList.remove('drag-over');
        }
    }
    
    handleDrop(e) {
        console.log('FileUpload: Drop event triggered');
        this.isDragOver = false;
        this.uploadZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        console.log('FileUpload: Dropped files:', files);
        this.handleFileSelection(files);
        
        // Add drop animation
        this.animateDropSuccess();
    }
    
    animateDropSuccess() {
        this.uploadZone.style.transform = 'scale(1.05)';
        this.uploadZone.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)';
        
        setTimeout(() => {
            this.uploadZone.style.transform = '';
            this.uploadZone.style.background = '';
        }, 200);
    }
    
    triggerFileSelection() {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }
    
    handleFileSelection(fileList) {
        const files = Array.from(fileList);
        const validFiles = [];
        const errors = [];
        
        console.log('FileUpload: Processing files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
        
        files.forEach(file => {
            console.log(`FileUpload: Validating file "${file.name}" (type: ${file.type}, size: ${file.size})`);
            const validation = this.validateFile(file);
            console.log(`FileUpload: Validation result for "${file.name}":`, validation);
            
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        });
        
        if (errors.length > 0) {
            console.log('FileUpload: Validation errors:', errors);
            this.showErrors(errors);
        }
        
        if (validFiles.length > 0) {
            this.addFiles(validFiles);
            this.showSuccess(`${validFiles.length} file(s) selected successfully`);
        }
        
        // Clear file input
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }
    
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `File too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(this.maxFileSize)}`
            };
        }
        
        // Check file type - also check by extension for Excel files
        const isValidMimeType = this.allowedTypes.includes(file.type);
        const isValidExtension = this.isValidFileExtension(file.name);
        
        // For Excel and CSV files, be more lenient with MIME type checking
        const isExcelOrCsv = this.isExcelOrCsvFile(file.name);
        const shouldAcceptByExtension = isExcelOrCsv && isValidExtension;
        
        if (!isValidMimeType && !shouldAcceptByExtension && !isValidExtension) {
            return {
                valid: false,
                error: `File type "${file.type}" not supported. Supported formats: PDF, Word, Excel, CSV, Images`
            };
        }
        
        // Check for duplicate files
        if (this.selectedFiles.some(existingFile => 
            existingFile.name === file.name && 
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified)) {
            return {
                valid: false,
                error: 'File already selected'
            };
        }
        
        return { valid: true };
    }
    
    isExcelOrCsvFile(fileName) {
        const excelCsvExtensions = ['.csv', '.xls', '.xlsx', '.xlsm', '.xlsb'];
        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return excelCsvExtensions.includes(extension);
    }
    
    isValidFileExtension(fileName) {
        const allowedExtensions = [
            '.pdf', '.doc', '.docx', '.txt',
            '.csv', '.xls', '.xlsx', '.xlsm', '.xlsb',
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg', '.ico'
        ];
        
        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return allowedExtensions.includes(extension);
    }
    
    addFiles(files) {
        this.selectedFiles = [...this.selectedFiles, ...files];
        this.updateDisplay();
        this.notifyFilesSelected();
    }
    
    removeFile(index) {
        if (index >= 0 && index < this.selectedFiles.length) {
            const removedFile = this.selectedFiles.splice(index, 1)[0];
            this.updateDisplay();
            this.notifyFilesSelected();
            
            this.showInfo(`Removed ${removedFile.name}`);
            
            // Hide if no files selected
            if (this.selectedFiles.length === 0) {
                this.hide();
            }
        }
    }
    
    clearFiles() {
        this.selectedFiles = [];
        this.updateDisplay();
        this.notifyFilesSelected();
        this.hide();
    }
    
    updateDisplay() {
        if (!this.uploadedFilesContainer) return;
        
        if (this.selectedFiles.length > 0) {
            this.uploadedFilesContainer.classList.add('visible');
            this.renderFileList();
        } else {
            this.uploadedFilesContainer.classList.remove('visible');
            this.uploadedFilesContainer.innerHTML = '';
        }
        
        this.updateUploadZoneText();
    }
    
    updateUploadZoneText() {
        if (!this.uploadZone) return;
        
        const textElement = this.uploadZone.querySelector('p');
        if (!textElement) return;
        
        if (this.selectedFiles.length > 0) {
            textElement.textContent = `${this.selectedFiles.length} file(s) selected. Drop more files or click to add.`;
        } else {
            textElement.textContent = 'Drag & drop files here or click to upload';
        }
    }
    
    renderFileList() {
        if (!this.uploadedFilesContainer) return;
        
        this.uploadedFilesContainer.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = this.createFileItem(file, index);
            this.uploadedFilesContainer.appendChild(fileItem);
        });
    }
    
    createFileItem(file, index) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.style.animationDelay = `${index * 0.1}s`;
        
        const iconClass = getFileIcon(file.type);
        const iconCategory = this.getFileIconCategory(file.type);
        const fileSize = formatFileSize(file.size);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon ${iconCategory}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                    <div class="file-type">${this.getFileTypeDescription(file.type)}</div>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-preview" data-index="${index}" title="Preview file">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="file-remove" data-index="${index}" title="Remove file">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Bind events
        const previewBtn = fileItem.querySelector('.file-preview');
        const removeBtn = fileItem.querySelector('.file-remove');
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.previewFile(file, index);
            });
        }
        
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeFile(index);
            });
        }
        
        return fileItem;
    }
    
    getFileIconCategory(mimeType) {
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
        if (mimeType.includes('image')) return 'image';
        if (mimeType.includes('text')) return 'text';
        return 'file';
    }
    
    getFileTypeDescription(mimeType) {
        const typeMap = {
            'application/pdf': 'PDF Document',
            'application/msword': 'Word Document',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
            'text/plain': 'Text File',
            'image/jpeg': 'JPEG Image',
            'image/jpg': 'JPG Image',
            'image/png': 'PNG Image',
            'image/gif': 'GIF Image',
            'image/webp': 'WebP Image'
        };
        
        return typeMap[mimeType] || 'Unknown File Type';
    }
    
    previewFile(file, index) {
        if (file.type.startsWith('image/')) {
            this.previewImage(file);
        } else if (file.type === 'text/plain') {
            this.previewText(file);
        } else if (file.type === 'application/pdf') {
            this.previewPDF(file);
        } else {
            this.showInfo(`Preview not available for ${this.getFileTypeDescription(file.type)}`);
        }
    }
    
    previewImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.showPreviewModal('Image Preview', `
                <div class="image-preview">
                    <img src="${e.target.result}" alt="${file.name}" style="max-width: 100%; max-height: 400px; object-fit: contain;">
                    <p><strong>File:</strong> ${file.name}</p>
                    <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                </div>
            `);
        };
        reader.readAsDataURL(file);
    }
    
    previewText(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const truncated = content.length > 1000 ? content.substring(0, 1000) + '...' : content;
            
            this.showPreviewModal('Text Preview', `
                <div class="text-preview">
                    <pre style="white-space: pre-wrap; max-height: 300px; overflow-y: auto; background: #f5f5f5; padding: 1rem; border-radius: 0.5rem;">${truncated}</pre>
                    <p><strong>File:</strong> ${file.name}</p>
                    <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                    ${content.length > 1000 ? '<p><em>Content truncated...</em></p>' : ''}
                </div>
            `);
        };
        reader.readAsText(file);
    }
    
    previewPDF(file) {
        this.showPreviewModal('PDF Preview', `
            <div class="pdf-preview">
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Type:</strong> PDF Document</p>
                <p><em>PDF preview requires external viewer. File is ready for upload.</em></p>
                <div style="text-align: center; margin-top: 1rem;">
                    <i class="fas fa-file-pdf" style="font-size: 4rem; color: #dc2626;"></i>
                </div>
            </div>
        `);
    }
    
    showPreviewModal(title, content) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('file-preview-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'file-preview-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="preview-title">${title}</h3>
                        <button class="modal-close" id="preview-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="preview-body">
                        ${content}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Bind close events
            const closeBtn = modal.querySelector('#preview-close');
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            });
        } else {
            // Update existing modal
            modal.querySelector('#preview-title').textContent = title;
            modal.querySelector('#preview-body').innerHTML = content;
        }
        
        modal.classList.add('active');
    }
    
    notifyFilesSelected() {
        if (this.onFilesSelected) {
            this.onFilesSelected(this.selectedFiles);
        }
    }
    
    show() {
        this.container.classList.add('visible');
    }
    
    hide() {
        if (this.selectedFiles.length === 0) {
            this.container.classList.remove('visible');
        }
    }
    
    toggle() {
        if (this.container.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    showErrors(errors) {
        const errorContainer = this.createStatusMessage('error', errors.join('<br>'));
        this.container.appendChild(errorContainer);
        
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.remove();
            }
        }, 5000);
    }
    
    showSuccess(message) {
        const successContainer = this.createStatusMessage('success', message);
        this.container.appendChild(successContainer);
        
        setTimeout(() => {
            if (successContainer.parentNode) {
                successContainer.remove();
            }
        }, 3000);
    }
    
    showInfo(message) {
        const infoContainer = this.createStatusMessage('info', message);
        this.container.appendChild(infoContainer);
        
        setTimeout(() => {
            if (infoContainer.parentNode) {
                infoContainer.remove();
            }
        }, 3000);
    }
    
    createStatusMessage(type, message) {
        const container = document.createElement('div');
        container.className = `status-message ${type}`;
        
        const iconMap = {
            error: 'fas fa-exclamation-triangle',
            success: 'fas fa-check-circle',
            info: 'fas fa-info-circle'
        };
        
        container.innerHTML = `
            <i class="${iconMap[type]}"></i>
            <span>${message}</span>
        `;
        
        return container;
    }
    
    // Public methods
    getSelectedFiles() {
        return this.selectedFiles;
    }
    
    hasFiles() {
        return this.selectedFiles.length > 0;
    }
    
    getFileCount() {
        return this.selectedFiles.length;
    }
    
    getTotalSize() {
        return this.selectedFiles.reduce((total, file) => total + file.size, 0);
    }
    
    reset() {
        this.selectedFiles = [];
        this.updateDisplay();
        this.hide();
    }
    
    // Method to programmatically add files
    addFile(file) {
        const validation = this.validateFile(file);
        if (validation.valid) {
            this.addFiles([file]);
            return true;
        } else {
            this.showErrors([`${file.name}: ${validation.error}`]);
            return false;
        }
    }
    
    // Method to set allowed file types
    setAllowedTypes(types) {
        this.allowedTypes = types;
    }
    
    // Method to set max file size
    setMaxFileSize(size) {
        this.maxFileSize = size;
    }
}

export default FileUpload;
