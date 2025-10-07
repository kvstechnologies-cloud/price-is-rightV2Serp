// Chat Interface Component
export class ChatInterface {
    constructor(options) {
        this.container = options.container;
        this.onSendMessage = options.onSendMessage;
        this.apiService = options.apiService;
        
        this.messagesContainer = null;
        this.inputElement = null;
        this.sendButton = null;
        this.attachButton = null;
        this.voiceButton = null;
        
        this.messages = [];
        this.isTyping = false;
        this.selectedFiles = [];
        
        this.init();
    }
    
    init() {
        this.findElements();
        this.bindEvents();
        this.setupAutoResize();
    }
    
    findElements() {
        this.messagesContainer = this.container.querySelector('#chat-messages');
        this.inputElement = this.container.querySelector('#chat-input');
        this.sendButton = this.container.querySelector('#send-btn');
        this.voiceButton = this.container.querySelector('#voice-btn');
        
        // Legacy elements that may not exist with new design
        this.attachButton = this.container.querySelector('#attach-btn');
        this.fileUploadArea = this.container.querySelector('#file-upload-area');
        this.uploadedFilesContainer = this.container.querySelector('#uploaded-files');
    }
    
    bindEvents() {
        // Send button click
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => {
                this.handleSendMessage();
            });
        }
        
        // Input keydown events
        if (this.inputElement) {
            this.inputElement.addEventListener('keydown', (e) => {
                this.handleInputKeydown(e);
            });
            
            this.inputElement.addEventListener('input', () => {
                this.handleInputChange();
            });
            
            this.inputElement.addEventListener('paste', (e) => {
                this.handlePaste(e);
            });
        }
        
        // Attach button click (legacy support)
        if (this.attachButton) {
            this.attachButton.addEventListener('click', () => {
                this.toggleFileUpload();
            });
        }
        
        // Voice button click
        if (this.voiceButton) {
            this.voiceButton.addEventListener('click', () => {
                this.handleVoiceInput();
            });
        }
        
        // File input change
        const fileInput = this.container.querySelector('#file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }
        
        // Drag and drop events
        this.setupDragAndDrop();
    }
    
    setupAutoResize() {
        if (this.inputElement) {
            this.inputElement.addEventListener('input', () => {
                this.autoResizeInput();
            });
        }
    }
    
    setupDragAndDrop() {
        const uploadZone = this.container.querySelector('#upload-zone');
        if (uploadZone) {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            // Highlight drop zone when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadZone.addEventListener(eventName, () => {
                    uploadZone.classList.add('drag-over');
                });
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                uploadZone.addEventListener(eventName, () => {
                    uploadZone.classList.remove('drag-over');
                });
            });
            
            // Handle dropped files
            uploadZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                this.handleFileSelection(files);
            });
        }
        
        // Also handle drag and drop on the entire chat area
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.fileUploadArea && !this.fileUploadArea.classList.contains('visible')) {
                this.showFileUpload();
            }
        });
    }
    
    handleInputKeydown(e) {
        // Send on Enter (but not Shift+Enter)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendMessage();
        }
        
        // Allow Shift+Enter for line breaks
        if (e.key === 'Enter' && e.shiftKey) {
            // Let the default behavior happen (new line)
            setTimeout(() => {
                this.autoResizeInput();
            }, 0);
        }
    }
    
    handleInputChange() {
        const hasText = this.inputElement.value.trim().length > 0;
        const hasFiles = this.selectedFiles.length > 0;
        
        // Enable/disable send button - button should be enabled when there's text OR files
        if (this.sendButton) {
            this.sendButton.disabled = !(hasText || hasFiles);
        }
        
        this.autoResizeInput();
    }

    // Method to sync button state with external file selection systems
    syncButtonState() {
        if (this.sendButton) {
            const hasText = this.inputElement.value.trim().length > 0;
            const hasFiles = this.selectedFiles.length > 0;
            this.sendButton.disabled = !(hasText || hasFiles);
        }
    }

    // Method to update button state when external files are selected
    updateButtonStateForExternalFiles(externalFiles) {
        if (this.sendButton) {
            const hasText = this.inputElement.value.trim().length > 0;
            const hasFiles = externalFiles && externalFiles.length > 0;
            this.sendButton.disabled = !(hasText || hasFiles);
        }
    }
    
    handlePaste(e) {
        // Handle pasted files (images)
        const items = e.clipboardData.items;
        const files = [];
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                files.push(file);
            }
        }
        
        if (files.length > 0) {
            this.handleFileSelection(files);
        }
    }
    
    autoResizeInput() {
        if (this.inputElement) {
            this.inputElement.style.height = 'auto';
            const scrollHeight = this.inputElement.scrollHeight;
            const maxHeight = 120; // max-height from CSS
            
            this.inputElement.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        }
    }
    
    handleSendMessage() {
        const message = this.inputElement.value.trim();
        const files = [...this.selectedFiles];
        
        if (!message && files.length === 0) return;
        
        // Clear input and files
        this.inputElement.value = '';
        this.selectedFiles = [];
        this.autoResizeInput();
        this.handleInputChange();
        
        // Send message
        this.onSendMessage(message, files);
    }
    
    handleFileSelection(fileList) {
        const files = Array.from(fileList);
        
        // Validate files
        const validFiles = files.filter(file => {
            return this.validateFile(file);
        });
        
        if (validFiles.length > 0) {
            this.selectedFiles = [...this.selectedFiles, ...validFiles];
            // File display now handled by AttachmentManager
            this.handleInputChange();
        }
    }
    
    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif'
        ];
        
        if (file.size > maxSize) {
            this.showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
            return false;
        }
        
        if (!allowedTypes.includes(file.type)) {
            this.showError(`File type "${file.type}" is not supported.`);
            return false;
        }
        
        return true;
    }
    
    displayUploadedFiles() {
        if (!this.uploadedFilesContainer) return;
        
        this.uploadedFilesContainer.innerHTML = '';
        
        if (this.selectedFiles.length > 0) {
            this.uploadedFilesContainer.classList.add('visible');
            
            this.selectedFiles.forEach((file, index) => {
                const fileItem = this.createFileItem(file, index);
                this.uploadedFilesContainer.appendChild(fileItem);
            });
        } else {
            this.uploadedFilesContainer.classList.remove('visible');
        }
    }
    
    createFileItem(file, index) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon ${this.getFileIconClass(file.type)}">
                    <i class="${this.getFileIcon(file.type)}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
            <button class="file-remove" data-index="${index}" title="Remove file">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add remove event listener
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', () => {
            this.removeFile(index);
        });
        
        return fileItem;
    }
    
    getFileIconClass(mimeType) {
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
        if (mimeType.includes('image')) return 'image';
        if (mimeType.includes('text')) return 'text';
        return 'file';
    }
    
    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        if (mimeType.includes('image')) return 'fas fa-file-image';
        if (mimeType.includes('text')) return 'fas fa-file-alt';
        return 'fas fa-file';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.displayUploadedFiles();
        this.handleInputChange();
        
        if (this.selectedFiles.length === 0) {
            this.hideFileUpload();
        }
    }
    
    clearUploadedFiles() {
        this.selectedFiles = [];
        this.displayUploadedFiles();
    }
    
    toggleFileUpload() {
        if (this.fileUploadArea.classList.contains('visible')) {
            this.hideFileUpload();
        } else {
            this.showFileUpload();
        }
    }
    
    showFileUpload() {
        if (this.fileUploadArea) {
            this.fileUploadArea.classList.add('visible');
        }
        if (this.attachButton) {
            this.attachButton.classList.add('active');
        }
    }
    
    hideFileUpload() {
        if (this.fileUploadArea && this.selectedFiles.length === 0) {
            this.fileUploadArea.classList.remove('visible');
        }
        if (this.attachButton) {
            this.attachButton.classList.remove('active');
        }
    }
    
    handleVoiceInput() {
        // Trigger voice modal
        const voiceModal = document.getElementById('voice-modal');
        if (voiceModal) {
            voiceModal.classList.add('active');
        }
    }
    
    addMessage(messageData) {
        const messageElement = this.createMessageElement(messageData);
        this.messagesContainer.appendChild(messageElement);
        this.messages.push(messageData);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Add entrance animation
        setTimeout(() => {
            messageElement.classList.add('fade-in');
        }, 10);
    }
    
    createMessageElement(messageData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageData.type}-message`;
        
        const avatarIcon = messageData.type === 'user' ? 'fas fa-user' : 'fas fa-cog';
        
        let filesHtml = '';
        if (messageData.files && messageData.files.length > 0) {
            const filesList = messageData.files.map(file => 
                `<span class="file-tag">📎 ${file.name}</span>`
            ).join('');
            filesHtml = `<div class="message-files">${filesList}</div>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content">
                ${this.formatMessageContent(messageData.content)}
                ${filesHtml}
            </div>
        `;
        
        return messageDiv;
    }
    
    formatMessageContent(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/• /g, '<br>• ');
    }
    
    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span>Assistant is typing...</span>
        `;
        
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        if (!this.isTyping) return;
        
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            // Add disabled class to stop dots animation
            typingIndicator.classList.add('typing-indicator-disabled');
            
            // Add disabled state styling before removing
            typingIndicator.style.opacity = '0.5';
            typingIndicator.style.filter = 'grayscale(100%)';
            typingIndicator.style.transition = 'all 0.3s ease';
            
            // Remove after showing disabled state
            setTimeout(() => {
                if (typingIndicator && typingIndicator.parentNode) {
                    typingIndicator.parentNode.removeChild(typingIndicator);
                }
            }, 500);
        }
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'status-message error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
        
        // Insert before input container
        const inputContainer = this.container.querySelector('.chat-input-container');
        inputContainer.parentNode.insertBefore(errorDiv, inputContainer);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'status-message success';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        // Insert before input container
        const inputContainer = this.container.querySelector('.chat-input-container');
        inputContainer.parentNode.insertBefore(successDiv, inputContainer);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
    
    handleResize() {
        // Handle responsive changes
        this.scrollToBottom();
    }
    
    reset() {
        // Clear messages except welcome message
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        this.messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            this.messagesContainer.appendChild(welcomeMessage);
        }
        
        // Clear input and files
        if (this.inputElement) {
            this.inputElement.value = '';
        }
        this.selectedFiles = [];
        this.clearUploadedFiles();
        this.hideFileUpload();
        this.hideTypingIndicator();
        
        this.messages = [];
        this.autoResizeInput();
        this.handleInputChange();
    }
    
    // Method to export chat history
    exportChatHistory() {
        const chatData = {
            timestamp: new Date().toISOString(),
            messages: this.messages
        };
        
        const blob = new Blob([JSON.stringify(chatData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Method to import chat history
    importChatHistory(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const chatData = JSON.parse(e.target.result);
                if (chatData.messages && Array.isArray(chatData.messages)) {
                    this.reset();
                    chatData.messages.forEach(message => {
                        this.addMessage(message);
                    });
                    this.showSuccess('Chat history imported successfully');
                } else {
                    throw new Error('Invalid chat history format');
                }
            } catch (error) {
                this.showError('Failed to import chat history: Invalid file format');
            }
        };
        
        reader.readAsText(file);
    }
}

export default ChatInterface;
