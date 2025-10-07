
class ChatGPTInterface {
    constructor(container) {
        this.container = container;
        this.selectedFiles = [];
        this.currentTolerance = '50';
        
        // Generate a unique instance ID for debugging
        this._instanceId = 'chatgpt_' + Math.random().toString(36).substr(2, 9);
        console.log('ChatGPTInterface: Creating new instance with ID:', this._instanceId);

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
    }

    ensurePopupElementsExist() {
        // Ensure all required popup elements exist in the DOM
        const requiredElements = [
            'attachment-popup',
            'cloud-storage-popup',
            'tools-popup',
            'add-btn',
            'tools-btn',
            'file-input',
            'selected-files',
            'priceTolerance',
            'drag-overlay'
        ];

        console.log('ChatGPTInterface: Checking for required elements...');
        const foundElements = {};
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            foundElements[id] = !!element;
            if (!element) {
                console.warn(`ChatGPTInterface: Required element '${id}' not found in DOM`);
            }
        });
        console.log('ChatGPTInterface: Element status:', foundElements);
    }

    addBtnClickHandler(attachmentPopup, toolsPopup, cloudStoragePopup, event) {
        event.stopPropagation();
        
        // Toggle attachment popup and hide others
        if (attachmentPopup) {
            attachmentPopup.classList.toggle('hidden');
            this.hidePopup(toolsPopup);
            this.hidePopup(cloudStoragePopup);
        }
    }

    bindEvents() {
    // Prevent multiple bindings
    if (this._eventsBound) {
        console.log('ChatGPTInterface: Events already bound, skipping...');
        return;
    }

    // Ensure popup elements exist before binding events
    this.ensurePopupElementsExist();

    const addBtn = document.getElementById('add-btn');
    const toolsBtn = document.getElementById('tools-btn');
    const attachmentPopup = document.getElementById('attachment-popup');
    const cloudStoragePopup = document.getElementById('cloud-storage-popup');
    const toolsPopup = document.getElementById('tools-popup');
    const fileInput = document.getElementById('file-input');

    console.log('ChatGPTInterface: Binding events for instance:', this._instanceId);
    console.log('ChatGPTInterface: Found elements:', {
        addBtn: !!addBtn,
        toolsBtn: !!toolsBtn,
        attachmentPopup: !!attachmentPopup,
        toolsPopup: !!toolsPopup,
        cloudStoragePopup: !!cloudStoragePopup,
        fileInput: !!fileInput
    });

    // Prevent duplicate listener by removing first
    if (addBtn) {
        addBtn.removeEventListener('click', this._addBtnHandler);
        this._addBtnHandler = (e) => {
            console.log('ChatGPTInterface: Add button clicked, instance:', this._instanceId);
            e.stopPropagation();
            this.togglePopup(attachmentPopup);
            this.hidePopup(toolsPopup);
            this.hidePopup(cloudStoragePopup);
        };
        addBtn.addEventListener('click', this._addBtnHandler);
        console.log('ChatGPTInterface: Add button event listener bound');
    } else {
        console.error('ChatGPTInterface: Add button not found!');
    }

    // Tools button click
    if (toolsBtn) {
        toolsBtn.removeEventListener('click', this._toolsBtnHandler);
        this._toolsBtnHandler = (e) => {
            console.log('ChatGPTInterface: Tools button clicked, instance:', this._instanceId);
            e.stopPropagation();
            this.togglePopup(toolsPopup);
            this.hidePopup(attachmentPopup);
            this.hidePopup(cloudStoragePopup);
        };
        toolsBtn.addEventListener('click', this._toolsBtnHandler);
        console.log('ChatGPTInterface: Tools button event listener bound');
    } else {
        console.error('ChatGPTInterface: Tools button not found!');
    }

    // Attachment popup items
    document.removeEventListener('click', this._docClickHandler);
    this._docClickHandler = (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        switch (action) {
            case 'add-files':
                console.log('ChatGPTInterface: Add files action triggered by instance:', this._instanceId);
                fileInput?.click();
                this.hideAllPopups();
                break;
            case 'add-from-apps':
                this.showPopup(cloudStoragePopup);
                break;
            case 'google-drive':
                this.connectGoogleDrive();
                this.hideAllPopups();
                break;
            case 'onedrive-personal':
                this.connectOneDrive('personal');
                this.hideAllPopups();
                break;
            case 'onedrive-work':
                this.connectOneDrive('work');
                this.hideAllPopups();
                break;
        }
    };
    document.addEventListener('click', this._docClickHandler);

    // File input change
    if (fileInput) {
        fileInput.removeEventListener('change', this._fileInputHandler);
        this._fileInputHandler = (e) => {
            console.log('ChatGPTInterface: File input change event, instance:', this._instanceId);
            this.handleFileSelection(Array.from(e.target.files));
        };
        fileInput.addEventListener('change', this._fileInputHandler);
    }

    // Price tolerance change
    const toleranceSelect = document.getElementById('priceTolerance');
    if (toleranceSelect) {
        toleranceSelect.removeEventListener('change', this._toleranceHandler);
        this._toleranceHandler = (e) => {
            this.currentTolerance = e.target.value;
            this.onToleranceChange(e.target.value);
        };
        toleranceSelect.addEventListener('change', this._toleranceHandler);
    }

    // Close popups when clicking outside
    document.removeEventListener('click', this._outsideClickHandler);
    this._outsideClickHandler = (e) => {
        if (!e.target.closest('.attachment-popup') &&
            !e.target.closest('.cloud-storage-popup') &&
            !e.target.closest('.tools-popup') &&
            !e.target.closest('#add-btn') &&
            !e.target.closest('#tools-btn')) {
            this.hideAllPopups();
        }
    };
    document.addEventListener('click', this._outsideClickHandler);

    // Keyboard shortcuts
    document.removeEventListener('keydown', this._escapeHandler);
    this._escapeHandler = (e) => {
        if (e.key === 'Escape') {
            this.hideAllPopups();
        }
    };
    document.addEventListener('keydown', this._escapeHandler);

    this._eventsBound = true;
}


    ensurePopupElementsExist() {
        // Check if required popup elements exist, create them if they don't
        const requiredElements = [
            'attachment-popup',
            'cloud-storage-popup', 
            'tools-popup',
            'add-btn',
            'tools-btn',
            'file-input'
        ];

        requiredElements.forEach(id => {
            if (!document.getElementById(id)) {
                console.warn(`ChatGPTInterface: Required element with id '${id}' not found`);
            }
        });
    }

    addBtnClickHandler(attachmentPopup, toolsPopup, cloudStoragePopup) {
        // Toggle attachment popup and hide others
        this.togglePopup(attachmentPopup);
        this.hidePopup(toolsPopup);
        this.hidePopup(cloudStoragePopup);
    }

    setupDragAndDrop() {
        // Prevent multiple setups
        if (this._dragDropSetup) {
            console.log('ChatGPTInterface: Drag and drop already setup, skipping...');
            return;
        }

        const dragOverlay = document.getElementById('drag-overlay');
        let dragCounter = 0;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Show overlay when dragging files over the window
        this._dragEnterHandler = (e) => {
            if (this.containsFiles(e.dataTransfer)) {
                dragCounter++;
                this.showDragOverlay();
            }
        };
        document.addEventListener('dragenter', this._dragEnterHandler);

        this._dragLeaveHandler = (e) => {
            if (this.containsFiles(e.dataTransfer)) {
                dragCounter--;
                if (dragCounter === 0) {
                    this.hideDragOverlay();
                }
            }
        };
        document.addEventListener('dragleave', this._dragLeaveHandler);

        this._dropHandler = (e) => {
            dragCounter = 0;
            this.hideDragOverlay();

            if (this.containsFiles(e.dataTransfer)) {
                const files = Array.from(e.dataTransfer.files);
                this.handleFileSelection(files);
            }
        };
        document.addEventListener('drop', this._dropHandler);

        this._dragDropSetup = true;
    }

    containsFiles(dataTransfer) {
        return dataTransfer && dataTransfer.types && 
               (dataTransfer.types.includes('Files') || dataTransfer.types.includes('application/x-moz-file'));
    }

    showDragOverlay() {
        const overlay = document.getElementById('drag-overlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    hideDragOverlay() {
        const overlay = document.getElementById('drag-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    togglePopup(popup) {
        if (popup) {
            const isHidden = popup.classList.contains('hidden');
            if (isHidden) {
                // Show popup - position it under the add button
                this.positionPopupUnderButton(popup);
            }
            popup.classList.toggle('hidden');
            console.log('ChatGPTInterface: Popup', popup.id, 'toggled to', popup.classList.contains('hidden') ? 'hidden' : 'visible');
        } else {
            console.error('ChatGPTInterface: togglePopup called with null/undefined popup');
        }
    }

    showPopup(popup) {
        if (popup) {
            // Position popup under the add button
            this.positionPopupUnderButton(popup);
            popup.classList.remove('hidden');
            console.log('ChatGPTInterface: Popup', popup.id, 'shown');
        } else {
            console.error('ChatGPTInterface: showPopup called with null/undefined popup');
        }
    }

    positionPopupUnderButton(popup) {
        const addBtn = document.getElementById('add-btn');
        if (!addBtn || !popup) return;

        // Get the add button's position
        const addBtnRect = addBtn.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate popup position - position below the button
        let popupTop = addBtnRect.bottom + 8; // 8px gap below the button
        let popupLeft = addBtnRect.left; // Align with left edge of button
        
        // Get popup dimensions (estimate if not visible)
        const popupWidth = 240; // width from CSS
        const popupHeight = 42; // clean height for 3 items without extra padding
        
        // Adjust position if popup would go off-screen
        if (popupLeft + popupWidth > viewportWidth) {
            popupLeft = viewportWidth - popupWidth - 16; // 16px margin from edge
        }
        
        // If not enough space below, position above the button
        if (popupTop + popupHeight > viewportHeight) {
            popupTop = addBtnRect.top - popupHeight - 8;
        }
        
        // Ensure popup doesn't go off the left edge
        if (popupLeft < 16) {
            popupLeft = 16;
        }
        
        // Set popup position
        popup.style.position = 'fixed';
        popup.style.top = `${popupTop}px`;
        popup.style.left = `${popupLeft}px`;
        popup.style.right = 'auto';
        popup.style.bottom = 'auto';
        popup.style.transform = 'none';
        
        console.log('ChatGPTInterface: Positioned popup under add button:', {
            addBtnRect: addBtnRect,
            popupTop: popupTop,
            popupLeft: popupLeft,
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight
        });
    }

    hidePopup(popup) {
        if (popup) {
            popup.classList.add('hidden');
            console.log('ChatGPTInterface: Popup', popup.id, 'hidden');
        } else {
            console.error('ChatGPTInterface: hidePopup called with null/undefined popup');
        }
    }

    hideAllPopups() {
        const popups = [
            document.getElementById('attachment-popup'),
            document.getElementById('cloud-storage-popup'),
            document.getElementById('tools-popup')
        ];

        popups.forEach(popup => this.hidePopup(popup));
    }

    handleFileSelection(files) {
        console.log('ChatGPTInterface: Processing files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
        console.log('ChatGPTInterface: Instance ID:', this._instanceId || 'not set');
        
        const validFiles = files.filter(file => {
            console.log(`ChatGPTInterface: Validating file "${file.name}" (type: ${file.type}, size: ${file.size})`);
            const isValid = this.validateFile(file);
            console.log(`ChatGPTInterface: Validation result for "${file.name}":`, isValid);
            return isValid;
        });

        if (validFiles.length > 0) {
            this.selectedFiles = [...this.selectedFiles, ...validFiles];
            this.displaySelectedFiles();
            this.onFilesSelected(this.selectedFiles);
            console.log('ChatGPTInterface: Files added successfully:', validFiles.map(f => f.name));
        } else {
            console.log('ChatGPTInterface: No valid files found');
        }
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // Check file size first
        if (file.size > maxSize) {
            this.showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
            return false;
        }

        // Check if it's an image file (all image types)
        const isImageFile = file.type.startsWith('image/') || this.isImageFileByExtension(file.name);
        
        // Check if it's a CSV or Excel file
        const isExcelOrCsv = this.isExcelOrCsvFile(file.name);
        
        // Check if it's a valid file type
        if (!isImageFile && !isExcelOrCsv) {
            this.showError(`File type not supported. Please upload images, CSV, or Excel files only.`);
            return false;
        }

        return true;
    }
    
    isImageFileByExtension(fileName) {
        const imageExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', 
            '.svg', '.ico', '.jfif', '.pjpeg', '.pjp', '.avif', '.heic', '.heif'
        ];
        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return imageExtensions.includes(extension);
    }
    
    isExcelOrCsvFile(fileName) {
        const excelCsvExtensions = ['.csv', '.xls', '.xlsx', '.xlsm', '.xlsb'];
        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return excelCsvExtensions.includes(extension);
    }
    
    isValidFileExtension(fileName) {
        const allowedExtensions = [
            // Images - all common image formats
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', 
            '.svg', '.ico', '.jfif', '.pjpeg', '.pjp', '.avif', '.heic', '.heif',
            // Spreadsheets
            '.csv', '.xls', '.xlsx', '.xlsm', '.xlsb'
        ];
        
        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return allowedExtensions.includes(extension);
    }

    displaySelectedFiles() {
        const filesContainer = document.querySelector('#selected-files .files-container');
        const selectedFilesDiv = document.getElementById('selected-files');

        if (!filesContainer || !selectedFilesDiv) return;

        if (this.selectedFiles.length > 0) {
            selectedFilesDiv.classList.remove('hidden');
            filesContainer.innerHTML = '';

            this.selectedFiles.forEach((file, index) => {
                const fileChip = this.createFileChip(file, index);
                filesContainer.appendChild(fileChip);
            });
        } else {
            selectedFilesDiv.classList.add('hidden');
        }
    }

    createFileChip(file, index) {
        const chip = document.createElement('div');
        chip.className = 'file-chip';

        const fileIcon = this.getFileIcon(file.type);

        chip.innerHTML = `
            <i class="${fileIcon}"></i>
            <span>${file.name}</span>
            <button class="remove-file" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add remove functionality
        const removeBtn = chip.querySelector('.remove-file');
        removeBtn.addEventListener('click', () => {
            this.removeFile(index);
        });

        return chip;
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fas fa-image';
        if (fileType === 'application/pdf') return 'fas fa-file-pdf';
        if (fileType.includes('word')) return 'fas fa-file-word';
        if (fileType === 'text/plain') return 'fas fa-file-alt';
        if (fileType === 'text/csv' || fileType === 'application/csv' || fileType === 'text/comma-separated-values') return 'fas fa-file-csv';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fas fa-file-excel';
        return 'fas fa-file';
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.displaySelectedFiles();
        this.onFilesSelected(this.selectedFiles);
        console.log('File removed, remaining files:', this.selectedFiles.map(f => f.name));
    }

    clearFiles() {
        this.selectedFiles = [];
        this.displaySelectedFiles();
        this.onFilesSelected(this.selectedFiles);
        console.log('All files cleared');
    }

    addFiles(files) {
        console.log('ChatGPTInterface: addFiles called with:', files);
        if (Array.isArray(files)) {
            this.handleFileSelection(files);
        } else {
            console.error('ChatGPTInterface: addFiles expects an array of files');
        }
    }

    // Cloud storage connections
    connectGoogleDrive() {
        this.showInfo('Google Drive integration will be available soon. For now, please use local file upload.');
        // TODO: Implement Google Drive API integration
    }

    connectOneDrive(type) {
        const typeLabel = type === 'personal' ? 'Personal' : 'Work/School';
        this.showInfo(`Microsoft OneDrive ${typeLabel} integration will be available soon. For now, please use local file upload.`);
        // TODO: Implement OneDrive API integration
    }

    // Callbacks
    onFilesSelected(files) {
        console.log('Files selected:', files);
        // This can be overridden by the parent component
    }

    onToleranceChange(tolerance) {
        console.log('Price tolerance changed:', tolerance);
        this.showSuccess(`Price tolerance set to ${tolerance}% (±${tolerance}%)`);
        // This can be overridden by the parent component
    }

    // Utility methods
    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to container
        const container = this.container || document.body;
        container.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }

    // Public API
    getSelectedFiles() {
        return this.selectedFiles;
    }

    getTolerance() {
        return this.currentTolerance;
    }

    setTolerance(tolerance) {
        this.currentTolerance = tolerance;
        const select = document.getElementById('priceTolerance');
        if (select) {
            select.value = tolerance;
        }
    }

    cleanup() {
        console.log('ChatGPTInterface: Starting cleanup for instance:', this._instanceId);
        
        // Remove all event listeners to prevent memory leaks and duplicate handlers
        const addBtn = document.getElementById('add-btn');
        const toolsBtn = document.getElementById('tools-btn');
        const fileInput = document.getElementById('file-input');
        const toleranceSelect = document.getElementById('priceTolerance');

        if (addBtn && this._addBtnHandler) {
            addBtn.removeEventListener('click', this._addBtnHandler);
        }

        if (toolsBtn && this._toolsBtnHandler) {
            toolsBtn.removeEventListener('click', this._toolsBtnHandler);
        }

        if (fileInput && this._fileInputHandler) {
            fileInput.removeEventListener('change', this._fileInputHandler);
        }

        if (toleranceSelect && this._toleranceHandler) {
            toleranceSelect.removeEventListener('change', this._toleranceHandler);
        }

        if (this._docClickHandler) {
            document.removeEventListener('click', this._docClickHandler);
        }

        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
        }

        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
        }

        // Clear drag and drop listeners
        if (this._dragEnterHandler) {
            document.removeEventListener('dragenter', this._dragEnterHandler);
        }

        if (this._dragLeaveHandler) {
            document.removeEventListener('dragleave', this._dragLeaveHandler);
        }

        if (this._dropHandler) {
            document.removeEventListener('drop', this._dropHandler);
        }

        // Reset the events bound flag
        this._eventsBound = false;
        this._dragDropSetup = false;
        
        console.log('ChatGPTInterface: Cleanup completed');
    }
}

// Export as default for ES6 modules
export default ChatGPTInterface;
