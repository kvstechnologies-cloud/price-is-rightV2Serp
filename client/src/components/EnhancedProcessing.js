import { ProcessingResultsTable } from './ProcessingResultsTable.js';
import { ResultsSummary } from './ResultsSummary.js';

/**
 * Enhanced Processing Component
 * Handles Excel/CSV processing with intelligent field mapping and results display
 * Integrates with the "always show price" pipeline
 */
export class EnhancedProcessing {
    constructor(app) {
        this.app = app;
        this.currentFile = null;
        this.currentSessionId = null;
        this.currentResults = null;
        this.originalData = null; // Store original file data for Excel export
        this.processedSheetName = null; // Store the processed sheet name
        this.isImageUpload = false; // Track if current input is an image
        this.currentPage = 1;
        this.pageSize = 10;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.processingStartTime = null;
        
        this.init();
    }

    init() {
        // Defer event binding until elements are available
        setTimeout(() => {
            this.bindEvents();
            this.setupModals();
            this.setupPriceRangeDisplay();
        }, 100);
        
        // Also try to bind events when the enhanced results section becomes visible
        this.observeEnhancedResultsSection();
    }

    bindEvents() {
        // Only bind events for elements that should always be available
        const processingModeSelect = document.getElementById('processingMode');

        if (processingModeSelect) {
            processingModeSelect.addEventListener('change', (e) => {
                this.handleProcessingModeChange(e.target.value);
            });
        }

        console.log('✅ Enhanced Processing basic events bound');
    }

    setupPriceRangeDisplay() {
        // Add price range display functionality
        const toleranceInput = document.getElementById('priceTolerance');
        if (toleranceInput) {
            // Check if price range display already exists to prevent duplicates
            let priceRangeDisplay = document.getElementById('priceRangeDisplay');
            
            if (!priceRangeDisplay) {
                // Create price range display element only if it doesn't exist
                priceRangeDisplay = document.createElement('div');
                priceRangeDisplay.id = 'priceRangeDisplay';
                priceRangeDisplay.className = 'price-range-display';
                priceRangeDisplay.style.cssText = `
                    margin-top: 10px;
                    padding: 10px;
                    background-color: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    font-size: 14px;
                    color: #495057;
                `;
                
                // Insert after tolerance input
                toleranceInput.parentNode.insertBefore(priceRangeDisplay, toleranceInput.nextSibling);
            }
            
            // Add event listener for tolerance changes (only if not already added)
            if (!toleranceInput.hasAttribute('data-range-listener-added')) {
                toleranceInput.addEventListener('input', () => {
                    this.updatePriceRangeDisplay();
                });
                toleranceInput.setAttribute('data-range-listener-added', 'true');
            }
            
            // Initial update
            this.updatePriceRangeDisplay();
        }
    }

    updatePriceRangeDisplay() {
        const toleranceInput = document.getElementById('priceTolerance');
        const priceRangeDisplay = document.getElementById('priceRangeDisplay');
        
        if (!toleranceInput || !priceRangeDisplay) return;
        
        const tolerance = parseInt(toleranceInput.value);
        
        if (tolerance && tolerance > 0) {
            // Show example calculation
            const examplePrice = 100; // Use $100 as example
            const minPrice = examplePrice * (1 - tolerance / 100);
            const maxPrice = examplePrice * (1 + tolerance / 100);
            
            priceRangeDisplay.innerHTML = `
                <strong>📊 Price Range Preview:</strong><br>
                For a $${examplePrice} item with ${tolerance}% tolerance:<br>
                <span style="color: #28a745; font-weight: bold;">$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}</span><br>
                <small style="color: #6c757d;">This range will be used to search for replacement items</small>
            `;
        } else {
            priceRangeDisplay.innerHTML = `
                <span style="color: #dc3545;">⚠️ Please select a valid tolerance percentage</span>
            `;
        }
    }

    bindResultsEvents() {
        // Bind events for elements that only exist when results are displayed
        const downloadExcelBtn = document.getElementById('download-excel-btn');
        const clearResultsBtn = document.getElementById('clear-enhanced-results');

        console.log('🔍 Binding results events - Download button found:', !!downloadExcelBtn);
        console.log('🔍 Download button element:', downloadExcelBtn);

        if (downloadExcelBtn) {
            // Remove any existing event listeners to prevent duplicates
            downloadExcelBtn.replaceWith(downloadExcelBtn.cloneNode(true));
            const newDownloadBtn = document.getElementById('download-excel-btn');
            
            newDownloadBtn.addEventListener('click', (e) => {
                console.log('🔍 Download Excel button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.downloadResults('excel');
            });
            console.log('✅ Download Excel event listener added');
        } else {
            console.warn('⚠️ Download Excel button not found when binding results events');
        }
        
        if (clearResultsBtn) {
            // Remove any existing event listeners to prevent duplicates
            clearResultsBtn.replaceWith(clearResultsBtn.cloneNode(true));
            const newClearBtn = document.getElementById('clear-enhanced-results');
            
            newClearBtn.addEventListener('click', () => this.clearResults());
            console.log('✅ Clear results event listener added');
        } else {
            console.warn('⚠️ Clear results button not found when binding results events');
        }

        console.log('✅ Enhanced Processing results events bound');
    }

    observeEnhancedResultsSection() {
        // Create a MutationObserver to watch for when the enhanced results section becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.id === 'enhanced-results-section' && !target.classList.contains('hidden')) {
                        console.log('🔍 Enhanced results section became visible, binding results events...');
                        // Wait a bit for DOM to settle, then bind results events
                        setTimeout(() => {
                            this.bindResultsEvents();
                        }, 100);
                    }
                }
            });
        });

        // Start observing the enhanced results section
        const enhancedResultsSection = document.getElementById('enhanced-results-section');
        if (enhancedResultsSection) {
            observer.observe(enhancedResultsSection, {
                attributes: true,
                attributeFilter: ['class']
            });
            console.log('✅ Enhanced results section observer started');
        } else {
            console.warn('⚠️ Enhanced results section not found for observation');
        }
    }

    setupModals() {
        console.log('🔧 Setting up modals...');
        
        // Sheet selection modal
        const sheetModal = document.getElementById('sheet-selection-modal');
        const sheetClose = document.getElementById('sheet-selection-close');
        const cancelSheet = document.getElementById('cancel-sheet-selection');
        const confirmSheet = document.getElementById('confirm-sheet-selection');

        console.log('🔧 Sheet modal elements found:', {
            modal: !!sheetModal,
            close: !!sheetClose,
            cancel: !!cancelSheet,
            confirm: !!confirmSheet
        });

        if (sheetClose) {
            sheetClose.addEventListener('click', () => {
                console.log('🔧 Sheet close button clicked');
                this.hideSheetModal();
            });
        }
        if (cancelSheet) {
            cancelSheet.addEventListener('click', () => {
                console.log('🔧 Sheet cancel button clicked');
                this.hideSheetModal();
            });
        }
        if (confirmSheet) {
            confirmSheet.addEventListener('click', () => {
                console.log('🔧 Sheet confirm button clicked');
                this.hideSheetModal();
            });
        }

        // Field mapping modal
        const fieldModal = document.getElementById('field-mapping-modal');
        const fieldClose = document.getElementById('field-mapping-close');
        const cancelField = document.getElementById('cancel-field-mapping');
        const confirmField = document.getElementById('confirm-field-mapping');

        if (fieldClose) fieldClose.addEventListener('click', () => this.hideFieldMappingModal());
        if (cancelField) cancelField.addEventListener('click', () => this.hideFieldMappingModal());
        if (confirmField) confirmField.addEventListener('click', () => this.confirmFieldMapping());

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === sheetModal) {
                console.log('🔧 Clicked outside sheet modal, hiding...');
                this.hideSheetModal();
            }
            if (e.target === fieldModal) this.hideFieldMappingModal();
        });
        
        console.log('✅ Modal setup complete');
    }

    async processFile(file) {
        console.log('🚀 EnhancedProcessing.processFile called with:', file.name, file.type, file.size);
        this.currentFile = file;
        
        // Detect if this is an image upload
        this.isImageUpload = file.type.startsWith('image/') || 
                           file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/);
        
        console.log('🔍 Image upload detected:', this.isImageUpload);
        
        try {
            // Show loading indicator
            this.app.showLoading('🔄 Processing your inventory with AI pricing... This may take several minutes for large files.');
            
            if (this.isImageUpload) {
                console.log('📸 Processing image file directly');
                await this.processImageFile(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                console.log('📊 Processing Excel file, checking for multiple sheets...');
                
                // Check for multiple sheets
                const hasMultipleSheets = await this.checkForMultipleSheets(file);
                
                if (hasMultipleSheets) {
                    console.log('📄 Multiple sheets detected, showing sheet selection...');
                    await this.showSheetSelection(file);
                } else {
                    console.log('📄 Single sheet Excel file, processing directly');
                    await this.processExcelFile(file);
                }
            } else if (file.type === 'text/csv') {
                console.log('📄 Processing CSV file directly');
                await this.processCSVFile(file);
            } else {
                throw new Error(`Unsupported file type: ${file.type}`);
            }
        } catch (error) {
            console.error('❌ File processing error:', error);
            this.app.showError(`Processing failed: ${error.message}`);
        } finally {
            // Hide loading indicator (this will show disabled robot icon briefly)
            this.app.hideLoading();
        }
    }

    async checkForMultipleSheets(file) {
        try {
            const sheetInfo = await this.app.apiService.getSheetInfo(file);
            const responseData = sheetInfo.data;
            return responseData.type === 'sheet_selection' && responseData.sheets && responseData.sheets.length > 1;
        } catch (error) {
            console.error('Error checking sheets:', error);
            return false;
        }
    }

    async showSheetSelection(file) {
        try {
            const sheetInfo = await this.app.apiService.getSheetInfo(file);
            const responseData = sheetInfo.data;
            
            if (responseData.type === 'sheet_selection' && responseData.sheets) {
                this.showSheetSelectionModal(responseData.sheets);
            } else {
                // Fallback to direct processing
                await this.processExcelFile(file);
            }
        } catch (error) {
            console.error('Error showing sheet selection:', error);
            // Fallback to direct processing
            await this.processExcelFile(file);
        }
    }

    async processExcelFile(file) {
        try {
            // Show the active chat area first so results can be displayed
            const activeChatArea = document.getElementById('active-chat-area');
            if (activeChatArea) {
                activeChatArea.classList.remove('hidden');
                console.log('✅ Active chat area shown');
            } else {
                console.warn('⚠️ active-chat-area not found');
            }
            
            // Hide the welcome screen
            const welcomeScreen = document.getElementById('welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.classList.add('hidden');
                console.log('✅ Welcome screen hidden');
            }
            
            // CRITICAL FIX: For Excel files, we need to get sheet info first
            // This ensures we handle sheet selection properly before processing
            console.log('🔍 Getting sheet info for Excel file...');
            const sheetInfo = await this.app.apiService.getSheetInfo(file);
            const responseData = sheetInfo.data;
            
            if (responseData.type === 'sheet_selection' && responseData.sheets) {
                console.log('📄 Multiple sheets detected, showing sheet selection...');
                this.showSheetSelectionModal(responseData.sheets);
                return; // Don't proceed with processing until sheet is selected
            } else {
                console.log('📄 Single sheet or no sheet selection required, processing directly...');
                // Process directly
                console.log('⚙️ Calling processWithOptions...');
                await this.processWithOptions();
            }
        } catch (error) {
            console.error('Error processing Excel file:', error);
            throw error;
        }
    }

    async processCSVFile(file) {
        try {
            // Show the active chat area first so results can be displayed
            const activeChatArea = document.getElementById('active-chat-area');
          if (activeChatArea) {
                activeChatArea.classList.remove('hidden');
                console.log('✅ Active chat area shown');
            } else {
                console.warn('⚠️ active-chat-area not found');
            }
            
            // Hide the welcome screen
            const welcomeScreen = document.getElementById('welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.classList.add('hidden');
                console.log('✅ Welcome screen hidden');
            }
            
            // Process directly
            console.log('⚙️ Calling processWithOptions...');
            await this.processWithOptions();
        } catch (error) {
            console.error('Error processing CSV file:', error);
            throw error;
        }
    }

    async processImageFile(file) {
        try {
            // Show the active chat area first so results can be displayed
            const activeChatArea = document.getElementById('active-chat-area');
            if (activeChatArea) {
                activeChatArea.classList.remove('hidden');
                console.log('✅ Active chat area shown');
            } else {
                console.warn('⚠️ active-chat-area not found');
            }
            
            // Hide the welcome screen
            const welcomeScreen = document.getElementById('welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.classList.add('hidden');
                console.log('✅ Welcome screen hidden');
            }
            
            // Process image directly - no sheet selection or field mapping needed
            console.log('⚙️ Processing image file directly...');
            await this.processWithOptions();
        } catch (error) {
            console.error('Error processing image file:', error);
            throw error;
        }
    }

    showSheetSelectionModal(sheets) {
        console.log('🔍 showSheetSelectionModal called with sheets:', sheets);
        
        // Remove any existing dynamic modal
        const existingModal = document.getElementById('dynamic-sheet-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create a new modal dynamically to avoid CSS conflicts
        const modal = document.createElement('div');
        modal.id = 'dynamic-sheet-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e0e0e0;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Select Sheet to Process';
        title.style.margin = '0';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        `;
        closeBtn.onclick = () => this.hideSheetModal();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create body
        const body = document.createElement('div');
        body.style.marginBottom = '20px';
        
        const description = document.createElement('p');
        description.textContent = 'This Excel file contains multiple sheets. Please select one sheet to process:';
        description.style.margin = '0 0 15px 0';
        
        // Add selection status message
        const selectionStatus = document.createElement('div');
        selectionStatus.id = 'sheet-selection-status';
        selectionStatus.style.cssText = `
            padding: 10px;
            margin-bottom: 15px;
            background: #f0f8ff;
            border: 1px solid #b3d9ff;
            border-radius: 4px;
            font-size: 14px;
            color: #0066cc;
        `;
        selectionStatus.textContent = 'No sheet selected';
        
        const sheetList = document.createElement('div');
        sheetList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        // Populate sheet list
        sheets.forEach((sheet, index) => {
            const sheetItem = document.createElement('div');
            sheetItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'selected-sheet';
            radio.value = sheet;
            radio.id = `sheet-${index}`;
            
            console.log(`🔍 Created radio button for sheet ${index}:`, {
                name: radio.name,
                value: radio.value,
                id: radio.id,
                checked: radio.checked
            });
            
            const sheetInfo = document.createElement('div');
            const sheetName = document.createElement('div');
            sheetName.textContent = sheet;
            sheetName.style.fontWeight = '600';
            sheetInfo.appendChild(sheetName);
            
            sheetItem.appendChild(radio);
            sheetItem.appendChild(sheetInfo);
            
            // Add click handler
            sheetItem.onclick = () => {
                console.log(`🔍 Sheet item ${index} clicked:`, sheet);
                radio.checked = true;
                console.log(`🔍 Radio button ${index} checked:`, radio.checked);
                
                sheetList.querySelectorAll('div').forEach(s => {
                    s.style.borderColor = '#e0e0e0';
                    s.style.backgroundColor = 'transparent';
                });
                sheetItem.style.borderColor = 'var(--accent-color)';
                sheetItem.style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
                selectionStatus.textContent = `Selected sheet: ${sheet}`;
                
                console.log(`🔍 After click - Radio button ${index} checked:`, radio.checked);
                console.log(`🔍 After click - All radio buttons:`, Array.from(sheetList.querySelectorAll('input[name="selected-sheet"]')).map(r => ({ value: r.value, checked: r.checked })));
            };
            
            // Auto-select first sheet by default
            if (index === 0) {
                console.log(`🔍 Auto-selecting first sheet: ${sheet}`);
                radio.checked = true;
                sheetItem.style.borderColor = 'var(--accent-color)';
                sheetItem.style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
                // Update selection status
                const statusElement = document.getElementById('sheet-selection-status');
                if (statusElement) {
                    statusElement.textContent = `Selected sheet: ${sheet}`;
                }
                console.log(`🔍 First sheet auto-selected - Radio checked:`, radio.checked);
            }
            
            sheetList.appendChild(sheetItem);
        });
        
        body.appendChild(description);
        body.appendChild(selectionStatus);
        body.appendChild(sheetList);
        
        // Create footer
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            border: 1px solid #e0e0e0;
            background: white;
            border-radius: 4px;
            cursor: pointer;
        `;
        cancelBtn.onclick = () => this.hideSheetModal();
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm Selection';
        confirmBtn.style.cssText = `
            padding: 8px 16px;
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        confirmBtn.onclick = () => {
            console.log('🔍 Confirm button clicked');
            
            // Check if a sheet is selected before proceeding
            const selectedRadio = document.querySelector('input[name="selected-sheet"]:checked');
            console.log('🔍 Confirm: Selected radio found:', !!selectedRadio);
            console.log('🔍 Confirm: Selected radio value:', selectedRadio?.value);
            console.log('🔍 Confirm: All radio buttons:', document.querySelectorAll('input[name="selected-sheet"]'));
            
            if (selectedRadio) {
                console.log('🔍 Confirm: Proceeding with sheet:', selectedRadio.value);
                // Store the selected sheet name for Excel export
                this.processedSheetName = selectedRadio.value;
                // Process the file with the selected sheet
                this.processWithOptions({ selectedSheet: selectedRadio.value });
                this.hideSheetModal();
            } else {
                console.error('🔍 Confirm: No sheet selected, showing error');
                // Show error and don't close modal
                this.app.showError('Please select a sheet to process');
            }
        };
        
        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modalContent.appendChild(footer);
        modal.appendChild(modalContent);
        
        // Add to DOM
        document.body.appendChild(modal);
        
        console.log('🔍 Dynamic modal created and added to DOM');
        console.log('🔍 Modal element:', modal);
        console.log('🔍 Modal computed styles:', window.getComputedStyle(modal));
        
        // Final verification of radio button setup
        setTimeout(() => {
            const allRadios = document.querySelectorAll('input[name="selected-sheet"]');
            const checkedRadio = document.querySelector('input[name="selected-sheet"]:checked');
            console.log('🔍 Final verification - All radio buttons:', allRadios.length);
            console.log('🔍 Final verification - Checked radio:', checkedRadio?.value);
            console.log('🔍 Final verification - All radio values:', Array.from(allRadios).map(r => ({ value: r.value, checked: r.checked })));
        }, 100);
    }

    hideSheetModal() {
        console.log('🔍 hideSheetModal called');
        
        // Remove the dynamic modal
        const modal = document.getElementById('dynamic-sheet-modal');
        if (modal) {
            modal.remove();
            console.log('🔍 Dynamic modal removed');
        }
    }

    async processWithOptions(options = {}) {
        try {
            console.log('🚀 Starting enhanced processing with options:', options);
            
            if (!this.currentFile) {
                throw new Error('No file selected for processing');
            }

            // Start timing
            this.processingStartTime = Date.now();

            // Check file size and use enhanced processing for all files
            const fileSizeMB = this.currentFile.size / (1024 * 1024);
            const estimatedRecords = this.estimateRecordCount(this.currentFile);
            
            console.log(`📁 File size: ${fileSizeMB.toFixed(2)} MB, Estimated records: ${estimatedRecords}`);
            
            // ENHANCED PROCESSING: Use enhanced processing for all files to get correct status determination
            // The enhanced processing has fixes for field casing and status logic
            console.log(`📊 Processing file with ${estimatedRecords} estimated records using ENHANCED processing`);
            return await this.processEnhancedFile(options);
            
        } catch (error) {
            console.error('❌ Enhanced processing error:', error);
            this.app.hideLoading();
            
            if (error.name === 'TimeoutError') {
                this.app.showError('⏰ Processing timeout - Your inventory is large and needs more time. Please try again or contact support if the issue persists.');
            } else {
                this.app.showError('❌ Enhanced processing failed: ' + error.message);
            }
        }
    }
    
    // Estimate record count based on file size and type - IMPROVED FOR ACCURACY
    estimateRecordCount(file) {
        const fileSizeMB = file.size / (1024 * 1024);
        
        // More accurate estimation based on file type and your actual data
        if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            // Excel files: Your 143-record file is 0.04MB, so ~3500 records per MB
            // But be conservative and assume metadata overhead
            return Math.max(50, Math.round(fileSizeMB * 2000)); // Minimum 50 records for any Excel file
        } else {
            // CSV files: typically more compact
            return Math.max(20, Math.round(fileSizeMB * 1000)); // Minimum 20 records for any CSV file
        }
    }
    
    // REMOVED: Chunked processing method to eliminate 404 errors
    // All files now use optimized regular processing with backend batch optimization
    
    // Process enhanced files using enhanced processing endpoint
    async processEnhancedFile(options = {}) {
        console.log('🚀 Starting ENHANCED processing for file');
        
        try {
            // Show processing message
            this.app.showLoading('🔄 Processing your inventory with ENHANCED AI pricing... This may take several minutes for large files.');
            
            const tolerancePct = parseInt(document.getElementById('priceTolerance')?.value);
            if (!tolerancePct || tolerancePct <= 0) {
                this.app.showError('Please select a valid tolerance percentage');
                return;
            }
            
            const processingOptions = {
                tolerancePct,
                ...options
            };
            
            const result = await this.app.apiService.processEnhanced(this.currentFile, processingOptions);
            console.log('🔍 Enhanced processing result:', result);
            
            if (result.data.type === 'processing_complete') {
                this.app.hideLoading();
                this.app.showSuccess('✅ ENHANCED processing completed! Processed ' + result.data.processedRows + ' items.');
                
                // Validate the result data before displaying
                if (result.data.results && Array.isArray(result.data.results)) {
                    this.displayEnhancedResults(result.data);
                } else {
                    console.error('❌ Invalid result data structure:', result.data);
                    this.app.showError('❌ Processing completed but results data is invalid. Please try again.');
                }
            } else if (result.data.type === 'mapping_required') {
                console.log('🔍 Field mapping required detected:', result.data);
                console.log('🔍 Missing fields:', result.data.missingFields);
                console.log('🔍 Available headers:', result.data.availableHeaders);
                console.log('🔍 this.app context:', this.app);
                console.log('🔍 this context:', this);
                
                this.app.hideLoading();
                console.warn('⚠️ Field mapping required for: ' + result.data.missingFields.join(', ') + '. Please ensure your CSV/Excel file contains these columns. Note: Only Description, Quantity, and Purchase Price are required. Room is optional.');
                
                console.log('🔍 About to call showFieldMappingWizard...');
                console.log('🔍 showFieldMappingWizard method exists:', typeof this.showFieldMappingWizard);
                console.log('🔍 showFieldMappingWizard method:', this.showFieldMappingWizard);
                
                try {
                    this.showFieldMappingWizard(result.data.availableHeaders, result.data.missingFields);
                    console.log('🔍 showFieldMappingWizard called successfully');
                } catch (error) {
                    console.error('❌ Error calling showFieldMappingWizard:', error);
                }
                
                // Fallback: Ensure the modal appears even if there are issues
                setTimeout(() => {
                    const modal = document.getElementById('dynamic-field-mapping-modal');
                    if (!modal) {
                        console.log('🔍 Modal not found after 500ms, trying again...');
                        try {
                            this.showFieldMappingWizard(result.data.availableHeaders, result.data.missingFields);
                        } catch (error) {
                            console.error('❌ Error in fallback showFieldMappingWizard:', error);
                        }
                    } else {
                        console.log('🔍 Modal found and should be visible');
                        console.log('🔍 Modal element:', modal);
                        console.log('🔍 Modal computed styles:', window.getComputedStyle(modal));
                    }
                }, 500);
                
                // Additional fallback: Check if modal exists after 1 second
                setTimeout(() => {
                    const modal = document.getElementById('dynamic-field-mapping-modal');
                    if (!modal) {
                        console.error('❌ CRITICAL: Field mapping modal still not found after 1 second!');
                        console.error('❌ This indicates a serious issue with modal creation');
                        
                        // Try to create a simple alert as last resort
                        alert('Field mapping required. Please refresh the page and try again, or contact support.');
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Enhanced processing error:', error);
            this.app.hideLoading();
            
            if (error.name === 'TimeoutError') {
                this.app.showError('⏰ Processing timeout - Your inventory is large and needs more time. Please try again or contact support if the issue persists.');
            } else {
                this.app.showError('❌ Enhanced processing failed: ' + error.message);
            }
        }
    }

    // Process regular files using existing method (kept for fallback)
    async processRegularFile(options = {}) {
        console.log('🚀 Starting regular processing for small file');
        
        try {
            // Show processing message
            this.app.showLoading('🔄 Processing your inventory with AI pricing... This may take several minutes for large files.');
            
            const tolerancePct = parseInt(document.getElementById('priceTolerance')?.value);
            if (!tolerancePct || tolerancePct <= 0) {
                this.app.showError('Please select a valid tolerance percentage');
                return;
            }
            
            const processingOptions = {
                tolerancePct,
                ...options
            };
            
            const result = await this.app.apiService.processEnhanced(this.currentFile, processingOptions);
            console.log('🔍 Enhanced processing result:', result);
            
            if (result.data.type === 'processing_complete') {
                this.app.hideLoading();
                this.app.showSuccess('✅ Enhanced processing completed! Processed ' + result.data.processedRows + ' items.');
                
                // Validate the result data before displaying
                if (result.data.results && Array.isArray(result.data.results)) {
                    this.displayEnhancedResults(result.data);
                } else {
                    console.error('❌ Invalid result data structure:', result.data);
                    this.app.showError('❌ Processing completed but results data is invalid. Please try again.');
                }
            } else if (result.data.type === 'mapping_required') {
                console.log('🔍 Field mapping required detected:', result.data);
                console.log('🔍 Missing fields:', result.data.missingFields);
                console.log('🔍 Available headers:', result.data.availableHeaders);
                console.log('🔍 this.app context:', this.app);
                console.log('🔍 this context:', this);
                
                this.app.hideLoading();
                console.warn('⚠️ Field mapping required for: ' + result.data.missingFields.join(', ') + '. Please ensure your CSV/Excel file contains these columns. Note: Only Description, Quantity, and Purchase Price are required. Room is optional.');
                
                console.log('🔍 About to call showFieldMappingWizard...');
                console.log('🔍 showFieldMappingWizard method exists:', typeof this.showFieldMappingWizard);
                console.log('🔍 showFieldMappingWizard method:', this.showFieldMappingWizard);
                
                try {
                    this.showFieldMappingWizard(result.data.availableHeaders, result.data.missingFields);
                    console.log('🔍 showFieldMappingWizard called successfully');
                } catch (error) {
                    console.error('❌ Error calling showFieldMappingWizard:', error);
                }
                
                // Fallback: Ensure the modal appears even if there are issues
                setTimeout(() => {
                    const modal = document.getElementById('dynamic-field-mapping-modal');
                    if (!modal) {
                        console.log('🔍 Modal not found after 500ms, trying again...');
                        try {
                            this.showFieldMappingWizard(result.data.availableHeaders, result.data.missingFields);
                        } catch (error) {
                            console.error('❌ Error in fallback showFieldMappingWizard:', error);
                        }
                    } else {
                        console.log('🔍 Modal found and should be visible');
                        console.log('🔍 Modal element:', modal);
                        console.log('🔍 Modal computed styles:', window.getComputedStyle(modal));
                    }
                }, 500);
                
                // Additional fallback: Check if modal exists after 1 second
                setTimeout(() => {
                    const modal = document.getElementById('dynamic-field-mapping-modal');
                    if (!modal) {
                        console.error('❌ CRITICAL: Field mapping modal still not found after 1 second!');
                        console.error('❌ This indicates a serious issue with modal creation');
                        
                        // Try to create a simple alert as last resort
                        alert('Field mapping required. Please refresh the page and try again, or contact support.');
                    }
                }, 1000);
            } else {
                console.error('❌ Unexpected result type:', result.data.type);
                this.app.hideLoading();
                this.app.showError('❌ Unexpected processing result. Please try again.');
            }
        } catch (error) {
            console.error('❌ Enhanced processing error:', error);
            this.app.hideLoading();
            
            if (error.name === 'TimeoutError') {
                this.app.showError('⏰ Processing timeout - Your inventory is large and needs more time. Please try again or contact support if the issue persists.');
            } else {
                this.app.showError('❌ Enhanced processing failed: ' + error.message);
            }
        }
    }


    displayEnhancedResults(result) {
        console.log('🔍 displayEnhancedResults called with:', result);
        
        // CRITICAL FIX: Remove any remaining progress indicators
        const progressDiv = document.getElementById('processing-progress');
        if (progressDiv && progressDiv.parentNode) {
            progressDiv.parentNode.removeChild(progressDiv);
        }
        
        // Also remove any loading messages
        const loadingMessages = document.querySelectorAll('.loading-message');
        loadingMessages.forEach(msg => {
            if (msg.textContent.includes('Processing')) {
                msg.style.display = 'none';
            }
        });
        
        // Try to find DOM elements with retry mechanism
        const findElements = () => {
            const container = document.getElementById('enhanced-results-content');
            const section = document.getElementById('enhanced-results-section');
            const summaryContainer = document.querySelector('.processing-results-summary');
            
            console.log('🔍 DOM elements found:', { 
                container: !!container, 
                section: !!section,
                summaryContainer: !!summaryContainer,
                containerId: container?.id,
                sectionId: section?.id
            });
            
            return { container, section, summaryContainer };
        };
        
        let { container, section, summaryContainer } = findElements();
        
        // If elements not found, wait a bit and try again
        if (!container || !section) {
            console.log('⏳ DOM elements not ready, waiting 100ms...');
            setTimeout(() => {
                try {
                    const retryElements = findElements();
                    if (retryElements.container && retryElements.section) {
                        this.displayEnhancedResults(result);
                    } else {
                        console.error('❌ DOM elements still not found after retry');
                        this.app.showError('Enhanced results section not found. Please refresh the page.');
                    }
                } catch (error) {
                    console.error('❌ Error during DOM retry:', error);
                    this.app.showError('Error displaying results. Please refresh the page.');
                }
            }, 100);
            return;
        }
        
        console.log('✅ All required DOM elements found, proceeding with display');
        
        // Remove hidden class and force visibility
        section.classList.remove('hidden');
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        
        // CRITICAL: Ensure proper spacing to prevent display cutting
        this.ensureProperSpacing(section);
        
        // FIXED: Ensure pagination is visible and working
        this.ensurePaginationVisibility(section);
        
        // FIXED: Additional delayed check for pagination
        setTimeout(() => {
            this.forcePaginationVisibility(section);
        }, 1000);
        
        // FIXED: Initialize pagination after table rendering
        setTimeout(() => {
            this.initializePagination(section);
        }, 1500);
        
        // FIXED: Test pagination functionality
        setTimeout(() => {
            this.testPaginationFunctionality(section);
        }, 2000);
        
        // Hide legacy results if visible
        document.getElementById('results-section')?.classList.add('hidden');
        
        // Extract the results array from the response
        const resultsArray = result.results || result.data?.results || [];
        console.log('🔍 Results array extracted:', resultsArray.length, 'items');
        
        if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
            console.error('❌ No valid results to display');
            this.app.showError('No results to display. Please try processing again.');
            return;
        }
        
        // Transform results to match the new pipeline format if needed
        const transformedResults = this.transformResultsForNewPipeline(resultsArray);
        console.log('🔍 Transformed results:', transformedResults.length, 'items');
        
        // CRITICAL FIX: Properly initialize and use ProcessingResultsTable
        if (!this.resultsTable) {
            this.resultsTable = new ProcessingResultsTable(container);
            console.log('✅ ProcessingResultsTable initialized');
        }
        
        // Display results using the ProcessingResultsTable component
        this.resultsTable.displayResults(transformedResults);
        console.log('✅ Results displayed via ProcessingResultsTable');
        
        // Update summary using the built-in summary cards in the HTML
        const processingTime = this.processingStartTime ? Date.now() - this.processingStartTime : 0;
        this.updateSummaryCards({ 
            data: transformedResults, 
            timing: { 
                totalProcessingTimeMinutes: Math.floor(processingTime / 60000),
                totalProcessingTimeSeconds: Math.floor(processingTime / 1000)
            }
        });
        
        // Store results for download functionality
        this.currentResults = {
            results: transformedResults,
            originalResult: result,
            jobId: result.jobId // Store the jobId for Excel export
        };
        
        // CRITICAL: Bind download and clear button events now that results are displayed
        setTimeout(() => {
            this.bindResultsEvents();
        }, 100);
        
        console.log('✅ Enhanced results displayed successfully with ProcessingResultsTable');
        console.log('✅ Current results stored:', this.currentResults);
        
        // Force scroll to section
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('✅ Scrolled to enhanced results section');
            
            // Additional scroll fix to prevent cutting
            setTimeout(() => {
                // Ensure we're showing the full results section
                const windowHeight = window.innerHeight;
                const sectionRect = section.getBoundingClientRect();
                const sectionHeight = sectionRect.height;
                
                // If section is too tall for viewport, scroll to show more content
                if (sectionHeight > windowHeight * 0.8) {
                    window.scrollBy({
                        top: 100,
                        behavior: 'smooth'
                    });
                }
                
                // Force a small scroll to ensure proper positioning
                window.scrollBy({
                    top: 20,
                    behavior: 'smooth'
                });
                
                // FIXED: Additional scroll to ensure pagination is visible
                setTimeout(() => {
                    const paginationElements = section.querySelectorAll('.enhanced-pagination');
                    if (paginationElements.length > 0) {
                        const lastPagination = paginationElements[paginationElements.length - 1];
                        lastPagination.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        console.log('✅ Scrolled to show pagination');
                    }
                }, 200);
                
                console.log('✅ Applied additional scroll fixes to prevent cutting');
            }, 300);
        }, 500);
    }

    /**
     * Transform legacy results to match the new always show price pipeline format
     */
    transformResultsForNewPipeline(resultsArray) {
        return resultsArray.map((item, index) => {
            // Debug logging for image processing results
            console.log('🔍 EnhancedProcessing - transformResultsForNewPipeline - item:', item);
            console.log('🔍 EnhancedProcessing - transformResultsForNewPipeline - item.pricingTier:', item.pricingTier);
            console.log('🔍 EnhancedProcessing - transformResultsForNewPipeline - item.status:', item.status);
            
            // Extract existing data
            const description = item.Description || item.description || item['Item Description'] || 'Unknown Item';
            const status = item.Status || item.status || item['Search Status'] || 'ESTIMATED';
            const source = item.Source || item.source || item.replacementSource || '';
            const price = item.Price || item.price || item.replacementPrice;
            const totalPrice = item['Total Replacement Price'] || item.totalReplacementPrice || price;
            
            // CRITICAL DEBUG: Log the item data to see what we're receiving
            console.log(`🔍 DEBUG: Frontend received item for "${description}":`, {
                itemKeys: Object.keys(item),
                Price: item.Price,
                price: item.price,
                replacementPrice: item.replacementPrice,
                'Total Replacement Price': item['Total Replacement Price'],
                totalReplacementPrice: item.totalReplacementPrice,
                finalPrice: price,
                finalTotalPrice: totalPrice
            });
            const url = item.URL || item.url || '';
            
            // Determine pricing tier based on existing data
            // CRITICAL FIX: Preserve backend pricingTier if available (for image processing)
            let pricingTier = item.pricingTier || 'BASELINE';
            let confidence = item.confidence || 0.5;
            
            // Only override pricingTier if backend didn't provide one (legacy CSV processing)
            if (!item.pricingTier) {
                if (status === 'Found' || status === 'Price Found') {
                    if (source && source !== 'N/A' && source !== 'Market Search') {
                        pricingTier = 'SERP';
                        confidence = 0.8;
                    } else {
                        pricingTier = 'FALLBACK';
                        confidence = 0.7;
                    }
                } else if (status === 'Estimated' || status === 'Price Estimated') {
                    pricingTier = 'AGGREGATED';
                    confidence = 0.6;
                }
            }
            
            // Ensure we always have a numeric price (never N/A)
            let adjustedPrice = 1.00; // Minimum price
            if (typeof price === 'number' && price > 0) {
                adjustedPrice = price;
            } else if (typeof price === 'string') {
                const numericPrice = parseFloat(price.replace(/[$,]/g, ''));
                if (!isNaN(numericPrice) && numericPrice > 0) {
                    adjustedPrice = numericPrice;
                }
            }
            
            // Calculate total price
            let totalAdjustedPrice = adjustedPrice;
            if (typeof totalPrice === 'number' && totalPrice > 0) {
                totalAdjustedPrice = totalPrice;
            } else if (typeof totalPrice === 'string') {
                const numericTotalPrice = parseFloat(totalPrice.replace(/[$,]/g, ''));
                if (!isNaN(numericTotalPrice) && numericTotalPrice > 0) {
                    totalAdjustedPrice = numericTotalPrice;
                }
            }
            
            // Debug logging for final pricingTier
            console.log('🔍 EnhancedProcessing - transformResultsForNewPipeline - final pricingTier:', pricingTier);
            
            return {
                itemNumber: index + 1,
                description,
                title: description,
                status: status === 'Found' || status === 'Price Found' ? 'FOUND' : 'ESTIMATED',
                pricingTier,
                basePrice: adjustedPrice,
                adjustedPrice,
                totalPrice: totalAdjustedPrice,
                currency: 'USD',
                source: source || 'System Estimate',
                url: url || '',
                pricer: 'AI-Enhanced',
                confidence,
                notes: null,
                // Depreciation fields (preserve if present from server)
                depCat: item.depCat || item['Dep. Cat'] || '',
                depPercent: item.depPercent || item['Dep Percent'] || '',
                depAmount: typeof item.depAmount === 'number' ? item.depAmount : (typeof item['Dep Amount'] === 'number' ? item['Dep Amount'] : undefined),
                // Keep original fields for backward compatibility
                Price: price,
                Source: source,
                'Search Status': status,
                URL: url
            };
        });
    }

    updateSummaryCards(result) {
        console.log('🔍 Updating summary cards with result data:', result);
        
        try {
            // CRITICAL FIX: Prevent duplicate calls by checking if we're already updating
            if (this.isUpdatingSummaryCards) {
                console.log('🔍 Already updating summary cards, skipping duplicate call');
                return;
            }
            this.isUpdatingSummaryCards = true;
            
            // Validate input
            if (!result) {
                console.error('❌ updateSummaryCards called with null/undefined result');
                this.isUpdatingSummaryCards = false;
                return;
            }
            
            // Handle both direct result object and wrapped result.data structure
            const resultsArray = result.data || result.results || [];
            const processingTime = result.timing ? 
                `${result.timing.totalProcessingTimeMinutes}m ${result.timing.totalProcessingTimeSeconds % 60}s` : '0s';
            
            // Validate results array
            if (!Array.isArray(resultsArray)) {
                console.error('❌ Invalid results array:', resultsArray);
                this.isUpdatingSummaryCards = false;
                return;
            }
            
            // Calculate summary statistics using the same format as main app.js
            const totalItems = resultsArray.length;
            const foundPrices = resultsArray.filter(item => {
                const status = item['Search Status'] || item.Status || item.status;
                const s = (status || '').toString().toLowerCase();
                return s === 'found' || s === 'price found' || s === 'exact' || s === 'found exact';
            }).length;
            const estimatedPrices = resultsArray.filter(item => {
                const status = item['Search Status'] || item.Status || item.status;
                return (status || '').toString().toLowerCase() === 'estimated';
            }).length;
            const denom = foundPrices + estimatedPrices;
            const successRate = denom > 0 ? Math.round((foundPrices / denom) * 100) : 0;
            
            // Calculate actual processing time in seconds
            let processingTimeSeconds = 0;
            if (result.timing && result.timing.totalProcessingTimeSeconds) {
                processingTimeSeconds = result.timing.totalProcessingTimeSeconds;
            } else if (this.processingStartTime) {
                const endTime = Date.now();
                processingTimeSeconds = Math.round((endTime - this.processingStartTime) / 1000);
            }
            
            console.log('📊 Summary stats calculated:', {
                totalItems,
                foundPrices,
                estimatedPrices,
                successRate,
                processingTimeSeconds
            });
            
            // Update the summary cards with new compact structure
            this.updateCompactSummaryCards(totalItems, foundPrices, successRate, processingTimeSeconds);
            
            console.log('✅ Summary cards updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating summary cards:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                result: result
            });
        } finally {
            // Always reset the flag
            this.isUpdatingSummaryCards = false;
        }
    }


    updateCompactSummaryCards(totalItems, foundPrices, successRate, processingTime) {
        try {
            // Validate input parameters
            if (typeof totalItems !== 'number' || typeof foundPrices !== 'number' || 
                typeof successRate !== 'number' || typeof processingTime !== 'number') {
                console.error('❌ Invalid parameters passed to updateCompactSummaryCards:', {
                    totalItems, foundPrices, successRate, processingTime
                });
                return;
            }
            
            console.log('🔍 Updating summary cards with values:', { totalItems, foundPrices, successRate, processingTime });

            // CRITICAL FIX: Since HTML already has the summary structure, just update the existing elements
            // Don't create new containers, just update the values in the existing ones
            
            // Update the individual summary card elements directly (they already exist in HTML)
            const enhancedTotalItems = document.getElementById('enhanced-total-items');
            const enhancedFoundPrices = document.getElementById('enhanced-found-prices');
            const enhancedSuccessRate = document.getElementById('enhanced-success-rate');
            const enhancedProcessingTime = document.getElementById('enhanced-processing-time');
            
            if (enhancedTotalItems) {
                enhancedTotalItems.textContent = totalItems;
                console.log('✅ Updated enhanced-total-items:', totalItems);
            } else {
                console.warn('⚠️ enhanced-total-items element not found');
            }
            
            if (enhancedFoundPrices) {
                enhancedFoundPrices.textContent = foundPrices;
                console.log('✅ Updated enhanced-found-prices:', foundPrices);
            } else {
                console.warn('⚠️ enhanced-found-prices element not found');
            }
            
            if (enhancedSuccessRate) {
                enhancedSuccessRate.textContent = `${successRate}%`;
                console.log('✅ Updated enhanced-success-rate:', `${successRate}%`);
            } else {
                console.warn('⚠️ enhanced-success-rate element not found');
            }
            
            if (enhancedProcessingTime) {
                enhancedProcessingTime.textContent = `${processingTime}s`;
                console.log('✅ Updated enhanced-processing-time:', `${processingTime}s`);
            } else {
                console.warn('⚠️ enhanced-processing-time element not found');
            }

            // Remove any duplicate summary containers that might have been created
            const allSummaries = document.querySelectorAll('.processing-results-summary');
            if (allSummaries.length > 1) {
                console.log('🔍 Found multiple summary containers, removing duplicates...');
                // Keep only the first one (the one from HTML), remove any dynamically created ones
                for (let i = 1; i < allSummaries.length; i++) {
                    allSummaries[i].remove();
                }
            }

            // Remove any simple summary fallback elements
            const existingSimple = document.querySelectorAll('.simple-summary-fallback');
            existingSimple.forEach(element => {
                element.remove();
                console.log('🔍 Removed simple summary fallback');
            });
            
            console.log('✅ Summary cards updated successfully');
            
        } catch (error) {
            console.error('❌ Error in updateCompactSummaryCards:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                parameters: { totalItems, foundPrices, successRate, processingTime }
            });
        }
    }


    async downloadResults(format) {
        console.log('🔍 downloadResults called with format:', format);
        console.log('🔍 Image upload mode:', this.isImageUpload);
        console.log('🔍 Current file available:', !!this.currentFile);
        
        // Check if we have any results data available
        let results = null;
        
        // Try to get results from different sources
        if (this.currentResults) {
            results = this.currentResults.results || this.currentResults;
        } else {
            // Try to get results from the DOM if currentResults is not set
            const resultsSection = document.getElementById('enhanced-results-section');
            if (resultsSection && !resultsSection.classList.contains('hidden')) {
                // Look for results in the table
                const table = resultsSection.querySelector('table');
                if (table) {
                    results = this.extractResultsFromTable(table);
                }
            }
        }
        
        if (!results || !Array.isArray(results) || results.length === 0) {
            this.app.showError('No processing results found. Please process a file first.');
            return;
        }

        // FIXED: Handle case where currentFile is null but we have results
        // This can happen if results were cleared but download button is still available
        if (!this.currentFile) {
            console.log('⚠️ No current file reference, but we have results. Using fallback download logic.');
            
            // For cases where we have results but no file reference, default to image-style export
            // This ensures users can still download their results even if file reference is lost
            try {
                this.app.showLoading(`Downloading ${format.toUpperCase()} file...`);
                
                if (format === 'excel') {
                    // Use image-style export as fallback (grid-only columns)
                    await this.downloadImageResultsExcel(results);
                } else {
                    // Create CSV content
                    const csvContent = this.createCSVContent(results);
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    this.downloadBlobWithFallbackName(blob, 'csv');
                }
                
            } catch (error) {
                console.error('❌ Fallback download error:', error);
                this.app.showError(`Download failed: ${error.message}`);
            } finally {
                this.app.hideLoading();
            }
            return;
        }

        try {
            this.app.showLoading(`Downloading ${format.toUpperCase()} file...`);
            
            if (format === 'excel') {
                if (this.isImageUpload) {
                    // For image uploads, export only grid columns with timestamp filename
                    await this.downloadImageResultsExcel(results);
                } else {
                    // For CSV/Excel uploads, use original logic with original data + 5 new columns
                    await this.downloadExcelWithOriginalData(results);
                }
            } else {
                // Create CSV content
                const csvContent = this.createCSVContent(results);
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                this.downloadBlob(blob, 'csv');
            }
            
        } catch (error) {
            console.error('❌ Download error:', error);
            this.app.showError(`Download failed: ${error.message}`);
        } finally {
            this.app.hideLoading();
        }
    }

    async downloadImageResultsExcel(processedResults) {
        console.log('🔍 downloadImageResultsExcel called for image upload');
        console.log('🔍 Processed results:', processedResults);

        try {
            // Check if SheetJS is available
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS library not loaded. Please refresh the page and try again.');
            }

            // Create new workbook for image results
            const newWorkbook = XLSX.utils.book_new();
            
            // FIXED: Define grid columns for image processing - replace Status with Pricer
            const headers = [
                'Item #',
                'Description', 
                'Pricer',
                'Replacement Source',
                'Replacement Price',
                'Total Replacement Price',
                'URL'
            ];
            
            // Prepare data rows - include ALL results (not just current page)
            const dataRows = [];
            
            // Add header row
            dataRows.push(headers);
            
            // Add all result rows (respecting current sort/filter if any)
            processedResults.forEach((item, index) => {
                const itemNumber = index + 1;
                const description = item.Description || item.description || item['Item Description'] || 'N/A';
                const pricer = 'AI Pricer'; // FIXED: Use constant "AI Pricer" instead of status
                const source = item.Source || item.source || item.replacementSource || 'N/A';
                const price = this.extractNumericPrice(item.Price || item.price || item.replacementPrice);
                const totalPrice = this.extractNumericPrice(
                    item['Total Replacement Price'] || 
                    item.totalReplacementPrice || 
                    item.totalPrice ||
                    item.Price || 
                    item.price
                );
                console.log(`🔍 DEBUG: Excel export - Item ${index + 1} Total Replacement Price extraction:`, {
                    'Total Replacement Price': item['Total Replacement Price'],
                    totalReplacementPrice: item.totalReplacementPrice,
                    totalPrice: item.totalPrice,
                    Price: item.Price,
                    price: item.price,
                    finalValue: totalPrice
                });
                const url = item.URL || item.url || '';
                
                dataRows.push([
                    itemNumber,
                    description,
                    pricer, // FIXED: Use "AI Pricer" instead of status
                    source,
                    price || '',
                    totalPrice || '',
                    url
                ]);
            });
            
            console.log('🔍 Image export data rows prepared:', dataRows.length);
            
            // Create worksheet from array of arrays
            const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
            
            // Apply currency formatting to price columns
            const priceColumnIndex = headers.indexOf('Replacement Price');
            const totalPriceColumnIndex = headers.indexOf('Total Replacement Price');
            
            if (priceColumnIndex >= 0 || totalPriceColumnIndex >= 0) {
                const range = XLSX.utils.decode_range(worksheet['!ref']);
                
                // Format data rows (skip header row)
                for (let row = 1; row <= range.e.r; row++) {
                    if (priceColumnIndex >= 0) {
                        const cellAddress = XLSX.utils.encode_cell({ r: row, c: priceColumnIndex });
                        if (worksheet[cellAddress] && worksheet[cellAddress].v !== '') {
                            worksheet[cellAddress].z = '$#,##0.00';
                        }
                    }
                    
                    if (totalPriceColumnIndex >= 0) {
                        const cellAddress = XLSX.utils.encode_cell({ r: row, c: totalPriceColumnIndex });
                        if (worksheet[cellAddress] && worksheet[cellAddress].v !== '') {
                            worksheet[cellAddress].z = '$#,##0.00';
                        }
                    }
                }
            }
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(newWorkbook, worksheet, 'Image Results');
            
            // Generate timestamp-based filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                             new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
            const exportFilename = `${timestamp}_image_results.xlsx`;
            
            console.log('🔍 Generated filename:', exportFilename);
            
            // Write and download the file
            const excelBuffer = XLSX.write(newWorkbook, { 
                bookType: 'xlsx', 
                type: 'array',
                cellStyles: true,
                compression: true
            });
            
            const blob = new Blob([excelBuffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            this.downloadBlob(blob, 'xlsx', exportFilename);
            
            this.app.showSuccess('✅ Image results Excel file downloaded successfully!');
            
        } catch (error) {
            console.error('❌ Image Excel download error:', error);
            throw error;
        }
    }

    async downloadExcelWithOriginalData(processedResults) {
        console.log('🔍 downloadExcelWithOriginalData called');
        console.log('🔍 Processed results:', processedResults);
        console.log('🔍 Original data available:', !!this.originalData);
        console.log('🔍 Current file:', this.currentFile);
        console.log('🔍 Job ID available:', this.currentResults?.jobId);
        
        // If we have a jobId, use the API endpoint for better data consistency
        if (this.currentResults?.jobId) {
            console.log('🔍 Using API endpoint with jobId:', this.currentResults.jobId);
            try {
                this.app.showLoading('Downloading Excel file from server...');
                
                const response = await fetch('/api/enhanced/download-excel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jobId: this.currentResults.jobId,
                        originalFilename: this.currentFile?.name || 'pricing-results'
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const blob = await response.blob();
                const filename = `pricing-results-${new Date().toISOString().split('T')[0]}.xlsx`;
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.app.showSuccess('✅ Excel file downloaded successfully from server!');
                return;
                
            } catch (error) {
                console.error('❌ API download failed, falling back to client-side generation:', error);
                this.app.showError('Server download failed, using client-side generation instead.');
                // Continue with client-side generation as fallback
            } finally {
                this.app.hideLoading();
            }
        }

        try {
            // Check if SheetJS is available
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS library not loaded. Please refresh the page and try again.');
            }

            let originalWorkbook = null;
            let originalSheetName = 'Sheet1';
            let allOriginalRows = []; // Store ALL rows including metadata
            let dataStartRowIndex = -1; // Index where actual data starts
            let originalDataHeaders = []; // Headers for the data section
            let originalDataRows = []; // Only the data rows (excluding metadata)

            // Try to get original data from the file
            if (this.currentFile) {
                console.log('🔍 Reading original file data...');
                
                if (this.currentFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    this.currentFile.name.toLowerCase().endsWith('.xlsx') || 
                    this.currentFile.name.toLowerCase().endsWith('.xls')) {
                    
                    // Read Excel file with proper encoding
                    const fileBuffer = await this.readFileAsArrayBuffer(this.currentFile);
                    originalWorkbook = XLSX.read(fileBuffer, { 
                        type: 'array',
                        codepage: 65001, // UTF-8 encoding
                        raw: false, // Ensure proper text conversion
                        cellText: false, // Don't force text conversion
                        cellDates: true, // Handle dates properly
                        cellNF: false, // Don't apply number formatting
                        cellHTML: false // Don't convert to HTML
                    });
                    
                    // Use the processed sheet name if available, otherwise use first sheet
                    originalSheetName = this.processedSheetName || originalWorkbook.SheetNames[0];
                    console.log('🔍 Using sheet name:', originalSheetName);
                    
                    const worksheet = originalWorkbook.Sheets[originalSheetName];
                    allOriginalRows = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1, 
                        defval: '', 
                        raw: false, // Preserve text formatting
                        dateNF: 'mm/dd/yyyy', // Date format
                        blankrows: true // Include blank rows to preserve structure
                    });
                    
                    // Find where actual data starts (look for "Item #" or similar)
                    dataStartRowIndex = this.findDataStartRow(allOriginalRows);
                    console.log('🔍 Data starts at row index:', dataStartRowIndex);
                    
                    if (dataStartRowIndex >= 0) {
                        originalDataHeaders = allOriginalRows[dataStartRowIndex] || [];
                        originalDataRows = allOriginalRows.slice(dataStartRowIndex + 1);
                    } else {
                        // Fallback to old method if data start not found
                        const headerRowIndex = this.findHeaderRow(allOriginalRows);
                        dataStartRowIndex = headerRowIndex;
                        originalDataHeaders = allOriginalRows[headerRowIndex] || [];
                        originalDataRows = allOriginalRows.slice(headerRowIndex + 1);
                    }
                    
                    console.log('🔍 All original rows count:', allOriginalRows.length);
                    console.log('🔍 Data start row index:', dataStartRowIndex);
                    console.log('🔍 Original data headers:', originalDataHeaders);
                    console.log('🔍 Original data rows count:', originalDataRows.length);
                    
                } else if (this.currentFile.type === 'text/csv' || this.currentFile.name.toLowerCase().endsWith('.csv')) {
                    
                    // Read CSV file with proper encoding
                    const csvText = await this.readFileAsText(this.currentFile);
                    const lines = csvText.split('\n').filter(line => line.trim());
                    
                    if (lines.length > 0) {
                        // For CSV, convert to same structure as Excel
                        allOriginalRows = lines.map(line => {
                            return this.parseCSVLine(line);
                        });
                        
                        // Find data start for CSV too
                        dataStartRowIndex = this.findDataStartRow(allOriginalRows);
                        if (dataStartRowIndex >= 0) {
                            originalDataHeaders = allOriginalRows[dataStartRowIndex] || [];
                            originalDataRows = allOriginalRows.slice(dataStartRowIndex + 1);
                        } else {
                            // Fallback: assume first row is headers
                            dataStartRowIndex = 0;
                            originalDataHeaders = allOriginalRows[0] || [];
                            originalDataRows = allOriginalRows.slice(1);
                        }
                    }
                    
                    // For CSV, use filename as sheet name
                    originalSheetName = this.currentFile.name.replace(/\.[^/.]+$/, '');
                    console.log('🔍 CSV all rows count:', allOriginalRows.length);
                    console.log('🔍 CSV data start row index:', dataStartRowIndex);
                    console.log('🔍 CSV original data headers:', originalDataHeaders);
                    console.log('🔍 CSV original data rows count:', originalDataRows.length);
                }
            }

            // If we couldn't read original data, create a basic structure
            if (allOriginalRows.length === 0) {
                console.log('⚠️ Could not read original data, creating basic structure');
                originalDataHeaders = ['Item #', 'Description', 'Status', 'Source', 'Price', 'Total Price', 'URL'];
                originalDataRows = processedResults.map((result, index) => [
                    index + 1,
                    result.Description || result.description || 'N/A',
                    result.Status || result.status || 'N/A',
                    result.Source || result.source || 'N/A',
                    result.Price || result.price || 'N/A',
                    result['Total Replacement Price'] || result.totalReplacementPrice || 'N/A',
                    result.URL || result.url || 'N/A'
                ]);
                allOriginalRows = [originalDataHeaders, ...originalDataRows];
                dataStartRowIndex = 0;
            }

            // Create new workbook with proper row alignment
            const newWorkbook = XLSX.utils.book_new();
            
            // Prepare the complete new structure
            const newRows = [];
            
            // Process each row from the original file
            for (let i = 0; i < allOriginalRows.length; i++) {
                const originalRow = allOriginalRows[i] || [];
                
                if (i < dataStartRowIndex) {
                    // This is a metadata row - keep it exactly as-is (no new columns)
                    newRows.push([...originalRow]);
                    console.log(`🔍 Metadata row ${i}:`, originalRow);
                    
                } else if (i === dataStartRowIndex) {
                    // This is the header row - add the 5 new column headers
                    const newHeaderRow = [...originalRow, 'Pricer', 'Replacement Source', 'Replacement Price', 'Total Replacement Price', 'URL'];
                    newRows.push(newHeaderRow);
                    console.log(`🔍 Header row ${i}:`, newHeaderRow);
                    
                } else {
                    // This is a data row - add original data + 5 new columns
                    
                    // Start with original row data
                    const newRow = [...originalRow];
                    
                    // CRITICAL FIX: Check if this is a blank/empty row
                    const isBlankRow = originalRow.every(cell => !cell || cell.toString().trim() === '');
                    
                    if (isBlankRow) {
                        // This is a blank row - keep it blank, don't add any pricing data
                        console.log(`🔍 Blank row ${i} detected - keeping empty`);
                        newRows.push(newRow); // Keep the blank row as-is
                    } else {
                        // This is a row with actual data - we need to find the correct processed result
                        // Count how many non-blank data rows we've seen so far
                        let nonBlankDataRowCount = 0;
                        for (let j = dataStartRowIndex + 1; j <= i; j++) {
                            const checkRow = allOriginalRows[j] || [];
                            const isCheckRowBlank = checkRow.every(cell => !cell || cell.toString().trim() === '');
                            if (!isCheckRowBlank) {
                                nonBlankDataRowCount++;
                            }
                        }
                        
                        // Use the count of non-blank rows to index into processedResults
                        const dataRowIndex = nonBlankDataRowCount - 1; // -1 because we're 0-indexed
                        const processedResult = processedResults[dataRowIndex] || {};
                        
                        console.log(`🔍 Row ${i}: nonBlankDataRowCount=${nonBlankDataRowCount}, dataRowIndex=${dataRowIndex}`);
                        
                        // Pad with empty strings if needed to match header count
                        while (newRow.length < originalDataHeaders.length) {
                            newRow.push('');
                        }
                        
                        // Add the 5 new columns in exact order
                        if (Object.keys(processedResult).length > 0) {
                            // We have processed data for this row
                            newRow.push('AI Pricer'); // Pricer - constant string
                            
                            // Replacement Source - domain/retailer from grid
                            const replacementSource = this.extractDomainName(processedResult.Source || processedResult.source || '');
                            newRow.push(replacementSource);
                            
                            // Replacement Price - unit price as number
                            const replacementPrice = this.extractNumericPrice(processedResult.Price || processedResult.price);
                            newRow.push(replacementPrice);
                            
                            // Total Replacement Price - total price as number  
                            const totalReplacementPrice = this.extractNumericPrice(processedResult['Total Replacement Price'] || processedResult.totalReplacementPrice);
                            newRow.push(totalReplacementPrice);
                            
                            // URL - canonical product URL
                            const url = processedResult.URL || processedResult.url || '';
                            newRow.push(url);
                        } else {
                            // No processed data for this row - add empty cells
                            newRow.push('', '', '', '', '');
                        }
                        
                        newRows.push(newRow);
                        console.log(`🔍 Data row ${i} (data index ${dataRowIndex}):`, newRow);
                    }
                }
            }
            
            console.log('🔍 New rows prepared:', newRows.length);
            console.log('🔍 Sample metadata row:', newRows[0]);
            console.log('🔍 Sample header row:', newRows[dataStartRowIndex]);
            console.log('🔍 Sample data row:', newRows[dataStartRowIndex + 1]);
            
            // Create worksheet from array of arrays
            const newWorksheet = XLSX.utils.aoa_to_sheet(newRows);
            
            // Apply currency formatting to price columns (only in data rows)
            if (dataStartRowIndex >= 0) {
                const headerRow = newRows[dataStartRowIndex];
                const priceColumnIndex = headerRow.indexOf('Replacement Price');
                const totalPriceColumnIndex = headerRow.indexOf('Total Replacement Price');
                
                if (priceColumnIndex >= 0 || totalPriceColumnIndex >= 0) {
                    const range = XLSX.utils.decode_range(newWorksheet['!ref']);
                    
                    // Only format data rows (skip metadata and header rows)
                    for (let row = dataStartRowIndex + 1; row <= range.e.r; row++) {
                        if (priceColumnIndex >= 0) {
                            const cellAddress = XLSX.utils.encode_cell({ r: row, c: priceColumnIndex });
                            if (newWorksheet[cellAddress] && newWorksheet[cellAddress].v !== '') {
                                newWorksheet[cellAddress].z = '$#,##0.00';
                            }
                        }
                        
                        if (totalPriceColumnIndex >= 0) {
                            const cellAddress = XLSX.utils.encode_cell({ r: row, c: totalPriceColumnIndex });
                            if (newWorksheet[cellAddress] && newWorksheet[cellAddress].v !== '') {
                                newWorksheet[cellAddress].z = '$#,##0.00';
                            }
                        }
                    }
                }
            }
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, originalSheetName);
            
            // Generate filename
            const originalFilename = this.currentFile.name.replace(/\.[^/.]+$/, '');
            const exportFilename = `${originalFilename}_priced.xlsx`;
            
            // Write and download the file with proper encoding
            const excelBuffer = XLSX.write(newWorkbook, { 
                bookType: 'xlsx', 
                type: 'array',
                cellStyles: true,
                compression: true
            });
            
            const blob = new Blob([excelBuffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            this.downloadBlob(blob, 'xlsx', exportFilename);
            
            this.app.showSuccess('✅ Excel file with pricing data downloaded successfully!');
            
        } catch (error) {
            console.error('❌ Excel download error:', error);
            throw error;
        }
    }

    // Helper method to find header row in Excel data
    findHeaderRow(jsonData) {
        // Simple heuristic: find row with most non-empty text cells that look like headers
        let bestRowIndex = 0;
        let bestScore = 0;
        
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            let score = 0;
            const textCells = row.filter(cell => {
                if (!cell || cell.toString().trim() === '') return false;
                const val = cell.toString().trim();
                // Check if it looks like a header (text, not number/date)
                return /^[a-zA-Z\s#\-\(\)]+$/.test(val) || val.includes(' ') || val.includes('#');
            }).length;
            
            score += textCells * 2;
            
            // Bonus for common header words
            const rowText = row.join(' ').toLowerCase();
            if (rowText.includes('description')) score += 5;
            if (rowText.includes('price')) score += 5;
            if (rowText.includes('qty') || rowText.includes('quantity')) score += 5;
            if (rowText.includes('item')) score += 3;
            if (rowText.includes('room')) score += 3;
            
            if (score > bestScore) {
                bestScore = score;
                bestRowIndex = i;
            }
        }
        
        return bestRowIndex;
    }

    // Helper method to find where actual data starts (look for "Item #" or similar patterns)
    findDataStartRow(jsonData) {
        console.log('🔍 Finding data start row in:', jsonData.length, 'rows');
        
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            // Convert row to string for analysis
            const rowText = row.join(' ').toLowerCase().trim();
            console.log(`🔍 Row ${i}:`, rowText);
            
            // Look for patterns that indicate this is the header row for actual data
            const hasItemNumber = rowText.includes('item #') || rowText.includes('item#') || 
                                 rowText.includes('item number') || rowText.includes('item no');
            const hasDescription = rowText.includes('description') || rowText.includes('item description');
            const hasQuantity = rowText.includes('qty') || rowText.includes('quantity');
            const hasPrice = rowText.includes('price') || rowText.includes('cost');
            
            // Check if this row has multiple data-like headers
            const dataHeaderCount = [hasItemNumber, hasDescription, hasQuantity, hasPrice].filter(Boolean).length;
            
            console.log(`🔍 Row ${i} analysis:`, {
                hasItemNumber,
                hasDescription, 
                hasQuantity,
                hasPrice,
                dataHeaderCount,
                rowText: rowText.substring(0, 100)
            });
            
            // If we find a row with multiple data headers, this is likely our data start
            if (dataHeaderCount >= 2) {
                console.log(`✅ Found data start row at index ${i}`);
                return i;
            }
            
            // Alternative: Look for a row that starts with "Item #" or similar
            const firstCell = row[0] ? row[0].toString().toLowerCase().trim() : '';
            if (firstCell === 'item #' || firstCell === 'item#' || firstCell === 'item number') {
                console.log(`✅ Found data start row by first cell at index ${i}`);
                return i;
            }
        }
        
        console.log('⚠️ Could not find specific data start row, falling back to findHeaderRow');
        return this.findHeaderRow(jsonData);
    }

    // Helper method to parse CSV line properly handling quotes and special characters
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
                i++;
            } else {
                // Regular character
                current += char;
                i++;
            }
        }
        
        // Add the last field
        result.push(current.trim());
        
        return result;
    }

    // Helper method to extract domain name from source
    extractDomainName(source) {
        if (!source || source === 'N/A') return '';
        
        // Clean up common source formats
        const cleanSource = source.toString().trim();
        
        // If it's already a clean domain name, return it
        if (cleanSource.includes('.com') || cleanSource.includes('.net') || cleanSource.includes('.org')) {
            return cleanSource.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
        
        // Return as-is for retailer names
        return cleanSource;
    }

    // Helper method to extract numeric price
    extractNumericPrice(price) {
        if (!price || price === 'N/A') return '';
        
        if (typeof price === 'number') return price;
        
        const priceStr = price.toString().replace(/[$,]/g, '');
        const numericPrice = parseFloat(priceStr);
        
        return isNaN(numericPrice) ? '' : numericPrice;
    }

    // Helper method to ensure numeric price (never N/A, always returns a number)
    ensureNumericPrice(price) {
        if (typeof price === 'number' && price > 0) return price;
        
        if (typeof price === 'string') {
            const numericPrice = parseFloat(price.replace(/[$,]/g, ''));
            if (!isNaN(numericPrice) && numericPrice > 0) return numericPrice;
        }
        
        // Return minimum price if no valid price found (never N/A)
        return 1.00;
    }

    // Helper method to format price for display - NEVER returns N/A
    formatPrice(price) {
        // If it's already a formatted price string (contains $), extract and validate
        if (typeof price === 'string' && price.includes('$')) {
            const numericPrice = parseFloat(price.replace(/[$,]/g, ''));
            if (!isNaN(numericPrice) && numericPrice > 0) {
                return `$${numericPrice.toFixed(2)}`;
            }
        }
        
        // If it's a number, format it
        if (typeof price === 'number' && !isNaN(price) && price > 0) {
            return `$${price.toFixed(2)}`;
        }
        
        // Try to parse as number
        if (typeof price === 'string') {
            const numericPrice = parseFloat(price.replace(/[$,]/g, ''));
            if (!isNaN(numericPrice) && numericPrice > 0) {
                return `$${numericPrice.toFixed(2)}`;
            }
        }
        
        // Return N/A if no valid price found
        return 'N/A';
    }

    // Helper method to read file as array buffer
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Helper method to read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    extractResultsFromTable(table) {
        const results = [];
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 7) { // Ensure we have all expected columns
                const result = {
                    itemNumber: index + 1,
                    description: cells[1]?.textContent?.trim() || 'N/A',
                    status: cells[2]?.textContent?.trim() || 'N/A',
                    replacementSource: cells[3]?.textContent?.trim() || 'N/A',
                    replacementPrice: this.extractPrice(cells[4]?.textContent),
                    totalReplacementPrice: this.extractPrice(cells[5]?.textContent),
                    url: this.extractUrl(cells[6])
                };
                results.push(result);
            }
        });
        
        return results;
    }

    extractPrice(priceText) {
        if (!priceText) return 'N/A';
        const match = priceText.match(/\$([\d,]+\.?\d*)/);
        return match ? match[1] : 'N/A';
    }

    extractUrl(cell) {
        if (!cell) return 'N/A';
        const link = cell.querySelector('a');
        return link ? link.href : 'N/A';
    }

    createCSVContent(results) {
        // Define CSV headers including new pipeline fields
        const headers = [
            'Item #', 
            'Description', 
            'Status', 
            'Pricing Tier',
            'Base Price',
            'Adjusted Price', 
            'Replacement Source', 
            'Total Replacement Price', 
            'URL',
            'Confidence'
        ];
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        results.forEach((item, index) => {
            // Ensure we always have numeric prices (never N/A)
            const basePrice = this.ensureNumericPrice(item.basePrice || item.Price || item.price);
            const adjustedPrice = this.ensureNumericPrice(item.adjustedPrice || item.Price || item.price);
            const totalPrice = this.ensureNumericPrice(item.totalPrice || item['Total Replacement Price'] || item.totalReplacementPrice);
            const confidence = typeof item.confidence === 'number' ? item.confidence.toFixed(2) : '0.50';
            
            const row = [
                index + 1,
                `"${(item.description || item.Description || 'Unknown Item').replace(/"/g, '""')}"`,
                item.status || 'ESTIMATED',
                item.pricingTier || 'BASELINE',
                basePrice.toFixed(2),
                adjustedPrice.toFixed(2),
                `"${(item.source || item.Source || 'System Estimate').replace(/"/g, '""')}"`,
                totalPrice.toFixed(2),
                item.url || item.URL || '',
                confidence
            ];
            csvContent += row.join(',') + '\n';
        });
        
        return csvContent;
    }

    downloadBlob(blob, format, customFilename = null) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        if (customFilename) {
            a.download = customFilename;
        } else {
            a.download = `${this.currentFile.name.replace(/\.[^/.]+$/, '')} - evaluated.${format}`;
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.app.showSuccess(`✅ ${format.toUpperCase()} file downloaded successfully!`);
    }

    downloadBlobWithFallbackName(blob, format) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate a fallback filename when no current file is available
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
        a.download = `${timestamp}_results.${format}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.app.showSuccess(`✅ ${format.toUpperCase()} file downloaded successfully!`);
    }

    clearResults() {
        this.currentFile = null;
        this.currentSessionId = null;
        this.currentResults = null;
        this.isImageUpload = false; // Reset image upload flag
        this.currentPage = 1;
        this.processingStartTime = null;
        
        // CRITICAL FIX: Remove all duplicate summary elements before clearing
        const existingSummaries = document.querySelectorAll('.processing-results-summary');
        if (existingSummaries.length > 1) {
            console.log('🔍 Clearing: Found multiple summary containers, removing duplicates...');
            // Keep only the first one, remove the rest
            for (let i = 1; i < existingSummaries.length; i++) {
                existingSummaries[i].remove();
            }
        }
        
        // Remove any simple summary fallback elements
        const existingSimple = document.querySelectorAll('.simple-summary-fallback');
        existingSimple.forEach(element => element.remove());
        
        document.getElementById('enhanced-results-section').classList.add('hidden');
        document.getElementById('enhanced-results-content').innerHTML = '';
        
        // CRITICAL: Reset page height when results are cleared
        this.resetPageHeight();
    }

    handleProcessingModeChange(mode) {
        if (mode === 'enhanced') {
            // Enable enhanced processing features
            console.log('🚀 Enhanced processing mode enabled');
        } else {
            // Fall back to legacy processing
            console.log('🔄 Legacy CSV processing mode enabled');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showFieldMappingWizard(availableHeaders, missingFields) {
        console.log('🔍 showFieldMappingWizard called with:', { availableHeaders, missingFields });
        console.log('🔍 Starting modal creation process...');
        
        try {
            // Remove any existing dynamic modal
            const existingModal = document.getElementById('dynamic-field-mapping-modal');
            if (existingModal) {
                existingModal.remove();
                console.log('🔍 Removed existing modal');
            }
            
            console.log('🔍 Creating new modal element...');
            // Create a new modal for field mapping
            const modal = document.createElement('div');
            modal.id = 'dynamic-field-mapping-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            console.log('🔍 Modal element created:', modal);
            console.log('🔍 Modal ID:', modal.id);
            console.log('🔍 Modal styles applied:', modal.style.cssText);
            
            // Create modal content
            console.log('🔍 Creating modal content...');
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `;
            
            console.log('🔍 Modal content created:', modalContent);
            
            // Create header
            console.log('🔍 Creating modal header...');
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #e0e0e0;
            `;
            
            const title = document.createElement('h3');
            title.textContent = 'Field Mapping Required';
            title.style.margin = '0';
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            `;
            closeBtn.onclick = () => this.hideFieldMappingModal();
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            
            console.log('🔍 Modal header created:', header);
            
            // Create body
            console.log('🔍 Creating modal body...');
            const body = document.createElement('div');
            body.style.marginBottom = '20px';
            
            const description = document.createElement('p');
            description.textContent = 'Please map the following fields to your Excel/CSV columns. Note: The system detected metadata rows at the top of your file. Please map to the actual data columns below.';
            description.style.margin = '0 0 15px 0';
            
            // Add warning about metadata rows if headers are mostly empty
            const emptyHeaders = availableHeaders.filter(h => !h || h.trim() === '');
            if (emptyHeaders.length > availableHeaders.length * 0.5) {
                const warning = document.createElement('div');
                warning.style.cssText = `
                    padding: 12px;
                    margin-bottom: 15px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 4px;
                    font-size: 14px;
                    color: #856404;
                `;
                warning.innerHTML = `
                    <strong>⚠️ Notice:</strong> Your Excel file appears to have metadata rows at the top 
                    (company info, titles, etc.) and the actual data columns start further down. 
                    Please map the required fields to the actual data columns, not the metadata rows.
                `;
                body.appendChild(warning);
            }
            
            // REMOVED: Available headers section as requested by user
            
            // Create field mapping form
            const formContent = document.createElement('div');
            formContent.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 15px;
            `;
            
            // Add mapping suggestions
            const mappingSuggestions = document.createElement('div');
            mappingSuggestions.style.cssText = `
                padding: 10px;
                margin-bottom: 15px;
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                font-size: 13px;
                color: #856404;
            `;
            mappingSuggestions.innerHTML = `
                <strong>🎯 Mapping Requirements:</strong><br>
                <strong style="color: #e53e3e;">REQUIRED FIELDS:</strong><br>
                • <strong>Description:</strong> Look for a column with item names like "Bissell Vacuum", "Singer Sewing Machine"<br>
                • <strong>QTY:</strong> Look for a column with numbers like 2, 22, 1<br>
                • <strong>Purchase Price:</strong> Look for a column with currency values like $100.00, $399.00<br>
                <br>
                <strong style="color: #666;">OPTIONAL FIELDS:</strong><br>
                • <strong>Room:</strong> Look for a column with values like "Laundry", "Kitchen", "Bedroom"<br>
                • <strong>Model#:</strong> Look for a column with product models/SKUs<br>
                • <strong>Age (Years):</strong> Look for a column with age values<br>
                • <strong>Condition:</strong> Look for a column with condition ratings<br>
                • <strong>Original Source:</strong> Look for a column with vendor/source names
            `;
            formContent.appendChild(mappingSuggestions);
            
            // Create the actual field mapping form
            const fieldMappingForm = document.createElement('div');
            fieldMappingForm.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 15px;
            `;
            
            // Define required fields with descriptions
            const requiredFields = [
                { key: 'Room', name: 'Room', description: 'Location/room where item is located (e.g., "Laundry", "Kitchen")', required: false },
                { key: 'QTY', name: 'Quantity', description: 'Number of items (e.g., 2, 22)', required: true },
                { key: 'Description', name: 'Description', description: 'Item description/name (e.g., "Bissell Vacuum", "Singer Sewing Machine")', required: true },
                { key: 'Model#', name: 'Model Number', description: 'Product model or SKU (mostly empty in your file)', required: false },
                { key: 'Age (Years)', name: 'Age (Years)', description: 'How old the item is in years', required: false },
                { key: 'Condition', name: 'Condition', description: 'Item condition (e.g., "Good", "Excellent")', required: false },
                { key: 'Original Source', name: 'Original Source', description: 'Where the item was originally purchased', required: false },
                { key: 'Purchase Price', name: 'Purchase Price', description: 'Cost to replace each item (e.g., $100.00, $399.00)', required: true },
                { key: 'Total Purchase Price', name: 'Total Purchase Price', description: 'Total cost for all items in the row', required: false }
            ];
            
            // Create form fields
            requiredFields.forEach(field => {
                const fieldContainer = document.createElement('div');
                fieldContainer.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                `;
                
                const label = document.createElement('label');
                label.style.cssText = `
                    font-weight: 600;
                    color: ${field.required ? '#e53e3e' : '#666'};
                    font-size: 14px;
                `;
                label.innerHTML = `
                    ${field.name} ${field.required ? '<span style="color: #e53e3e;">*</span>' : ''}
                    <span style="font-weight: 400; color: #666; font-size: 12px;">${field.description}</span>
                `;
                
                const select = document.createElement('select');
                select.style.cssText = `
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    background: white;
                `;
                select.dataset.field = field.key; // Use the canonical field key
                select.dataset.required = field.required;
                
                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '-- Select Column --';
                select.appendChild(defaultOption);
                
                // Add available headers as options
                availableHeaders.forEach(header => {
                    const option = document.createElement('option');
                    option.value = header;
                    option.textContent = header;
                    select.appendChild(option);
                });
                
                fieldContainer.appendChild(label);
                fieldContainer.appendChild(select);
                fieldMappingForm.appendChild(fieldContainer);
            });
            
            // Add the field mapping form to the formContent
            formContent.appendChild(fieldMappingForm);
            
            // Create footer
            console.log('🔍 Creating modal footer...');
            const footer = document.createElement('div');
            footer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #e0e0e0;
            `;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                color: #666;
                cursor: pointer;
                font-size: 14px;
            `;
            cancelBtn.onclick = () => this.hideFieldMappingModal();
            
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Mapping & Process';
            confirmBtn.style.cssText = `
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                background: #007bff;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
            `;
            confirmBtn.onclick = () => this.confirmFieldMapping();
            
            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);
            
            // Assemble modal properly
            console.log('🔍 Assembling modal...');
            modalContent.appendChild(header);
            modalContent.appendChild(body);
            body.appendChild(formContent);
            body.appendChild(footer);
            modal.appendChild(modalContent);
            
            console.log('🔍 Modal assembled successfully');
            
            // Add to DOM
            console.log('🔍 Adding modal to DOM...');
            document.body.appendChild(modal);
            
            console.log('🔍 Modal added to DOM successfully');
            console.log('🔍 Modal element in DOM:', document.getElementById('dynamic-field-mapping-modal'));
            console.log('🔍 Modal visibility:', modal.style.display, modal.style.visibility, modal.style.opacity);
            console.log('🔍 Modal z-index:', modal.style.zIndex);
            console.log('🔍 Modal computed styles:', window.getComputedStyle(modal));
            
            // Force a repaint to ensure visibility
            modal.offsetHeight;
            
            // Add a small delay to ensure the modal is fully rendered
            setTimeout(() => {
                console.log('🔍 Modal should now be visible');
                console.log('🔍 Modal element still in DOM:', document.getElementById('dynamic-field-mapping-modal'));
                
                // Final verification
                const finalModal = document.getElementById('dynamic-field-mapping-modal');
                if (finalModal) {
                    console.log('✅ SUCCESS: Field mapping modal is visible and ready');
                    console.log('✅ Modal dimensions:', finalModal.offsetWidth, 'x', finalModal.offsetHeight);
                    console.log('✅ Modal position:', finalModal.offsetLeft, finalModal.offsetTop);
                } else {
                    console.error('❌ FAILURE: Modal disappeared from DOM after creation');
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ CRITICAL ERROR in showFieldMappingWizard:', error);
            console.error('❌ Error stack:', error.stack);
            
            // Try to show a simple alert as fallback
            try {
                alert('Error creating field mapping wizard: ' + error.message + '\n\nPlease refresh the page and try again.');
            } catch (alertError) {
                console.error('❌ Even alert failed:', alertError);
            }
        }
    }

    showFieldMappingModal(fields, headers) {
        const modal = document.getElementById('field-mapping-modal');
        const form = document.getElementById('field-mapping-form');
        
        // Create field mapping form
        form.innerHTML = fields.map(field => `
            <div class="field-label">
                ${field.name}
                ${field.required ? '<span class="field-required">*</span>' : ''}
            </div>
            <select class="field-select" data-field="${field.key}">
                <option value="">-- Select Column --</option>
                ${headers.map(header => `<option value="${header}">${header}</option>`).join('')}
            </select>
        `).join('');

        // Show modal
        modal.classList.add('show');
    }

    hideFieldMappingModal() {
        // Remove the dynamic field mapping modal
        const modal = document.getElementById('dynamic-field-mapping-modal');
        if (modal) {
            modal.remove();
            console.log('🔍 Field mapping modal removed');
        }
    }

    confirmFieldMapping() {
        console.log('🔍 confirmFieldMapping called');
        
        // Look for the dynamic modal instead of the old form
        const modal = document.getElementById('dynamic-field-mapping-modal');
        if (!modal) {
            console.error('❌ Field mapping modal not found');
            return;
        }
        
        const selects = modal.querySelectorAll('select[data-field]');
        const mapping = {};
        const missingRequired = [];

        console.log('🔍 Processing field mappings...');
        console.log('🔍 Found selects:', selects.length);
        
        selects.forEach(select => {
            const field = select.dataset.field;
            const value = select.value;
            const isRequired = select.dataset.required === 'true';
            
            console.log(`🔍 Field: ${field}, Value: ${value}, Required: ${isRequired}, Dataset:`, select.dataset);
            
            if (value && value.trim() !== '') {
                mapping[field] = value;
                console.log(`✅ Mapped ${field} → ${value}`);
            } else if (isRequired) {
                missingRequired.push(field);
                console.log(`❌ Missing required field: ${field}`);
            } else {
                console.log(`⏭️ Skipping optional field: ${field}`);
            }
        });
        
        console.log('🔍 Collected mapping:', mapping);
        console.log('🔍 Missing required fields:', missingRequired);
        console.log('🔍 Total mapped fields:', Object.keys(mapping).length);
        
        if (missingRequired.length > 0) {
            this.app.showError(`Please map the following required fields: ${missingRequired.join(', ')}`);
            return;
        }
        
        if (Object.keys(mapping).length === 0) {
            this.app.showError('Please map at least one field before proceeding');
            return;
        }
        
        console.log('🔍 Field mapping confirmed, proceeding with processing');
        console.log('🔍 Final mapping:', mapping);
        console.log('🔍 Current file before processing:', this.currentFile);
        
        // CRITICAL DEBUG: Verify file is still available
        if (!this.currentFile) {
            console.error('❌ CRITICAL: this.currentFile is null/undefined in confirmFieldMapping!');
            this.app.showError('❌ File reference lost. Please refresh the page and try again.');
            return;
        }
        
        this.hideFieldMappingModal();
        
        // CRITICAL FIX: Process the file directly with field mapping instead of calling processWithOptions
        // This prevents the infinite loop that was causing the field mapping requirement to appear again
        this.processFileWithFieldMapping(mapping);
    }

    // NEW METHOD: Process file with field mapping
    async processFileWithFieldMapping(fieldMapping) {
        try {
            console.log('🚀 Processing file with field mapping:', fieldMapping);
            
            if (!this.currentFile) {
                throw new Error('No file selected for processing');
            }

            // Show processing message
            this.app.showLoading('🔄 Processing your inventory with AI pricing... This may take several minutes for large files.');
            
            const tolerancePct = parseInt(document.getElementById('priceTolerance')?.value);
            if (!tolerancePct || tolerancePct <= 0) {
                this.app.showError('Please select a valid tolerance percentage');
                return;
            }
            
            const processingOptions = {
                tolerancePct,
                fieldMapping
            };
            
            // CRITICAL FIX: For Excel files, we need to ensure we have a selected sheet
            // Check if this is an Excel file and we need sheet selection
            if (this.currentFile.name.toLowerCase().endsWith('.xlsx') || this.currentFile.name.toLowerCase().endsWith('.xls')) {
                console.log('🔍 Excel file detected, checking if we need sheet selection...');
                
                // If we don't have a selectedSheet in options, we need to get it
                if (!processingOptions.selectedSheet) {
                    console.log('🔍 No sheet selected, getting sheet info first...');
                    try {
                        const sheetInfo = await this.app.apiService.getSheetInfo(this.currentFile);
                        const responseData = sheetInfo.data;
                        
                        if (responseData.type === 'sheet_selection' && responseData.sheets && responseData.sheets.length > 1) {
                            console.log('📄 Multiple sheets detected, need user to select sheet first');
                            this.app.hideLoading();
                            this.app.showError('⚠️ Please select a sheet to process first.');
                            this.showSheetSelectionModal(responseData.sheets);
                            return;
                        } else if (responseData.sheets && responseData.sheets.length === 1) {
                            // Auto-select the single sheet
                            processingOptions.selectedSheet = responseData.sheets[0];
                            console.log('📄 Auto-selected single sheet:', processingOptions.selectedSheet);
                        }
                    } catch (sheetError) {
                        console.error('❌ Error getting sheet info:', sheetError);
                        // Continue without sheet selection for now
                    }
                }
            }
            
            console.log('🔍 API call about to be made with:', this.currentFile, processingOptions);
            const result = await this.app.apiService.processEnhanced(this.currentFile, processingOptions);
            console.log('🔍 Raw API response:', result);
            
            if (result.data.type === 'processing_complete') {
                this.app.hideLoading();
                this.app.showSuccess('✅ Enhanced processing completed! Processed ' + result.data.processedRows + ' items.');
                
                // Validate the result data before displaying
                if (result.data.results && Array.isArray(result.data.results)) {
                    this.displayEnhancedResults(result.data);
                } else {
                    console.error('❌ Invalid result data structure:', result.data);
                    this.app.showError('❌ Processing completed but results data is invalid. Please try again.');
                }
            } else if (result.data.type === 'mapping_required') {
                // This shouldn't happen now since we're passing field mapping
                console.error('❌ Field mapping still required after providing mapping:', result.data);
                this.app.hideLoading();
                this.app.showError('❌ Field mapping failed. Please try again or contact support.');
            } else if (result.data.type === 'sheet_selection') {
                this.app.hideLoading();
                this.app.showError('⚠️ Please select a sheet to process.');
                this.showSheetSelectionModal(result.data.sheets);
            } else {
                this.app.hideLoading();
                this.app.showError('❌ Unexpected response type: ' + result.data.type);
            }
        } catch (error) {
            console.error('❌ Processing with field mapping error:', error);
            this.app.hideLoading();
            this.app.showError('❌ Processing failed: ' + error.message);
        }
    }

    // REMOVED: Chunked processing progress indicator to eliminate 404 errors
    
    // REMOVED: Chunked processing progress update to eliminate 404 errors
    
    // REMOVED: All remaining chunked processing methods to eliminate 404 errors
    // The app now only uses optimized regular processing with backend batch optimization

    ensureProperSpacing(section) {
        console.log('🔍 Ensuring proper spacing for section:', section);
        try {
            section.style.marginBottom = '200px';
            section.style.paddingBottom = '80px';
            section.style.minHeight = '400px';
            
            // FIXED: Ensure table containers have proper spacing
            const tableContainers = section.querySelectorAll('.processing-results-table-container, .enhanced-results-table-container');
            tableContainers.forEach(container => {
                container.style.marginBottom = '100px';
                container.style.paddingBottom = '50px';
                container.style.minHeight = '600px';
                container.style.overflow = 'visible';
            });
            
            // FIXED: Ensure pagination is visible
            const paginationElements = section.querySelectorAll('.enhanced-pagination');
            paginationElements.forEach(pagination => {
                pagination.style.marginBottom = '50px';
                pagination.style.paddingBottom = '20px';
                pagination.style.position = 'relative';
                pagination.style.zIndex = '20';
            });
            
            const container = section.closest('.chatgpt-container');
            if (container) {
                container.style.paddingBottom = '300px';
                container.style.minHeight = '100vh';
            }
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.paddingBottom = '200px';
                mainContent.style.minHeight = '100vh';
            }
            section.offsetHeight; // Force reflow
            console.log('✅ Applied proper spacing to prevent display cutting');
        } catch (error) {
            console.warn('⚠️ Error applying spacing:', error);
        }
    }
    
    adjustPageHeight(section) {
        try {
            // Calculate the required height
            const sectionHeight = section.scrollHeight;
            const windowHeight = window.innerHeight;
            const requiredHeight = Math.max(windowHeight * 1.2, sectionHeight + 400);
            
            // Adjust body height
            document.body.style.minHeight = `${requiredHeight}px`;
            document.body.style.paddingBottom = '200px';
            
            // Adjust main container height
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                mainContainer.style.minHeight = `${requiredHeight}px`;
                mainContainer.style.paddingBottom = '150px';
            }
            
            // Adjust main content height
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.minHeight = `${requiredHeight}px`;
                mainContent.style.paddingBottom = '250px';
            }
            
            // Adjust chatgpt container height
            const chatgptContainer = section.closest('.chatgpt-container');
            if (chatgptContainer) {
                chatgptContainer.style.minHeight = `${requiredHeight}px`;
                chatgptContainer.style.paddingBottom = '350px';
            }
            
            console.log('✅ Adjusted page height to prevent cutting:', requiredHeight);
        } catch (error) {
            console.warn('⚠️ Error adjusting page height:', error);
        }
    }
    
    resetPageHeight() {
        try {
            // Reset body height
            document.body.style.minHeight = '100vh';
            document.body.style.paddingBottom = '50px';
            
            // Reset main container height
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                mainContainer.style.minHeight = '100vh';
                mainContainer.style.paddingBottom = '50px';
            }
            
            // Reset main content height
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.minHeight = '100vh';
                mainContent.style.paddingBottom = '120px';
            }
            
            // Reset chatgpt container height
            const chatgptContainer = document.querySelector('.chatgpt-container');
            if (chatgptContainer) {
                chatgptContainer.style.minHeight = '100vh';
                chatgptContainer.style.paddingBottom = '150px';
            }
            
            // Scroll to top to show the welcome content
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            console.log('✅ Reset page height to normal dimensions and scrolled to top');
        } catch (error) {
            console.warn('⚠️ Error resetting page height:', error);
        }
    }

    /**
     * FIXED: Ensure pagination is visible and working properly
     */
    ensurePaginationVisibility(section) {
        console.log('🔍 Ensuring pagination visibility for section:', section);
        try {
            // Wait a bit for the table to be rendered
            setTimeout(() => {
                const paginationElements = section.querySelectorAll('.enhanced-pagination');
                if (paginationElements.length > 0) {
                    console.log(`✅ Found ${paginationElements.length} pagination elements`);
                    paginationElements.forEach((pagination, index) => {
                        pagination.style.display = 'flex';
                        pagination.style.visibility = 'visible';
                        pagination.style.opacity = '1';
                        pagination.style.marginBottom = '50px';
                        pagination.style.paddingBottom = '20px';
                        pagination.style.position = 'relative';
                        pagination.style.zIndex = '20';
                        
                        // Ensure pagination buttons are clickable
                        const buttons = pagination.querySelectorAll('.page-btn');
                        buttons.forEach(button => {
                            button.style.pointerEvents = 'auto';
                            button.style.cursor = 'pointer';
                        });
                        
                        console.log(`✅ Enhanced pagination element ${index + 1}`);
                    });
                } else {
                    console.log('⚠️ No pagination elements found');
                }
            }, 500);
        } catch (error) {
            console.warn('⚠️ Error ensuring pagination visibility:', error);
        }
    }

    /**
     * FIXED: Force pagination visibility as a fallback
     */
    forcePaginationVisibility(section) {
        console.log('🔍 Force ensuring pagination visibility for section:', section);
        try {
            const paginationElements = section.querySelectorAll('.enhanced-pagination');
            if (paginationElements.length > 0) {
                console.log(`✅ Force found ${paginationElements.length} pagination elements`);
                paginationElements.forEach((pagination, index) => {
                    // Force all CSS properties
                    pagination.style.cssText = `
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        margin-top: 30px !important;
                        margin-bottom: 40px !important;
                        padding: 16px !important;
                        position: relative !important;
                        z-index: 999 !important;
                        background: #f8f9fa !important;
                        border: 1px solid #e5e7eb !important;
                        border-radius: 8px !important;
                        min-height: 60px !important;
                        width: 100% !important;
                        overflow: visible !important;
                    `;
                    
                    // Ensure pagination buttons are clickable
                    const buttons = pagination.querySelectorAll('.page-btn');
                    buttons.forEach(button => {
                        button.style.cssText = `
                            padding: 8px 12px !important;
                            border: 1px solid #e5e7eb !important;
                            background: #fff !important;
                            color: #374151 !important;
                            border-radius: 8px !important;
                            cursor: pointer !important;
                            font-size: 13px !important;
                            font-weight: 500 !important;
                            pointer-events: auto !important;
                        `;
                    });
                    
                    console.log(`✅ Force enhanced pagination element ${index + 1}`);
                });
            } else {
                console.log('⚠️ Force: No pagination elements found');
            }
        } catch (error) {
            console.warn('⚠️ Error force ensuring pagination visibility:', error);
        }
    }

    /**
     * FIXED: Initialize pagination functionality
     */
    initializePagination(section) {
        console.log('🔍 Initializing pagination for section:', section);
        try {
            const paginationElements = section.querySelectorAll('.enhanced-pagination');
            if (paginationElements.length > 0) {
                console.log(`✅ Initializing ${paginationElements.length} pagination elements`);
                paginationElements.forEach((pagination, index) => {
                    // Ensure pagination is visible
                    pagination.style.display = 'flex';
                    pagination.style.visibility = 'visible';
                    pagination.style.opacity = '1';
                    
                    // Add click event listeners for pagination buttons
                    const buttons = pagination.querySelectorAll('.page-btn');
                    buttons.forEach(button => {
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('📄 Pagination button clicked:', button.textContent);
                        });
                    });
                    
                    // Add change event listener for page size selector
                    const pageSizeSelector = pagination.querySelector('#page-size-selector');
                    if (pageSizeSelector) {
                        pageSizeSelector.addEventListener('change', (e) => {
                            console.log('📄 Page size changed to:', e.target.value);
                        });
                    }
                    
                    console.log(`✅ Initialized pagination element ${index + 1}`);
                });
            } else {
                console.log('⚠️ No pagination elements found for initialization');
            }
        } catch (error) {
            console.warn('⚠️ Error initializing pagination:', error);
        }
    }

    /**
     * FIXED: Test pagination functionality to ensure it's working
     */
    testPaginationFunctionality(section) {
        console.log('🔍 Testing pagination functionality for section:', section);
        try {
            const paginationElements = section.querySelectorAll('.enhanced-pagination');
            if (paginationElements.length > 0) {
                console.log(`✅ Testing ${paginationElements.length} pagination elements`);
                paginationElements.forEach((pagination, index) => {
                    // Test pagination visibility
                    const isVisible = pagination.style.display !== 'none' && 
                                    pagination.style.visibility !== 'hidden' && 
                                    pagination.style.opacity !== '0';
                    console.log(`📄 Pagination ${index + 1} visibility:`, isVisible);
                    
                    // Test pagination buttons
                    const buttons = pagination.querySelectorAll('.page-btn');
                    console.log(`📄 Pagination ${index + 1} buttons found:`, buttons.length);
                    
                    // Test page size selector
                    const pageSizeSelector = pagination.querySelector('#page-size-selector');
                    if (pageSizeSelector) {
                        console.log(`📄 Pagination ${index + 1} page size selector found:`, pageSizeSelector.value);
                    } else {
                        console.log(`⚠️ Pagination ${index + 1} page size selector not found`);
                    }
                    
                    // Test pagination info
                    const pageInfo = pagination.querySelector('.page-info');
                    if (pageInfo) {
                        console.log(`📄 Pagination ${index + 1} info:`, pageInfo.textContent);
                    } else {
                        console.log(`⚠️ Pagination ${index + 1} page info not found`);
                    }
                    
                    console.log(`✅ Pagination ${index + 1} test completed`);
                });
            } else {
                console.log('⚠️ No pagination elements found for testing');
            }
        } catch (error) {
            console.warn('⚠️ Error testing pagination functionality:', error);
        }
    }
}
