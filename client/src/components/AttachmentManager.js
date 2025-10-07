// ChatGPT-style Attachment Manager Component
class AttachmentManager {
    constructor(options) {
        this.container = options.container;
        this.onFilesSelected = options.onFilesSelected || (() => {});
        this.maxFiles = options.maxFiles || 10;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        
        this.attachedFiles = [];
        this.isExpanded = false;
        
        this.allowedTypes = {
            // Documents
            'application/pdf': { icon: 'fas fa-file-pdf', color: '#ef4444' },
            'application/msword': { icon: 'fas fa-file-word', color: '#2563eb' },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'fas fa-file-word', color: '#2563eb' },
            'application/vnd.ms-excel': { icon: 'fas fa-file-excel', color: '#10b981' },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'fas fa-file-excel', color: '#10b981' },
            
            // Images
            'image/jpeg': { icon: 'fas fa-file-image', color: '#f59e0b' },
            'image/jpg': { icon: 'fas fa-file-image', color: '#f59e0b' },
            'image/png': { icon: 'fas fa-file-image', color: '#f59e0b' },
            'image/gif': { icon: 'fas fa-file-image', color: '#f59e0b' },
            'image/webp': { icon: 'fas fa-file-image', color: '#f59e0b' },
            
            // Text
            'text/plain': { icon: 'fas fa-file-alt', color: '#64748b' },
            'text/csv': { icon: 'fas fa-file-csv', color: '#10b981' }
        };
        
        this.init();
    }
    
    init() {
        this.createElements();
        this.bindEvents();
        this.setupDragAndDrop();
    }
    
    createElements() {
        this.container.innerHTML = `
            <div class="attachment-manager">
                <!-- Attachment Button -->
                <div class="attachment-trigger">
                    <button class="attachment-btn" title="Add files" aria-label="Add files">
                        <i class="fas fa-paperclip"></i>
                    </button>
                </div>
                
                <!-- Attachment Panel -->
                <div class="attachment-panel">
                    <div class="attachment-options">
                        <button class="attachment-option" data-action="upload">
                            <i class="fas fa-upload"></i>
                            <span>Upload files</span>
                        </button>
                    </div>
                    
                    <!-- File Drop Zone -->
                    <div class="file-drop-zone">
                        <div class="drop-zone-content">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag & drop files here or click to upload</p>
                            <small>PDF, Word, Excel, Images (Max 10MB each)</small>
                        </div>
                        <input type="file" class="file-input" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp">
                    </div>
                    
                    <!-- Attached Files List -->
                    <div class="attached-files-list"></div>
                </div>
                
                <!-- Files Preview in Chat Input -->
                <div class="files-preview"></div>
            </div>
        `;
        
        this.attachmentBtn = this.container.querySelector('.attachment-btn');
        this.attachmentPanel = this.container.querySelector('.attachment-panel');
        this.fileInput = this.container.querySelector('.file-input');
        this.dropZone = this.container.querySelector('.file-drop-zone');
        this.attachedFilesList = this.container.querySelector('.attached-files-list');
        this.filesPreview = this.container.querySelector('.files-preview');
    }
    
    bindEvents() {
        // Toggle attachment panel
        this.attachmentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });
        
        // Upload option click
        const uploadOption = this.container.querySelector('[data-action="upload"]');
        uploadOption.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input
        });
        
        // Drop zone click
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target) && this.isExpanded) {
                this.closePanel();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded) {
                this.closePanel();
            }
        });
    }
    
    setupDragAndDrop() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.highlight(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.unhighlight(), false);
        });
        
        // Handle dropped files
        this.dropZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        }, false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    highlight() {
        this.dropZone.classList.add('dragover');
    }
    
    unhighlight() {
        this.dropZone.classList.remove('dragover');
    }
    
    togglePanel() {
        if (this.isExpanded) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }
    
    openPanel() {
        this.isExpanded = true;
        this.attachmentPanel.classList.add('expanded');
        this.attachmentBtn.classList.add('active');
        
        // Auto-focus on the drop zone
        setTimeout(() => {
            this.dropZone.focus();
        }, 100);
    }
    
    closePanel() {
        this.isExpanded = false;
        this.attachmentPanel.classList.remove('expanded');
        this.attachmentBtn.classList.remove('active');
    }
    
    handleFiles(files) {
        const validFiles = [];
        
        files.forEach(file => {
            if (this.validateFile(file)) {
                validFiles.push(file);
            }
        });
        
        if (validFiles.length > 0) {
            this.addFiles(validFiles);
            this.closePanel();
        }
    }
    
    validateFile(file) {
        // Check file type
        if (!this.allowedTypes[file.type]) {
            this.showError(`File type "${file.type}" is not supported. Please use PDF, Word, Excel, or image files.`);
            return false;
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showError(`File "${file.name}" is too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}.`);
            return false;
        }
        
        // Check maximum number of files
        if (this.attachedFiles.length >= this.maxFiles) {
            this.showError(`Maximum of ${this.maxFiles} files allowed.`);
            return false;
        }
        
        return true;
    }
    
    addFiles(files) {
        files.forEach(file => {
            const fileObj = {
                id: this.generateId(),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                preview: null
            };
            
            this.attachedFiles.push(fileObj);
            
            // Generate preview for images
            if (file.type.startsWith('image/')) {
                this.generateImagePreview(fileObj);
            }
        });
        
        this.updateDisplay();
        this.onFilesSelected(this.attachedFiles);
    }
    
    removeFile(fileId) {
        this.attachedFiles = this.attachedFiles.filter(f => f.id !== fileId);
        this.updateDisplay();
        this.onFilesSelected(this.attachedFiles);
    }
    
    updateDisplay() {
        this.updateFilesPreview();
        this.updateAttachedFilesList();
    }
    
    updateFilesPreview() {
        if (this.attachedFiles.length === 0) {
            this.filesPreview.innerHTML = '';
            this.filesPreview.style.display = 'none';
            return;
        }
        
        this.filesPreview.style.display = 'block';
        this.filesPreview.innerHTML = `
            <div class="files-preview-container">
                ${this.attachedFiles.map(file => `
                    <div class="file-preview-item" data-file-id="${file.id}">
                        <div class="file-preview-icon" style="color: ${this.allowedTypes[file.type]?.color || '#64748b'}">
                            <i class="${this.allowedTypes[file.type]?.icon || 'fas fa-file'}"></i>
                        </div>
                        <div class="file-preview-info">
                            <span class="file-name">${this.truncateFileName(file.name, 20)}</span>
                            <span class="file-size">${this.formatFileSize(file.size)}</span>
                        </div>
                        <button class="file-remove-btn" onclick="attachmentManager.removeFile('${file.id}')" title="Remove file">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    updateAttachedFilesList() {
        if (this.attachedFiles.length === 0) {
            this.attachedFilesList.innerHTML = '<p class="no-files-message">No files attached</p>';
            return;
        }
        
        this.attachedFilesList.innerHTML = `
            <div class="attached-files-header">
                <h4>Attached Files (${this.attachedFiles.length})</h4>
                <button class="clear-all-btn" onclick="attachmentManager.clearAll()">Clear All</button>
            </div>
            <div class="attached-files-grid">
                ${this.attachedFiles.map(file => `
                    <div class="attached-file-item" data-file-id="${file.id}">
                        <div class="file-icon" style="color: ${this.allowedTypes[file.type]?.color || '#64748b'}">
                            <i class="${this.allowedTypes[file.type]?.icon || 'fas fa-file'}"></i>
                        </div>
                        <div class="file-details">
                            <div class="file-name" title="${file.name}">${this.truncateFileName(file.name, 25)}</div>
                            <div class="file-meta">
                                <span class="file-size">${this.formatFileSize(file.size)}</span>
                                <span class="file-type">${this.getFileTypeLabel(file.type)}</span>
                            </div>
                        </div>
                        <button class="file-action-btn remove-btn" onclick="attachmentManager.removeFile('${file.id}')" title="Remove">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    generateImagePreview(fileObj) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fileObj.preview = e.target.result;
        };
        reader.readAsDataURL(fileObj.file);
    }
    
    clearAll() {
        this.attachedFiles = [];
        this.updateDisplay();
        this.onFilesSelected(this.attachedFiles);
    }
    
    getFiles() {
        return this.attachedFiles;
    }
    
    // Utility methods
    generateId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    truncateFileName(name, maxLength) {
        if (name.length <= maxLength) return name;
        const extension = name.split('.').pop();
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
        return truncatedName + '.' + extension;
    }
    
    getFileTypeLabel(mimeType) {
        const labels = {
            'application/pdf': 'PDF',
            'application/msword': 'Word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
            'application/vnd.ms-excel': 'Excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
            'image/jpeg': 'JPEG',
            'image/jpg': 'JPG',
            'image/png': 'PNG',
            'image/gif': 'GIF',
            'image/webp': 'WebP',
            'text/plain': 'Text',
            'text/csv': 'CSV'
        };
        return labels[mimeType] || 'File';
    }
    
    showError(message) {
        console.error('Attachment Error:', message);
        // You can integrate with a toast notification system here
        alert(message); // Temporary error display
    }
}

// Export for ES6 modules
export default AttachmentManager;