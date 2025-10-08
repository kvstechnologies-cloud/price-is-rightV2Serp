import { Sidebar } from './components/Sidebar.js';
import ChatGPTInterface from './components/ChatGPTInterface.js';
import { AuthComponent } from './components/AuthComponent.js';
import { ApiService } from './services/ApiService.js';
import { EnhancedProcessing } from './components/EnhancedProcessing.js';
import { appConfig } from './config/app-config.js';
import { AuthDebugger } from './utils/auth-debug.js';

// App configuration loaded successfully
console.log('🔧 App configuration loaded:', appConfig);

class InsurancePricingApp {
    constructor() {
        console.log('🚀 InsurancePricingApp constructor called - VERSION 6');
        
        // Prevent multiple initialization
        if (window.appInstance) {
            console.log('App already exists, returning existing instance');
            return window.appInstance;
        }

        this.apiService = null; // Will be initialized after config is loaded
        this.sidebar = null;
        this.voiceInput = null;
        this.currentSection = 'home';
        this.initialized = false;
        this.authComponent = null;
        this.isAuthenticated = false;
        this.enhancedProcessing = null;

        window.appInstance = this;
        window.app = this; // Make app globally accessible for onclick attributes
        this.init();
        
        // Return the instance to ensure proper assignment
        return this;
    }

    async init() {
        if (this.initialized) {
            console.log('App already initialized, skipping...');
            return;
        }

        console.log('Initializing app...');

        try {
            // Initialize authentication first
            await this.initializeAuthentication();
            
            // Only proceed if authenticated
            if (this.isAuthenticated) {
                // Initialize theme first
                this.initializeTheme();
                
                // Initialize components
                this.initializeSidebar();
                
                // Note: ChatGPTInterface will be initialized in showMainApplication()
                // after the DOM elements are created
                
                this.bindGlobalEvents();

                // Initialize voice input
                this.initializeVoiceInput();

                // Initialize enhanced processing after DOM is created
                this.initializeEnhancedProcessing();

                // Load initial section
                this.loadSection('home');

                // Initialize button state after components are ready
                this.updateSendButtonState();

                // Hide loading screen
                this.hideLoadingScreen();
            }

            this.initialized = true;
            console.log('Insurance Pricing System initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.hideLoadingScreen();
        } finally {
            // Ensure loading screen is hidden even if there are errors
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1000);
        }
    }

    async initializeAuthentication() {
        const mainContainer = document.getElementById('main-container');
        if (!mainContainer) {
            throw new Error('Main container not found');
        }

        // App configuration loaded successfully
        console.log('App configuration ready');

        // Initialize ApiService after configuration is loaded
        if (!this.apiService) {
            console.log('🔧 Initializing ApiService with configuration:', window.CONFIG);
            this.apiService = new ApiService();
            console.log('🔧 ApiService initialized:', this.apiService);
        } else {
            console.log('🔧 ApiService already exists:', this.apiService);
        }

        // Create auth component
        this.authComponent = new AuthComponent(mainContainer);
        
        // Set login success callback
        this.authComponent.setLoginSuccessCallback(() => {
            this.isAuthenticated = true;
            this.showMainApplication();
        });
        
        // Wait for auth to initialize
        await this.authComponent.init();
        
        // Check authentication status
        const authStatus = this.authComponent.getAuthStatus();
        this.isAuthenticated = authStatus.isAuthenticated;
        
        if (!this.isAuthenticated) {
            // Show login form
            this.authComponent.render();
            console.log('User not authenticated, showing login form');
            // Hide loading screen when showing login form
            this.hideLoadingScreen();
            return;
        }
        
        // User is authenticated, show main app
        console.log('User authenticated, showing main application');
        this.showMainApplication();
    }

    showMainApplication() {
        const mainContainer = document.getElementById('main-container');
        if (mainContainer) {
            // Restore the original main app HTML
            mainContainer.innerHTML = `
                <!-- Sidebar Toggle Button -->
                <button id="sidebar-toggle" class="sidebar-toggle" title="Open sidebar">
                    <i class="fas fa-bars"></i>
                </button>

                <!-- Sidebar Overlay for Mobile -->
                <div id="sidebar-overlay" class="sidebar-overlay"></div>

                <!-- Sidebar -->
                <div id="sidebar" class="sidebar">
                    <div class="sidebar-header">
                        <div class="logo">
                            <i class="fas fa-rocket"></i>
                            <span>PRICING INTELLIGENCE</span>
                        </div>
                        <button id="sidebar-close" class="sidebar-close" title="Close sidebar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="sidebar-nav">
                        <ul class="nav-list">
                            <li class="nav-item active" data-section="home">
                                <i class="fas fa-home"></i>
                                <span>Home</span>
                            </li>
                            <li class="nav-item" data-section="info">
                                <i class="fas fa-info-circle"></i>
                                <span>Info</span>
                            </li>
                            <li class="nav-item" data-section="settings">
                                <i class="fas fa-lock"></i>
                                <span>Settings</span>
                            </li>
                            <li class="nav-item" data-section="profile">
                                <i class="fas fa-user"></i>
                                <span>Profile</span>
                            </li>
                            <li class="nav-item" data-section="admin">
                                <i class="fas fa-cog"></i>
                                <span>Admin</span>
                            </li>
                            <li class="nav-item" data-section="audit">
                                <i class="fas fa-chart-bar"></i>
                                <span>Audit Dashboard</span>
                            </li>
                        </ul>
                    </div>

                    <div class="sidebar-footer">
                        <div class="nav-item logout" data-section="logout">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </div>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div id="main-content" class="main-content viewport-height">
                    <!-- Theme Toggle Button -->
                    <div class="theme-toggle-container">
                        <button id="theme-toggle-btn" class="theme-toggle-btn" title="Toggle theme">
                            <i class="fas fa-sun"></i>
                        </button>
                    </div>

                    <!-- ChatGPT-Style Container -->
                    <div class="chatgpt-container viewport-height">
                        <!-- Welcome Content -->
                        <div class="welcome-content">
                            <div class="welcome-icon">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <h1>Insurance Pricing Assistant</h1>
                        </div>

                        <!-- Chat Messages (initially hidden) -->
                        <div id="chat-messages" class="chat-messages hidden"></div>

                        <!-- ChatGPT-Style Input Container -->
                        <div class="chatgpt-input-section">
                            <!-- Selected Files Display -->
                            <div id="selected-files" class="selected-files hidden">
                                <div class="files-container"></div>
                            </div>

                            <!-- Main Input Container -->
                            <div class="input-container">
                                <!-- Left Actions -->
                                <div class="input-actions-left">
                                    <button id="add-btn" class="add-btn" title="Add files">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                    <button id="tools-btn" class="tools-btn" title="Price Tolerance">
                                        <i class="fas fa-wrench"></i>
                                        <span>Tools</span>
                                    </button>
                                </div>

                                <!-- Text Input -->
                                <textarea 
                                    id="chat-input" 
                                    placeholder="Find your product price..."
                                    rows="1"
                                ></textarea>

                                <!-- Right Actions -->
                                <div class="input-actions">
                                    <button id="voice-btn" class="voice-btn" title="Voice input">
                                        <i class="fas fa-microphone"></i>
                                    </button>
                                    <button id="send-btn" class="send-btn" title="Find Price" disabled>
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Powered by text -->
                            <div class="powered-by">
                                Powered by KVS Technologies
                            </div>
                        </div>
                    </div>

                    <!-- Results Section (Legacy) -->
                    <div id="results-section" class="results-section hidden">
                        <div class="results-header">
                            <h2>Processing Results</h2>
                            <div class="results-controls">
                                <button id="download-results" class="download-btn">
                                    <i class="fas fa-download"></i>
                                    Download Results
                                </button>
                                <button id="clear-results" class="clear-btn">
                                    <i class="fas fa-times"></i>
                                    Clear Results
                                </button>
                            </div>
                        </div>
                        <div id="results-content"></div>
                    </div>

                    <!-- Enhanced Processing Results Section -->
                    <div id="enhanced-results-section" class="enhanced-results-section hidden">
                        <div class="processing-results-header">
                            <div class="processing-results-top-bar">
                                <div class="processing-results-title">Processing Results</div>
                                <div class="processing-results-actions">
                                    <button id="enhanced-download-excel-btn" class="btn btn-primary">
                                        <i class="fas fa-download"></i>
                                        Download Excel
                                    </button>
                                    <button id="enhanced-clear-results" class="btn btn-outline-danger">
                                        <i class="fas fa-times"></i>
                                        Clear Results
                                    </button>
                                </div>
                            </div>
                            <div class="processing-results-summary">
                                <div class="summary-card">
                                    <div class="stat-icon">📋</div>
                                    <div class="summary-card-content">
                                        <div class="summary-card-value" id="enhanced-total-items">0</div>
                                        <div class="summary-card-label">Total Items</div>
                                    </div>
                                </div>
                                <div class="summary-card">
                                    <div class="stat-icon" style="background: #ecfdf5; color: var(--green);">✔</div>
                                    <div class="summary-card-content">
                                        <div class="summary-card-value" id="enhanced-found-prices">0</div>
                                        <div class="summary-card-label">Found Prices</div>
                                    </div>
                                </div>
                                <div class="summary-card success">
                                    <div class="stat-icon" style="background: #ecfdf5; color: var(--green);">📈</div>
                                    <div class="summary-card-content">
                                        <div class="summary-card-value" id="enhanced-success-rate">0%</div>
                                        <div class="summary-card-label">Success Rate</div>
                                    </div>
                                </div>
                                <div class="summary-card warning">
                                    <div class="stat-icon" style="background: #fef3c7; color: var(--amber);">⏱</div>
                                    <div class="summary-card-content">
                                        <div class="summary-card-value" id="enhanced-processing-time">0s</div>
                                        <div class="summary-card-label">Processing Time</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="enhanced-results-content"></div>
                    </div>
                </div>

                <!-- Attachment Popup -->
                <div id="attachment-popup" class="attachment-popup hidden">
                    <div class="popup-section">
                        <button class="popup-item" data-action="add-files">
                            <i class="fas fa-upload"></i>
                            <span>Upload from computer</span>
                        </button>
                        <button class="popup-item" data-action="add-from-apps">
                            <i class="fas fa-cloud"></i>
                            <span>Add from Google Drive or OneDrive</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <!-- Cloud Storage Popup -->
                <div id="cloud-storage-popup" class="cloud-storage-popup hidden">
                    <div class="popup-section">
                        <button class="popup-item" data-action="google-drive">
                            <i class="fab fa-google-drive"></i>
                            <span>Google Drive</span>
                        </button>
                        <button class="popup-item" data-action="onedrive-personal">
                            <i class="fab fa-microsoft"></i>
                            <span>OneDrive Personal</span>
                        </button>
                        <button class="popup-item" data-action="onedrive-work">
                            <i class="fas fa-building"></i>
                            <span>OneDrive for Business</span>
                        </button>
                    </div>
                </div>

                <!-- Tools Popup -->
                <div id="tools-popup" class="tools-popup hidden">
                    <div class="tool-item">
                        <div class="tool-label">
                            <i class="fas fa-percentage"></i>
                            <span>Price Tolerance</span>
                        </div>
                        <select id="priceTolerance" class="tolerance-dropdown">
                            <option value="10">±10% (Very Strict)</option>
                            <option value="20" >±20% (Strict)</option>
                            <option value="30">±30% (Moderate)</option>
                            <option value="50" selected>±50% (Flexible)</option>
                            <option value="75">±75% (Very Flexible)</option>
                        </select>
                    </div>
                    
                </div>

                <!-- Sheet Selection Modal -->
                <div id="sheet-selection-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Select Sheet to Process</h3>
                            <button id="sheet-selection-close" class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>This Excel file contains multiple sheets. Please select one sheet to process:</p>
                            <div id="sheet-list" class="sheet-list"></div>
                        </div>
                        <div class="modal-footer">
                            <button id="cancel-sheet-selection" class="btn btn-secondary">Cancel</button>
                            <button id="confirm-sheet-selection" class="btn btn-primary">Confirm Selection</button>
                        </div>
                    </div>
                </div>

                <!-- Field Mapping Modal -->
                <div id="field-mapping-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Field Mapping Required</h3>
                            <button id="field-mapping-close" class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Please map the following fields to your CSV/Excel columns:</p>
                            <form id="field-mapping-form" class="field-mapping-form"></form>
                        </div>
                        <div class="modal-footer">
                            <button id="cancel-field-mapping" class="btn btn-secondary">Cancel</button>
                            <button id="confirm-field-mapping" class="btn btn-primary">Confirm Mapping</button>
                        </div>
                    </div>
                </div>

                <!-- Drag Overlay -->
                <div id="drag-overlay" class="drag-overlay">
                    <div class="drag-overlay-content">
                        <i class="fas fa-file-upload"></i>
                        <h3>Drop files here</h3>
                        <p>Release to upload your documents</p>
                    </div>
                </div>

                <!-- Hidden File Input -->
                <input type="file" id="file-input" multiple accept=".csv,.xls,.xlsx,.xlsm,.xlsb,image/*" style="display: none;">
            `;

            // Re-initialize components after showing main app
            this.initializeTheme();
            this.initializeSidebar();
            
            // Initialize ChatGPTInterface after DOM elements are created
            if (!this.chatGPTInterface) {
                this.initializeChatGPTInterface();
            }
            
            // Refresh the interface to ensure it's properly set up with the new DOM
            this.refreshChatGPTInterface();
            
            this.initializeEnhancedProcessing();
            this.bindGlobalEvents();
            this.initializeVoiceInput();
            
            // Ensure buttons are set up after all components are initialized
                        setTimeout(() => {
                this.setupButtons();

                // Initialize button state after all components are ready
                this.updateSendButtonState();
            }, 100);
            
            this.loadSection('home');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.remove();
                }
            }, 500);
        }
    }

    initializeSidebar() {
        const sidebarElement = document.getElementById('sidebar');
        if (sidebarElement) {
            this.sidebar = new Sidebar({
                container: sidebarElement,
                onNavigate: (section) => this.handleNavigation(section)
            });
        }
    }

    initializeChatGPTInterface() {
        console.log('App: initializeChatGPTInterface called');
        const mainContent = document.getElementById('main-content');
        console.log('App: mainContent found:', !!mainContent);
        
        if (mainContent) {
            // Clean up existing instance if it exists
            if (this.chatGPTInterface) {
                console.log('App: Cleaning up existing ChatGPTInterface instance');
                // Remove event listeners from the existing instance
                this.chatGPTInterface.cleanup();
                this.chatGPTInterface = null;
            }
            
            console.log('App: Creating new ChatGPTInterface instance');
            this.chatGPTInterface = new ChatGPTInterface(mainContent);

            this.chatGPTInterface.onFilesSelected = (files) => {
                console.log('Files selected via ChatGPT interface:', files);
                // Update send button state when files are selected
                this.updateSendButtonState();
            };

            this.chatGPTInterface.onToleranceChange = (tolerance) => {
                console.log('Price tolerance changed:', tolerance);
            };
            
            console.log('App: ChatGPTInterface initialization completed');
        } else {
            console.error('App: main-content element not found, cannot initialize ChatGPTInterface');
        }
    }

    refreshChatGPTInterface() {
        // This method can be called when the DOM changes to ensure the interface is properly set up
        console.log('App: refreshChatGPTInterface called');
        if (this.chatGPTInterface) {
            console.log('App: Refreshing ChatGPTInterface');
            this.chatGPTInterface.ensurePopupElementsExist();
        } else {
            console.warn('App: No ChatGPTInterface instance to refresh');
        }
    }

    cleanupGlobalEvents() {
        // Reset the global events bound flag to allow re-binding
        this._globalEventsBound = false;
    }

    initializeEnhancedProcessing() {
        this.enhancedProcessing = new EnhancedProcessing(this);
        console.log('✅ Enhanced Processing component initialized');
    }

    bindGlobalEvents() {
        console.log('🔗 Binding global events...');
        
        // Send button functionality
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');

        if (sendBtn && chatInput) {
            console.log('✅ Found send button and chat input, setting up events');
            
            sendBtn.onclick = () => this.handleSendMessage();

            chatInput.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            };

            // Simple: Enable button when there's text, disable when empty
            chatInput.oninput = () => {
                const hasText = chatInput.value.trim().length > 0;
                const hasFiles = this.chatGPTInterface && this.chatGPTInterface.getSelectedFiles().length > 0;
                
                // Enable button if there's text OR files
                sendBtn.disabled = !(hasText || hasFiles);
                
                // Auto-resize textarea
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            };
        } else {
            console.warn('⚠️ Send button or chat input not found');
        }

        // Setup sidebar toggle
        this.setupSidebarToggle();

        // Setup other buttons
        this.setupButtons();
        
        this._globalEventsBound = true;
    }

    setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');

        console.log('Setting up sidebar toggle...', {
            sidebarToggle: !!sidebarToggle,
            sidebar: !!sidebar,
            mainContent: !!mainContent
        });

        if (sidebarToggle && sidebar && mainContent) {
            sidebarToggle.onclick = () => {
                sidebar.classList.toggle('active');
                mainContent.classList.toggle('sidebar-open');
            };
        }
    }

    updateSendButtonState() {
        // This method now only handles file changes, text input is handled directly in the oninput event
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (sendBtn && chatInput) {
            const hasText = chatInput.value.trim().length > 0;
            const hasFiles = this.chatGPTInterface && this.chatGPTInterface.getSelectedFiles().length > 0;
            
            // Enable button if there's text OR files
            sendBtn.disabled = !(hasText || hasFiles);
        }
    }

    setupButtons() {
        console.log('Setting up buttons...'); // Debug log

        // Start new chat button - check multiple possible IDs
        let startNewChatBtn = document.getElementById('start-new-chat-btn');
        if (!startNewChatBtn) {
            startNewChatBtn = document.getElementById('start-new-chat-button');
        }
        if (!startNewChatBtn) {
            // Look for any button with "start" and "chat" in the text
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent && btn.textContent.toLowerCase().includes('start') && btn.textContent.toLowerCase().includes('chat')) {
                    startNewChatBtn = btn;
                    break;
                }
            }
        }
        
        if (startNewChatBtn) {
            startNewChatBtn.addEventListener('click', () => {
                console.log('Start new chat button clicked');
                this.showActiveChatArea();
            });
            console.log('✅ Start new chat button found and bound');
        } else {
            console.log('ℹ️ Start new chat button not found - this is normal if using the new layout');
        }

        // Note: Add button (+ button) and Tools button are handled by ChatGPTInterface
        // No need to set up click handlers here to avoid conflicts

        // Voice button (only button not handled by ChatGPTInterface)
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.onclick = () => {
                console.log('Voice button clicked');
                this.openVoiceModal();
            };
            console.log('✅ Voice button found and bound');
        } else {
            console.warn('⚠️ Voice button not found');
        }
    }

    showActiveChatArea() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const activeChatArea = document.getElementById('active-chat-area');
        
        console.log('🔍 Debug: showActiveChatArea called, elements found:', {
            welcomeScreen: !!welcomeScreen,
            activeChatArea: !!activeChatArea
        });
        
        if (welcomeScreen && activeChatArea) {
            welcomeScreen.classList.add('hidden');
            activeChatArea.classList.remove('hidden');
            console.log('✅ Active chat area shown, welcome screen hidden');
            
            // After showing the chat area, ensure the button state is updated
            setTimeout(() => {
                console.log('🔍 Debug: Updating button state after showing chat area');
                this.updateSendButtonState();
            }, 100);
        } else {
            console.warn('⚠️ Welcome screen or active chat area not found');
        }
    }

    async handleSendMessage(message, files) {
        console.log('🔍 Frontend Debug: handleSendMessage called with:', { message, files });
        
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const chatMessages = document.getElementById('chat-messages');
        const welcomeContent = document.querySelector('.welcome-content');

        console.log('🔍 Frontend Debug: DOM elements found:', {
            chatInput: !!chatInput,
            sendBtn: !!sendBtn,
            chatMessages: !!chatMessages,
            welcomeContent: !!welcomeContent
        });

        if (!message && chatInput) {
            message = chatInput.value.trim();
            console.log('🔍 Frontend Debug: Extracted message from input:', message);
        }

        const selectedFiles = this.chatGPTInterface?.getSelectedFiles() || files || [];
        
        // Allow sending if there's either a message or files
        if (!message && selectedFiles.length === 0) return;

        try {
            if (welcomeContent && chatMessages) {
                welcomeContent.style.display = 'none';
                chatMessages.classList.remove('hidden');
                chatMessages.style.display = 'flex';
            }

            if (chatInput) {
                chatInput.value = '';
                chatInput.style.height = 'auto';
            }
            if (sendBtn) {
                sendBtn.disabled = true;
            }

            this.chatGPTInterface?.clearFiles();
            this.updateSendButtonState();

            this.addMessageToChat({
                type: 'user',
                content: message,
                files: selectedFiles,
                timestamp: new Date()
            });

            this.showTypingIndicator();

            // Set a safety timeout to hide typing indicator after 7 minutes (for longer enhanced processing)
            const typingIndicatorTimeout = setTimeout(() => {
                console.log('⚠️ Safety timeout: Hiding typing indicator after 7 minutes');
                this.hideTypingIndicator();
            }, 420000);

            // Enhanced pricing logic
            let response;
            
            if (selectedFiles.length > 0) {
                // Handle file uploads (CSV/Excel or images)
                const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
                const csvFiles = selectedFiles.filter(file => file.name.match(/\.(csv|xlsx|xls)$/i));
                
                if (imageFiles.length > 0) {
                    // Process multiple images as a batch
                    console.log(`🔍 Frontend Debug: Processing ${imageFiles.length} image(s) as batch`);
                    
                    // Show loading indicator for image processing
                    this.showLoading('🔄 Processing images with AI Vision... This may take a few minutes.');
                    
                    try {
                        // Convert all images to base64
                        const imageDataArray = [];
                        for (const file of imageFiles) {
                            const imageData = await this.fileToBase64(file);
                            imageDataArray.push({
                                image: imageData,
                                fileName: file.name
                            });
                        }
                        
                        // Use batch processing endpoint
                        response = await this.apiService.processImages(imageDataArray);
                    } finally {
                        // Hide loading indicator (this will show disabled robot icon briefly)
                        this.hideLoading();
                    }
                } else if (csvFiles.length > 0) {
                    // Process CSV/Excel file based on processing mode
                    const file = csvFiles[0];
                    const processingMode = document.getElementById('processingMode')?.value || 'enhanced';
                    
                    if (processingMode === 'enhanced') {
                        console.log(`🚀 Using enhanced processing for file: ${file.name}`);
                        // Route to enhanced processing component
                        try {
                            await this.enhancedProcessing.processFile(file);
                        } finally {
                            // Ensure typing indicator is hidden for enhanced processing
                            this.hideTypingIndicator();
                            // Clear the safety timeout since we successfully hid the indicator
                            clearTimeout(typingIndicatorTimeout);
                        }
                        return; // Exit early since enhanced processing handles the response
                    } else {
                        console.log(`🔄 Using legacy CSV processing for file: ${file.name}`);
                        
                        // Show loading indicator for CSV processing
                        this.showLoading('🔄 Processing CSV file... This may take several minutes.');
                        
                        try {
                            response = await this.apiService.processCSV(file, {
                                priceTolerance: parseInt(document.getElementById('priceTolerance')?.value) || 10
                            });
                        } finally {
                            // Hide loading indicator (this will show disabled robot icon briefly)
                            this.hideLoading();
                        }
                    }
                } else {
                    throw new Error('Unsupported file type. Please upload an image or CSV/Excel file.');
                }
            } else if (message && message.trim()) {
                // Process single item text
                console.log('🔍 Frontend Debug: Processing text message:', message.trim());
                
                // Show loading indicator for single item processing
                this.showLoading('🔍 Searching for product pricing... This may take a moment.');
                
                try {
                    // Extract cost information from the message
                    const { description, costToReplace } = this.extractCostFromMessage(message.trim());
                    
                    response = await this.apiService.processItem({
                        description: description,
                        costToReplace: costToReplace,
                        priceTolerance: parseInt(document.getElementById('priceTolerance')?.value) || 10
                    });
                    console.log('🔍 Frontend Debug: API response received:', response);
                } finally {
                    // Hide loading indicator (this will show disabled robot icon briefly)
                    this.hideLoading();
                }
            } else {
                throw new Error('Please provide a message or upload a file.');
            }

            this.hideTypingIndicator();
            
            // Clear the safety timeout since we successfully hid the indicator
            clearTimeout(typingIndicatorTimeout);

            // Handle the response
            console.log('🔍 Frontend Debug: Response received:', response);
            
            // Extract the actual response data from the API service wrapper
            const actualResponse = response.data || response;
            console.log('🔍 Frontend Debug: Actual response data:', actualResponse);
            console.log('🔍 Frontend Debug: Response keys:', Object.keys(actualResponse || {}));
            console.log('🔍 Frontend Debug: Response type:', typeof actualResponse);
            console.log('🔍 Frontend Debug: Is array?', Array.isArray(actualResponse));
            
            // Consider responses successful if they explicitly mark success/type OR
            // if they contain expected pricing/result fields (common backend shapes).
            const looksLikePricingResult = actualResponse && (typeof actualResponse === 'object') && (
                actualResponse.Price !== undefined || actualResponse.price !== undefined ||
                actualResponse.URL !== undefined || actualResponse.url !== undefined ||
                actualResponse.Status !== undefined || actualResponse.status !== undefined ||
                actualResponse.results !== undefined || actualResponse.items !== undefined ||
                actualResponse.item !== undefined || actualResponse.result !== undefined || Array.isArray(actualResponse)
            );

            if (actualResponse && (actualResponse.success || actualResponse.type === 'item_processed' || actualResponse.type === 'processing_complete' || looksLikePricingResult)) {
                console.log('🔍 Frontend Debug: Response is successful');
                
                // Check for batch image processing results - display in enhanced results format like CSV/Excel
                if (actualResponse.items && Array.isArray(actualResponse.items)) {
                    console.log('🔍 Frontend Debug: Using batch image processing results:', actualResponse.items);
                    // Handle batch image processing response - display in enhanced results format like CSV/Excel
                    this.displayImageResultsInEnhancedFormat(actualResponse.items, actualResponse.fileName || 'Image Files');
                } else if (actualResponse.Price || actualResponse.price) {
                    console.log('🔍 Frontend Debug: Using top-level pricing data:', actualResponse);
                    // Handle single image analysis response with pricing data at top level
                    this.displayPricingResult(actualResponse, message);
                } else if (actualResponse.result) {
                    console.log('🔍 Frontend Debug: Using actualResponse.result:', actualResponse.result);
                    // Handle structured response from server
                    this.displayPricingResult(actualResponse.result, message);
                } else if (actualResponse.data) {
                    console.log('🔍 Frontend Debug: Using actualResponse.data:', actualResponse.data);
                    // Handle structured response (fallback)
                    this.displayPricingResult(actualResponse.data, message);
                } else if (actualResponse.data?.items || actualResponse.results || actualResponse.data?.results) {
                    console.log('🔍 Frontend Debug: Using CSV results:', actualResponse.data?.items || actualResponse.results || actualResponse.data?.results);
                    // Handle CSV processing response
                    const items = actualResponse.data?.items || actualResponse.results || actualResponse.data?.results;
                    const fileName = actualResponse.fileName || actualResponse.data?.fileName || 'CSV File';
                    const processingTime = actualResponse.processingTime || actualResponse.data?.processingTime;
                    this.displayCSVResults(items, fileName, processingTime, 'csv');
                } else if (actualResponse.summary && actualResponse.results) {
                    console.log('🔍 Frontend Debug: Using CSV results with summary:', actualResponse.results);
                    // Handle CSV processing response with summary structure
                    const processingTime = actualResponse.processingTime || actualResponse.summary?.processingTime;
                    this.displayCSVResults(actualResponse.results, actualResponse.fileName || 'CSV File', processingTime, 'summary');
                } else if (actualResponse.results) {
                    console.log('🔍 Frontend Debug: Using actualResponse.results:', actualResponse.results);
                    // Handle CSV processing response with results field
                    const processingTime = actualResponse.processingTime;
                    this.displayCSVResults(actualResponse.results, actualResponse.fileName || 'CSV File', processingTime, 'results');
                } else if (Array.isArray(actualResponse)) {
                    console.log('🔍 Frontend Debug: Using direct array response:', actualResponse);
                    // Handle direct array response
                    this.displayCSVResults(actualResponse, 'CSV File', null, 'array');
                } else if (actualResponse.data && Array.isArray(actualResponse.data)) {
                    console.log('🔍 Frontend Debug: Using actualResponse.data array:', actualResponse.data);
                    // Handle array in data field
                    const processingTime = actualResponse.processingTime || actualResponse.data?.processingTime;
                    this.displayCSVResults(actualResponse.data, actualResponse.fileName || 'CSV File', processingTime, 'data');
                } else if (actualResponse.item) {
                    console.log('🔍 Frontend Debug: Using item response:', actualResponse.item);
                    // Handle single item response from Lambda function
                    this.displayPricingResult(actualResponse.item, message);
                } else if (actualResponse.message) {
                    console.log('🔍 Frontend Debug: Using message response');
                    // Handle message response
                    this.addMessageToChat({
                        type: 'assistant',
                        content: actualResponse.message,
                        timestamp: new Date()
                    });
                } else {
                    console.log('🔍 Frontend Debug: Using fallback response');
                    // Handle other successful responses
                    this.addMessageToChat({
                        type: 'assistant',
                        content: 'Processing completed successfully.',
                        timestamp: new Date()
                    });
                }
            } else {
                console.log('🔍 Frontend Debug: Response is not successful:', actualResponse);
                // Handle error response
                const errorMessage = actualResponse?.error || actualResponse?.message || 'Failed to process request.';
                this.addMessageToChat({
                    type: 'assistant',
                    content: `❌ Error: ${errorMessage}`,
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            // Clear the safety timeout since we're handling the error
            clearTimeout(typingIndicatorTimeout);
            this.addMessageToChat({
                type: 'assistant',
                content: `❌ Error: ${error.message || 'Failed to process request. Please try again.'}`,
                timestamp: new Date()
            });
        }
    }

    // Extract cost information from message text
    extractCostFromMessage(message) {
        console.log('🔍 Frontend Debug: Extracting cost from message:', message);
        
        // Enhanced patterns to match cost information - more flexible
        const costPatterns = [
            // Explicit cost patterns
            /cost\s+(?:of\s+)?(?:replacement|total|is|to\s+replace)\s+(?:is\s+)?\$?(\d+(?:\.\d{2})?)/i,
            /replacement\s+cost\s+(?:is\s+)?\$?(\d+(?:\.\d{2})?)/i,
            /total\s+cost\s+(?:is\s+)?\$?(\d+(?:\.\d{2})?)/i,
            /price\s+(?:is\s+)?\$?(\d+(?:\.\d{2})?)/i,
            /value\s+(?:is\s+)?\$?(\d+(?:\.\d{2})?)/i,
            // Dollar sign patterns
            /\$(\d+(?:\.\d{2})?)/g,
            // Number patterns (more flexible)
            /(\d{3,4})\s*(?:dollars?|bucks?|USD?)/i,
            /(\d{3,4})\s*(?:cost|price|value)/i
        ];
        
        let costToReplace = null;
        let description = message;
        
        // Try each pattern to find cost information
        for (const pattern of costPatterns) {
            const match = message.match(pattern);
            if (match) {
                costToReplace = parseFloat(match[1]);
                console.log('🔍 Frontend Debug: Found cost:', costToReplace);
                
                // Remove the cost information from the description
                description = message.replace(pattern, '').trim();
                break;
            }
        }
        
        // If no cost found, try to infer from common product categories
        if (!costToReplace) {
            const lowerMessage = message.toLowerCase();
            
            // Refrigerator patterns
            if (lowerMessage.includes('refrigerator') || lowerMessage.includes('fridge')) {
                if (lowerMessage.includes('mini') || lowerMessage.includes('compact')) {
                    costToReplace = 200;
                } else if (lowerMessage.includes('side') || lowerMessage.includes('french')) {
                    costToReplace = 1200;
                } else if (lowerMessage.includes('bottom') || lowerMessage.includes('top')) {
                    costToReplace = 800;
                } else {
                    costToReplace = 600; // Standard refrigerator
                }
                console.log('🔍 Frontend Debug: Inferred refrigerator cost:', costToReplace);
            }
            // TV patterns
            else if (lowerMessage.includes('tv') || lowerMessage.includes('television')) {
                if (lowerMessage.includes('55') || lowerMessage.includes('65')) {
                    costToReplace = 800;
                } else if (lowerMessage.includes('75') || lowerMessage.includes('85')) {
                    costToReplace = 1500;
                } else {
                    costToReplace = 500; // Standard TV
                }
                console.log('🔍 Frontend Debug: Inferred TV cost:', costToReplace);
            }
            // Phone patterns
            else if (lowerMessage.includes('phone') || lowerMessage.includes('iphone')) {
                costToReplace = 800;
                console.log('🔍 Frontend Debug: Inferred phone cost:', costToReplace);
            }
            // Laptop patterns
            else if (lowerMessage.includes('laptop') || lowerMessage.includes('computer')) {
                costToReplace = 1000;
                console.log('🔍 Frontend Debug: Inferred laptop cost:', costToReplace);
            }
        }
        
        // Clean up the description
        description = description
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/^\s+|\s+$/g, '') // Trim whitespace
            .replace(/^(?:and|with|,)\s+/i, '') // Remove leading connectors
            .replace(/\s+(?:and|with|,)\s*$/i, '') // Remove trailing connectors
            .trim();
        
        console.log('🔍 Frontend Debug: Extracted data:', { description, costToReplace });
        
        return { description, costToReplace };
    }

    // Helper method to convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Display image processing results in enhanced format with statistics cards and data table
    displayImageResultsInEnhancedFormat(items, fileName) {
        console.log('🔍 Frontend Debug: displayImageResultsInEnhancedFormat called with:', { items, fileName });
        
        if (!items || !Array.isArray(items)) {
            console.error('🔍 Frontend Debug: items is not an array:', items);
            this.addMessageToChat({
                type: 'assistant',
                content: `❌ Error: Invalid image results format. Expected array, got ${typeof items}`,
                timestamp: new Date()
            });
            return;
        }

        // Transform image results to match enhanced processing format
        const transformedResults = {
            type: 'processing_complete',
            results: items.map((item, index) => ({
                itemNumber: index + 1,
                Description: item['Item Description'] || item.Description || item.description || 
                           item.facts?.title || item.title || `Image ${index + 1}`,
                Status: item['Search Status'] || item.Status || item.status || 'Unknown',
                Source: item['Source'] || item.Source || item.source || 'N/A',
                Price: item['Price'] || item.Price || item.price || 'N/A',
                'Total Replacement Price': item['Total Replacement Price'] || item.totalReplacementPrice || item['Price'] || item.Price || item.price || 'N/A', // FIXED: Add this field
                totalPrice: item['Total Replacement Price'] || item.totalReplacementPrice || item['Price'] || item.Price || item.price || 'N/A', // FIXED: Add this field
                URL: item['URL'] || item.URL || item.url || 'N/A',
                // Additional fields for enhanced display
                replacementSource: item['Source'] || item.Source || item.source || 'N/A',
                replacementPrice: item['Price'] || item.Price || item.price || 'N/A',
                totalReplacementPrice: item['Total Replacement Price'] || item.totalReplacementPrice || item['Price'] || item.Price || item.price || 'N/A',
                // FIXED: Preserve backend fields for proper tier detection
                pricingTier: item.pricingTier || (item.status === 'FOUND' ? 'SERP' : 'FALLBACK'), // CRITICAL FIX: Ensure pricingTier is set
                confidence: item.confidence,
                status: item.status,
                source: item.source,
                url: item.url,
                // NEW: Add depreciation fields for image results
                'Dep. Cat': item['Dep. Cat'] || item.depCat || '(Select)',
                'Dep Percent': item.depPercent || 0,
                'Dep Amount': item.depAmount || 0,
                depCat: item.depCat || item['Dep. Cat'] || '(Select)',
                depPercent: item.depPercent || 0,
                depAmount: item.depAmount || 0
            })),
            fileName: fileName,
            processedRows: items.length
        };

        // Use the enhanced processing component to display results
        if (this.enhancedProcessing) {
            console.log('🔍 Frontend Debug: Using enhanced processing to display image results');
            this.enhancedProcessing.processingStartTime = Date.now() - 5000; // Simulate 5 second processing time
            this.enhancedProcessing.displayEnhancedResults(transformedResults);
        } else {
            console.error('🔍 Frontend Debug: Enhanced processing component not available');
            // Fallback to chat display
            this.displayImageResultsInChat(items, fileName);
        }
    }

    // Display image processing results in ChatGPT interface like CSV/Excel processing
    displayImageResultsInChat(items, fileName) {
        console.log('🔍 Frontend Debug: displayImageResultsInChat called with:', { items, fileName });
        
        if (!items || !Array.isArray(items)) {
            console.error('🔍 Frontend Debug: items is not an array:', items);
            this.addMessageToChat({
                type: 'assistant',
                content: `❌ Error: Invalid image results format. Expected array, got ${typeof items}`,
                timestamp: new Date()
            });
            return;
        }

        // FIXED: Calculate success rate as Total Found Status / Total Records * 100
        const totalItems = items.length;
        const foundItems = items.filter(item => {
            const status = item['Search Status'] || item.Status || item.status;
            const s = (status || '').toString().toLowerCase();
            return s === 'found' || s === 'price found' || s === 'exact' || s === 'found exact';
        }).length;
        // FIXED: Success rate = Found items / Total items * 100 (not Found/(Found+Estimated))
        const successRate = totalItems > 0 ? Math.round((foundItems / totalItems) * 100) : 0;

        // Create summary message
        let summaryHtml = `
            <div class="image-processing-summary">
                <div class="summary-header">
                    <i class="fas fa-images" style="color: var(--accent-color);"></i>
                    <span style="color: var(--accent-color); font-weight: bold;">Image Processing Complete</span>
                </div>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Images Processed:</span>
                        <span class="stat-value">${totalItems}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Prices Found:</span>
                        <span class="stat-value">${foundItems}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Success Rate:</span>
                        <span class="stat-value">${successRate}%</span>
                    </div>
                </div>
            </div>
        `;

        // Add individual results
        items.forEach((item, index) => {
            const price = item['Price'] || item.Price || item.price;
            const source = item['Source'] || item.Source || item.source;
            const status = item['Search Status'] || item.Status || item.status || 'Unknown';
            const url = item['URL'] || item.URL || item.url;
            
            // Get description from multiple sources - prioritize backend data
            let description = item['Item Description'] || item.Description || item.description || 
                             item.facts?.title || item.title || item.item;
            if (!description || description === 'Unknown Item') {
                description = `Image ${index + 1}`;
            }

            const category = item['Cat'] || item.category;
            const subCategory = item['Sub Cat'] || item.subCategory;

            summaryHtml += `
                <div class="image-result-item">
                    <div class="result-header">
                        <i class="fas fa-image" style="color: #3498db;"></i>
                        <span style="font-weight: bold;">${description}</span>
                    </div>
                    <div class="result-details">
                        ${price && price !== 'Not found' && price !== 'N/A' ? `
                            <div class="detail-row">
                                <strong>Price:</strong> <span style="color: var(--accent-color); font-weight: bold;">${price}</span>
                            </div>
                        ` : ''}
                        ${source && source !== 'N/A' ? `
                            <div class="detail-row">
                                <strong>Source:</strong> <span class="source-pill">${source}</span>
                            </div>
                        ` : ''}
                        ${category ? `
                            <div class="detail-row">
                                <strong>Category:</strong> ${category}
                            </div>
                        ` : ''}
                        ${subCategory ? `
                            <div class="detail-row">
                                <strong>Sub Category:</strong> ${subCategory}
                            </div>
                        ` : ''}
                        <div class="detail-row">
                            <strong>Status:</strong> <span class="status-badge ${status === 'Found' || status === 'Price Found' ? 'status-found' : 'status-not-found'}">${status}</span>
                        </div>
                        ${item.aiAnalysis?.brand ? `
                            <div class="detail-row">
                                <strong>Brand:</strong> ${item.aiAnalysis.brand}
                            </div>
                        ` : ''}
                        ${item.aiAnalysis?.condition ? `
                            <div class="detail-row">
                                <strong>Condition:</strong> ${item.aiAnalysis.condition}
                            </div>
                        ` : ''}
                                                   ${item.actualMarketPrice && item.actualMarketPrice !== 'Not found' ? `
                               <div class="detail-row">
                                   <strong>Actual Market Price:</strong> <span style="color: #2ecc71; font-weight: bold;">${item.actualMarketPrice}</span>
                               </div>
                           ` : ''}
                        <!-- REMOVED: Condition adjustment display - no more condition adjustments -->
                        ${item.adjustedPrice && item.adjustedPrice !== 'Not found' ? `
                            <div class="detail-row">
                                <strong>Final Price (After Adjustment):</strong> <span style="color: #e67e22; font-weight: bold;">${item.adjustedPrice}</span>
                            </div>
                        ` : ''}
                        <!-- REMOVED: Condition note display - no more condition adjustments -->
                        ${url && url !== 'N/A' ? `
                            <div class="result-actions">
                                <button class="view-product-btn" onclick="window.open('${url}', '_blank')">
                                    <i class="fas fa-external-link-alt"></i>
                                    View Product
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        // Add the complete message to chat
        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant-message';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-cog"></i>
            </div>
            <div class="message-content">
                ${summaryHtml}
                <div class="message-time">${this.formatTime(new Date())}</div>
            </div>
        `;

        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.appendChild(messageElement);
            this.scrollToBottom(chatMessages);
            console.log('🔍 Frontend Debug: Image results added to chat interface');
        }
    }

    // Display pricing result in a structured format
    displayPricingResult(data, originalQuery) {
        console.log('🔍 Frontend Debug: displayPricingResult called with:', data);
        console.log('🔍 Frontend Debug: originalQuery:', originalQuery);
        
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) {
            console.error('🔍 Frontend Debug: chat-messages element not found');
            return;
        }

        let resultHtml = '';
        
        // Handle server response format (Price, Cat, Sub Cat, Source, URL)
        console.log('🔍 Frontend Debug: Checking for Price field:', { hasPrice: !!(data.Price || data.price), data });
        
        if (data.Price || data.price) {
            const price = data.Price || data.price;
            const category = data.Cat || data.category;
            const subCategory = data['Sub Cat'] || data.subCategory;
            const source = data.Source || data.source;
            const url = data.URL || data.url;
            // Use AI analysis data for product name if available, otherwise fall back to other sources
            const productName = data.aiAnalysis?.productName || data.productName || data.description || originalQuery;
            
            console.log('🔍 Frontend Debug: Extracted fields:', {
                price, category, subCategory, source, url, productName
            });
            
            resultHtml = `
                <div class="pricing-result">
                    <div class="result-header">
                        <i class="fas fa-check-circle" style="color: var(--accent-color);"></i>
                        <span style="color: var(--accent-color); font-weight: bold;">Replacement Price Found</span>
                    </div>
                    <div class="result-card">
                        <div class="result-left">
                            <div class="result-item">
                                <strong>Item:</strong> ${productName}
                            </div>
                            <div class="result-price">
                                <strong>Price:</strong> <span style="color: var(--accent-color); font-weight: bold;">${price}</span>
                            </div>
                            ${source ? `<div class="result-source">
                                <strong>Source:</strong> <button class="source-pill clickable" onclick="window.openUrl('${url || ''}', '${source}', '${productName || originalQuery || ''}')" title="Click to open ${source}">${source}</button>
                            </div>` : ''}
                            ${data.aiAnalysis?.brand ? `<div class="result-brand">
                                <strong>Brand:</strong> ${data.aiAnalysis.brand}
                            </div>` : ''}
                            ${data.aiAnalysis?.condition ? `<div class="result-condition">
                                <strong>Condition:</strong> ${data.aiAnalysis.condition}
                            </div>` : ''}
                        </div>
                        <div class="result-right">
                            ${category ? `<div class="result-category">
                                <strong>Category:</strong> ${category}
                            </div>` : ''}
                            ${subCategory ? `<div class="result-subcategory">
                                <strong>Sub Category:</strong> ${subCategory}
                            </div>` : ''}
                            <div class="result-query">
                                <strong>Search Query:</strong> ${data['Search Query Used'] || originalQuery}
                            </div>
                            ${data.aiAnalysis?.description ? `<div class="result-description">
                                <strong>Description:</strong> ${data.aiAnalysis.description}
                            </div>` : ''}
                        </div>
                    </div>
                    ${url ? `<div class="result-actions">
                        <button class="view-product-btn" onclick="window.open('${url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i>
                            View Product
                        </button>
                    </div>` : ''}
                </div>
            `;
        } else if (data.productName || data.description) {
            // Handle legacy format
            resultHtml = `
                <div class="pricing-result">
                    <div class="result-header">
                        <i class="fas fa-check-circle" style="color: var(--accent-color);"></i>
                        <span style="color: var(--accent-color); font-weight: bold;">Replacement Price Found</span>
                    </div>
                    <div class="result-card">
                        <div class="result-left">
                            <div class="result-item">
                                <strong>Item:</strong> ${data.productName || data.description || originalQuery}
                            </div>
                            ${data.price ? `<div class="result-price">
                                <strong>Price:</strong> <span style="color: var(--accent-color); font-weight: bold;">${data.price}</span>
                            </div>` : ''}
                            ${data.source ? `<div class="result-source">
                                <strong>Source:</strong> <button class="source-pill clickable" onclick="window.openUrl('${data.url || ''}', '${data.source}', '${data.productName || data.description || originalQuery || ''}')" title="Click to open ${data.source}">${data.source}</button>
                            </div>` : ''}
                        </div>
                        <div class="result-right">
                            ${data.category ? `<div class="result-category">
                                <strong>Category:</strong> ${data.category}
                            </div>` : ''}
                            ${data.subCategory ? `<div class="result-subcategory">
                                <strong>Sub Category:</strong> ${data.subCategory}
                            </div>` : ''}
                            <div class="result-query">
                                <strong>Search Query:</strong> ${originalQuery}
                            </div>
                        </div>
                    </div>
                    ${data.url ? `<div class="result-actions">
                        <button class="view-product-btn" onclick="window.open('${data.url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i>
                            View Product
                        </button>
                    </div>` : ''}
                </div>
            `;
        } else {
            // Generic result
            console.log('🔍 Frontend Debug: Using generic result format');
            resultHtml = `
                <div class="pricing-result">
                    <div class="result-header">
                        <i class="fas fa-info-circle" style="color: #3498db;"></i>
                        <span style="color: #3498db; font-weight: bold;">Analysis Complete</span>
                    </div>
                    <div class="result-content">
                        <p>${data.rawResponse || data.message || 'Product analysis completed successfully.'}</p>
                    </div>
                </div>
            `;
        }

        console.log('🔍 Frontend Debug: Generated resultHtml:', resultHtml);
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant-message';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-cog"></i>
            </div>
            <div class="message-content">
                ${resultHtml}
                <div class="message-time">${this.formatTime(new Date())}</div>
            </div>
        `;

        console.log('🔍 Frontend Debug: Created message element:', messageElement);
        chatMessages.appendChild(messageElement);
        console.log('🔍 Frontend Debug: Added message to chat');
        this.scrollToBottom(chatMessages);
    }

    // Display CSV processing results in dedicated section
    displayCSVResults(items, fileName, processingTime = null, source = null) {
        console.log('🔍 Frontend Debug: displayCSVResults called with:', { items, fileName, processingTime, source });
        
        if (!items || !Array.isArray(items)) {
            console.error('🔍 Frontend Debug: items is not an array:', items);
            this.addMessageToChat({
                type: 'assistant',
                content: `❌ Error: Invalid CSV results format. Expected array, got ${typeof items}`,
                timestamp: new Date()
            });
            return;
        }

        // Store results data for pagination
        this.currentResults = {
            items: items,
            fileName: fileName,
            currentPage: 1,
            itemsPerPage: 10,
            processingTime: processingTime,
            source: source // Add source field
        };

        // Show results section
        this.showResultsSection();
        
        // Render results
        this.renderResults();
    }

    // Show the results section
    showResultsSection() {
        console.log('🔍 Frontend Debug: showResultsSection called');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.showResultsSection();
            });
            return;
        }
        
        // Try multiple ways to find the results section
        let resultsSection = document.getElementById('results-section');
        if (!resultsSection) {
            console.log('🔍 Frontend Debug: Trying querySelector with ID...');
            resultsSection = document.querySelector('#results-section');
        }
        if (!resultsSection) {
            console.log('🔍 Frontend Debug: Trying querySelector with class...');
            resultsSection = document.querySelector('.results-section');
        }
        if (!resultsSection) {
            console.log('🔍 Frontend Debug: Trying querySelectorAll...');
            const allResultsSections = document.querySelectorAll('.results-section');
            if (allResultsSections.length > 0) {
                resultsSection = allResultsSections[0];
                console.log('🔍 Frontend Debug: Found results section via querySelectorAll');
            }
        }
        
        // If still not found, create it
        if (!resultsSection) {
            console.log('🔍 Frontend Debug: Results section not found, creating it...');
            resultsSection = this.createResultsSection();
            // Try to find it again after creation
            if (!resultsSection) {
                resultsSection = document.getElementById('results-section') || 
                               document.querySelector('#results-section') || 
                               document.querySelector('.results-section');
            }
        }
        
        const chatMessages = document.getElementById('chat-messages');
        
        console.log('🔍 Frontend Debug: resultsSection found:', !!resultsSection);
        console.log('🔍 Frontend Debug: chatMessages found:', !!chatMessages);
        
        if (resultsSection) {
            // Remove the hidden class to show the section
            resultsSection.classList.remove('hidden');
            // Also ensure it's visible with inline styles as backup
            resultsSection.style.display = 'block';
            resultsSection.style.visibility = 'visible';
            console.log('🔍 Frontend Debug: Results section shown');
        } else {
            console.error('🔍 Frontend Debug: Results section still not found after creation attempt!');
            // Last resort: try to create it again with a different approach
            resultsSection = this.createResultsSectionFallback();
            if (resultsSection) {
                resultsSection.classList.remove('hidden');
                resultsSection.style.display = 'block';
                resultsSection.style.visibility = 'visible';
            }
        }
        
        // Hide chat messages if they exist
        if (chatMessages) {
            chatMessages.classList.add('hidden');
            console.log('🔍 Frontend Debug: Chat messages hidden');
        }
    }

    // Create results section dynamically if it doesn't exist
    createResultsSection() {
        console.log('🔍 Frontend Debug: Creating results section dynamically');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createResultsSection();
            });
            return;
        }
        
        const chatgptContainer = document.querySelector('.chatgpt-container');
        if (!chatgptContainer) {
            console.error('🔍 Frontend Debug: chatgpt-container not found!');
            return;
        }

        // Check if results section already exists
        let existingResultsSection = document.getElementById('results-section') || 
                                   document.querySelector('#results-section') || 
                                   document.querySelector('.results-section');
        
        if (existingResultsSection) {
            console.log('🔍 Frontend Debug: Results section already exists, using existing one');
            return existingResultsSection;
        }

        const resultsSection = document.createElement('div');
        resultsSection.id = 'results-section';
        resultsSection.className = 'results-section';
        
        resultsSection.innerHTML = `
            <div class="results-header">
                <h2>Processing Results</h2>
                <div class="results-controls">
                    <button id="clear-results" class="clear-btn">
                        <i class="fas fa-times"></i>
                        Clear Results
                    </button>
                </div>
            </div>
            <div id="results-content"></div>
        `;

        // Insert after chat-messages but before chatgpt-input-section
        const chatMessages = document.getElementById('chat-messages');
        const inputSection = document.querySelector('.chatgpt-input-section');
        
        if (chatMessages && inputSection) {
            chatgptContainer.insertBefore(resultsSection, inputSection);
            console.log('🔍 Frontend Debug: Results section created and inserted between chat-messages and input-section');
        } else if (inputSection) {
            chatgptContainer.insertBefore(resultsSection, inputSection);
            console.log('🔍 Frontend Debug: Results section created and inserted before input-section');
        } else {
            chatgptContainer.appendChild(resultsSection);
            console.log('🔍 Frontend Debug: Results section created and appended to chatgpt-container');
        }
        
        return resultsSection;
    }

    // Fallback method for creating results section
    createResultsSectionFallback() {
        console.log('🔍 Frontend Debug: Using fallback method to create results section');
        
        // Try to find any container
        const container = document.querySelector('.chatgpt-container') || 
                         document.querySelector('#main-content') || 
                         document.body;
        
        if (!container) {
            console.error('🔍 Frontend Debug: No container found for fallback creation!');
            return;
        }

        const resultsSection = document.createElement('div');
        resultsSection.id = 'results-section';
        resultsSection.className = 'results-section';
        
        resultsSection.innerHTML = `
            <div class="results-header">
                <h2>Processing Results</h2>
                <div class="results-controls">
                    <button id="clear-results" class="clear-btn">
                        <i class="fas fa-times"></i>
                        Clear Results
                    </button>
                </div>
            </div>
            <div id="results-content"></div>
        `;

        container.appendChild(resultsSection);
        console.log('🔍 Frontend Debug: Results section created using fallback method');
        
        return resultsSection;
    }

    // Create results content dynamically if it doesn't exist
    createResultsContent() {
        console.log('🔍 Frontend Debug: Creating results-content dynamically');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createResultsContent();
            });
            return;
        }
        
        // First, ensure the results section exists
        let resultsSection = document.getElementById('results-section') || 
                           document.querySelector('#results-section') || 
                           document.querySelector('.results-section');
        
        if (!resultsSection) {
            console.log('🔍 Frontend Debug: results-section not found, creating it first...');
            resultsSection = this.createResultsSection();
        }
        
        if (!resultsSection) {
            console.error('🔍 Frontend Debug: Cannot create or find results-section, cannot create results-content!');
            return;
        }

        // Check if results-content already exists
        let existingResultsContent = document.getElementById('results-content') || 
                                   document.querySelector('#results-content');
        
        if (existingResultsContent) {
            console.log('🔍 Frontend Debug: results-content already exists, using existing one');
            return existingResultsContent;
        }

        const resultsContent = document.createElement('div');
        resultsContent.id = 'results-content';
        resultsSection.appendChild(resultsContent);
        console.log('🔍 Frontend Debug: results-content created and added to results-section');
        
        return resultsContent;
    }

    // Render results with pagination
    renderResults() {
        console.log('🔍 Frontend Debug: renderResults called');
        if (!this.currentResults) {
            console.error('🔍 Frontend Debug: No currentResults found!');
            return;
        }

        const { items, fileName, currentPage, itemsPerPage, processingTime } = this.currentResults;
        console.log('🔍 Frontend Debug: Rendering results:', { items: items?.length, fileName, currentPage, itemsPerPage, processingTime });
        
        // First, ensure the results section exists
        let resultsSection = document.getElementById('results-section') || 
                           document.querySelector('#results-section') || 
                           document.querySelector('.results-section');
        
        if (!resultsSection) {
            console.log('🔍 Frontend Debug: Results section not found, creating it...');
            resultsSection = this.createResultsSection();
        }
        
        if (!resultsSection) {
            console.error('🔍 Frontend Debug: Cannot create or find results section!');
            return;
        }
        
        // Now find or create the results-content
        let resultsContent = document.getElementById('results-content');
        
        if (!resultsContent) {
            console.log('🔍 Frontend Debug: results-content not found, trying to find it...');
            resultsContent = document.querySelector('#results-content');
        }
        
        if (!resultsContent) {
            console.log('🔍 Frontend Debug: results-content not found, creating it...');
            this.createResultsContent();
            resultsContent = document.getElementById('results-content') || 
                           document.querySelector('#results-content');
        }
        
        if (!resultsContent) {
            console.error('🔍 Frontend Debug: Still cannot find or create results-content!');
            return;
        }
        
        console.log('🔍 Frontend Debug: results-content found, proceeding with render');

        // Calculate statistics (Found-based success rate)
        const totalItems = items.length;
        const foundItems = items.filter(item => {
            const status = item['Search Status'] || item.Status || item.status;
            const s = (status || '').toString().toLowerCase();
            return s === 'found' || s === 'price found' || s === 'exact' || s === 'found exact';
        }).length;
        const estimatedItems = items.filter(item => {
            const status = item['Search Status'] || item.Status || item.status;
            return (status || '').toString().toLowerCase() === 'estimated';
        }).length;
        const denom = foundItems + estimatedItems;
        const successRate = denom > 0 ? Math.round((foundItems / denom) * 100) : 0;

        // Calculate pagination
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const currentItems = items.slice(startIndex, endIndex);

        // Format processing time
        let processingTimeDisplay = '1s (0min)';
        if (processingTime) {
            const seconds = Math.round(processingTime / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            if (minutes > 0) {
                processingTimeDisplay = `${seconds}s (${minutes}min)`;
            } else {
                processingTimeDisplay = `${seconds}s (0min)`;
            }
        }

        let html = `
            <!-- Statistics Cards -->
            <div class="stats-grid">
                <div class="stat-card total">
                    <div class="stat-number">${totalItems}</div>
                    <div class="stat-label">Total Items</div>
                </div>
                <div class="stat-card found">
                    <div class="stat-number">${foundItems}</div>
                    <div class="stat-label">Found Prices</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-number">${successRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat-card time">
                    <div class="stat-number">${processingTimeDisplay}</div>
                    <div class="stat-label">Processing Time</div>
                </div>
            </div>

            <!-- Results Table -->
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Item #</th>
                            <th>Description</th>
                            <th>Price</th>
                            <th>Source</th>
                            <th>Status</th>
                            <th>URL</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        currentItems.forEach((item, index) => {
            const globalIndex = (currentPage - 1) * itemsPerPage + index;
            
            // Debug logging for image uploads - show full item structure
            if (this.currentResults.source === 'images') {
                console.log(`🔍 Full item object for ${globalIndex + 1}:`, item);
                console.log(`🔍 Item keys for ${globalIndex + 1}:`, Object.keys(item));
                console.log(`🔍 Debug Item ${globalIndex + 1}:`, {
                    'Item Description': item['Item Description'] || item.Description || item.description || item.item,
                    'Price': item['Price'] || item.Price || item.price,
                    'Status': item['Search Status'] || item.Status || item.status,
                    'URL': item['URL'] || item.URL || item.url,
                    'Source': item['Source'] || item.Source || item.source,
                    'aiAnalysis': item.aiAnalysis
                });
                
                // Additional debug: Check if field names with spaces exist
                console.log(`🔍 Field check for ${globalIndex + 1}:`, {
                    'Has Item Description': 'Item Description' in item,
                    'Has Search Status': 'Search Status' in item,
                    'Has URL': 'URL' in item,
                    'Has Price': 'Price' in item,
                    'Has Source': 'Source' in item
                });
            }
            
            // Fix field access - use exact field names from backend with proper fallbacks
            const price = item['Price'] || item.Price || item.price;
            const source = item['Source'] || item.Source || item.source;
            const status = item['Search Status'] || item.Status || item.status || 'Unknown';
            const url = item['URL'] || item.URL || item.url;
            
            // Enhanced description extraction - check multiple sources with exact field names
            let description = item['Item Description'] || item.Description || item.description || item.item;
            if (!description || description === 'Unknown Item') {
                // Try to get description from AI analysis
                if (item.aiAnalysis && item.aiAnalysis.productName) {
                    description = item.aiAnalysis.productName;
                } else if (item.aiAnalysis && item.aiAnalysis.description) {
                    description = item.aiAnalysis.description;
                } else {
                    description = 'Unknown Item';
                }
            }
            
            const priceClass = price && price !== 'Not found' && price !== 'N/A' ? 'price-found' : 'price-not-found';
            const sourceClass = source && source !== 'N/A' ? 'source-found' : 'source-not-found';
            const statusClass = status && status !== 'Unknown' && status !== 'Error' ? 'status-found' : 'status-not-found';
            
            html += `
                <tr>
                    <td>${globalIndex + 1}</td>
                    <td>${description}</td>
                                            <td class="${priceClass}">${price || 'Not Found'}</td>
                    <td><span class="${sourceClass}">${source || 'N/A'}</span></td>
                    <td class="${statusClass}">${status}</td>
                    <td>
                        ${url && url !== 'N/A' ? `<a href="${url}" target="_blank" class="url-link">
                            <i class="fas fa-external-link-alt"></i>
                            View
                        </a>` : 'N/A'}
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // Add pagination if needed
        if (totalPages > 1) {
            html += this.generatePagination(currentPage, totalPages, totalItems, startIndex, endIndex);
        }

        // Add download buttons
        html += `
            <div class="download-buttons">
                <button onclick="downloadCSV('${fileName}', ${JSON.stringify(items).replace(/"/g, '&quot;')})" class="download-btn">
                    <i class="fas fa-download"></i>
                    Download Complete CSV
                </button>
                <button onclick="downloadSuccessfulCSV('${fileName}', ${JSON.stringify(items.filter(item => {
                    const price = item['Price'] || item.Price || item.price;
                    const status = item['Search Status'] || item.Status || item.status;
                    const url = item['URL'] || item.URL || item.url;
                    return price && price !== 'Not found' && price !== 'N/A' && 
                           status && status !== 'Unknown' && status !== 'Error' &&
                           url && url !== 'N/A';
                })).replace(/"/g, '&quot;')})" class="download-btn successful">
                    <i class="fas fa-check"></i>
                    <i class="fas fa-download"></i>
                    Download Successful Only
                </button>
            </div>
        `;

        resultsContent.innerHTML = html;

        // Update summary cards with actual data
        this.updateSummaryCards({
            data: items,
            timing: { 
                totalProcessingTimeMinutes: Math.floor(processingTime / 60000),
                totalProcessingTimeSeconds: Math.floor(processingTime / 1000)
            }
        });
        
        // Update currentResults with proper structure for Excel download
        this.currentResults = {
            ...this.currentResults,
            data: items,
            sessionId: this.currentResults.sessionId || 'default'
        };

        // Add pagination event listeners
        this.addPaginationListeners();
        
        // Add clear results listener
        this.addClearResultsListener();
    }

    // Add clear results listener
    addClearResultsListener() {
        const clearBtn = document.getElementById('clear-results');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearResults();
            });
        }
        
        // Add download Excel button listener
        const downloadExcelBtn = document.getElementById('download-excel-btn');
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', () => {
                this.downloadExcelResults();
            });
        }
    }

    // Clear results
    clearResults() {
        const resultsSection = document.getElementById('results-section');
        const chatMessages = document.getElementById('chat-messages');
        
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
        
        if (chatMessages) {
            chatMessages.classList.remove('hidden');
        }
        
        this.currentResults = null;
    }
    
    // Download Excel results
    async downloadExcelResults() {
        if (!this.currentResults || !this.currentResults.data) {
            console.log('No results to download');
            return;
        }
        
        try {
            console.log('Downloading Excel results...');
            const response = await this.apiService.downloadResults(this.currentResults.sessionId || 'default', 'excel');
            
            if (response.success) {
                console.log('Excel download successful');
                // The API should return a blob or trigger download
                if (response.data) {
                    // Create download link
                    const blob = new Blob([response.data], { 
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                    });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pricing-results-${new Date().toISOString().split('T')[0]}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }
            } else {
                console.error('Excel download failed:', response.error);
                this.showError('Failed to download Excel file');
            }
        } catch (error) {
            console.error('Error downloading Excel:', error);
            this.showError('Error downloading Excel file');
        }
    }

    // Generate pagination controls
    generatePagination(currentPage, totalPages, totalItems, startIndex, endIndex) {
        let html = `
            <div class="pagination-container">
                <div class="pagination-info">
                    Showing ${startIndex + 1} to ${endIndex} of ${totalItems} results
                </div>
                <div class="pagination-controls">
        `;

        // Previous button
        html += `
            <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Next button
        html += `
            <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Add pagination event listeners
    addPaginationListeners() {
        const paginationButtons = document.querySelectorAll('.pagination-btn');
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(button.dataset.page);
                if (page && page !== this.currentResults.currentPage) {
                    this.currentResults.currentPage = page;
                    this.renderResults();
                }
            });
        });
    }

    addMessageToChat(messageData) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${messageData.type}-message`;

        const avatar = messageData.type === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-cog"></i>';

        let filesHtml = '';
        if (messageData.files && messageData.files.length > 0) {
            const filesList = messageData.files.map(file => 
                `<span class="file-tag">📎 ${file.name}</span>`
            ).join('');
            filesHtml = `<div class="message-files">${filesList}</div>`;
        }

        messageElement.innerHTML = `
            <div class="message-avatar">
                ${avatar}
            </div>
            <div class="message-content">
                <p>${messageData.content}</p>
                ${filesHtml}
                <div class="message-time">${this.formatTime(messageData.timestamp)}</div>
            </div>
        `;

        chatMessages.appendChild(messageElement);
        this.scrollToBottom(chatMessages);
    }

    showTypingIndicator() {
        console.log('🔍 showTypingIndicator called');
        
        // Check if typing indicator already exists
        const existingIndicator = document.getElementById('typing-indicator');
        if (existingIndicator) {
            console.log('🔍 Typing indicator already exists, removing it first');
            existingIndicator.remove();
        }
        
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) {
            console.log('🔍 No chat-messages element found, cannot show typing indicator');
            return;
        }

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-cog"></i>
            </div>
            <div class="typing-content">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        chatMessages.appendChild(typingDiv);
        this.scrollToBottom(chatMessages);
        console.log('🔍 Typing indicator created and added to chat messages');
    }

    // Global cleanup function to remove any orphaned typing indicators
    cleanupTypingIndicators() {
        console.log('🔍 Global cleanup: Removing all typing indicators');
        const allTypingIndicators = document.querySelectorAll('.typing-indicator');
        allTypingIndicators.forEach(indicator => {
            console.log('🔍 Removing orphaned typing indicator:', indicator);
            indicator.remove();
        });
        
        // Also remove any elements with typing-indicator class that might not have the ID
        const allTypingElements = document.querySelectorAll('.typing-indicator');
        allTypingElements.forEach(element => {
            console.log('🔍 Removing orphaned typing element:', element);
            element.remove();
        });
    }

    hideTypingIndicator() {
        console.log('🔍 hideTypingIndicator called');
        
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            console.log('🔍 Found typing indicator, applying disabled state');
            
            // Add disabled class to stop dots animation
            typingIndicator.classList.add('typing-indicator-disabled');
            
            // Remove typing indicator immediately
            
            // Remove after a brief delay to show the disabled state
            setTimeout(() => {
                if (typingIndicator && typingIndicator.parentNode) {
                    console.log('🔍 Removing typing indicator completely');
                    typingIndicator.parentNode.removeChild(typingIndicator);
                }
            }, 1000); // Show disabled state for 1 second
        } else {
            console.log('🔍 No typing indicator found to hide');
        }
        
        // Also remove any other typing indicators that might exist
        const allTypingIndicators = document.querySelectorAll('.typing-indicator');
        if (allTypingIndicators.length > 0) {
            console.log(`🔍 Found ${allTypingIndicators.length} additional typing indicators, removing them`);
            allTypingIndicators.forEach(indicator => {
                if (indicator !== typingIndicator) {
                    indicator.remove();
                }
            });
        }
        
        // Force cleanup - remove any remaining typing indicators
        setTimeout(() => {
            const remainingIndicators = document.querySelectorAll('.typing-indicator');
            if (remainingIndicators.length > 0) {
                console.log(`🔍 Force cleanup: removing ${remainingIndicators.length} remaining typing indicators`);
                remainingIndicators.forEach(indicator => indicator.remove());
            }
        }, 2000);
    }

    scrollToBottom(element) {
        setTimeout(() => {
            element.scrollTop = element.scrollHeight;
        }, 100);
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showError(message) {
        console.error(message);
    }

    showLoading(message) {
        console.log('Loading:', message);
        
        // Remove any existing loading indicator
        this.hideLoading();
        
        // Create loading indicator with spinner
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-icon">
                    <div class="loading-spinner"></div>
                </div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        
        // Add to the main content area
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.appendChild(loadingIndicator);
        } else {
            // Fallback to body if main-content not found
            document.body.appendChild(loadingIndicator);
        }
        
        // Store reference for later removal
        this.currentLoadingIndicator = loadingIndicator;
    }

    hideLoading() {
        console.log('Loading finished');
        
        // Remove loading indicator
        if (this.currentLoadingIndicator) {
            // Remove immediately
            setTimeout(() => {
                if (this.currentLoadingIndicator && this.currentLoadingIndicator.parentNode) {
                    this.currentLoadingIndicator.parentNode.removeChild(this.currentLoadingIndicator);
                }
                this.currentLoadingIndicator = null;
            }, 500);
        }
        
        // Also remove any other loading indicators that might exist
        const existingIndicators = document.querySelectorAll('#loading-indicator');
        existingIndicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
    }

    showSuccess(message) {
        console.log('Success:', message);
        // You can add a success notification here if needed
    }

    handleNavigation(section) {
        if (section === 'logout') {
            // Handle logout
            if (this.authComponent) {
                this.authComponent.handleLogout();
            }
            return;
        }
        
        // Special handling for home navigation - always reset to landing page
        if (section === 'home') {
            console.log('🏠 Home navigation requested - resetting to landing page');
            this.currentSection = section;
            this.loadSection(section);
            
            // Clear any current processing state
            this.clearCurrentState();
            return;
        }
        
        this.currentSection = section;
        this.loadSection(section);
    }

    loadSection(section) {
        console.log('Loading section:', section);
        this.currentSection = section;

        if (this.sidebar) {
            this.sidebar.setActiveSection(section);
        }

        switch (section) {
            case 'home':
                this.loadHomeSection();
                break;
            case 'info':
                this.loadInfoSection();
                break;
            case 'settings':
                this.loadSettingsSection();
                break;
            case 'profile':
                this.loadProfileSection();
                break;
            case 'admin':
                this.loadAdminSection();
                break;
            case 'audit':
                this.loadAuditSection();
                break;
            case 'logout':
                console.log('Logout functionality would go here');
                break;
            default:
                this.loadHomeSection();
        }
    }

    loadHomeSection() {
        console.log('Loading home section - returning to landing page');
        
        // Reset the main content to show the landing page
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            // Restore the original landing page HTML structure
            mainContent.innerHTML = `
                <!-- Theme Toggle Button -->
                <div class="theme-toggle-container">
                    <button id="theme-toggle-btn" class="theme-toggle-btn" title="Toggle theme">
                        <i class="fas fa-sun"></i>
                    </button>
                </div>

                <!-- ChatGPT-Style Container -->
                <div class="chatgpt-container">
                    <!-- Welcome Content -->
                    <div class="welcome-content">
                        <div class="welcome-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h1>Insurance Pricing Assistant</h1>
                    </div>

                    <!-- Chat Messages (initially hidden) -->
                    <div id="chat-messages" class="chat-messages hidden"></div>

                    <!-- ChatGPT-Style Input Container -->
                    <div class="chatgpt-input-section">
                        <!-- Selected Files Display -->
                        <div id="selected-files" class="selected-files hidden">
                            <div class="files-container"></div>
                        </div>

                        <!-- Main Input Container -->
                        <div class="input-container">
                            <!-- Left Actions -->
                            <div class="input-actions-left">
                                <button id="add-btn" class="add-btn" title="Add files">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button id="tools-btn" class="tools-btn" title="Price Tolerance">
                                    <i class="fas fa-wrench"></i>
                                    <span>Tools</span>
                                </button>
                            </div>

                            <!-- Text Input -->
                            <textarea 
                                id="chat-input" 
                                placeholder="Find your product price..."
                                rows="1"
                            ></textarea>

                            <!-- Right Actions -->
                            <div class="input-actions">
                                <button id="voice-btn" class="voice-btn" title="Voice input">
                                    <i class="fas fa-microphone"></i>
                                </button>
                                <button id="send-btn" class="send-btn" title="Find Price" disabled>
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Powered by text -->
                        <div class="powered-by">
                            Powered by KVS Technologies
                        </div>
                    </div>
                </div>

                <!-- Results Section (Legacy) -->
                <div id="results-section" class="results-section hidden">
                    <div class="results-header">
                        <h2>Processing Results</h2>
                        <div class="results-controls">
                            <button id="download-results" class="download-btn">
                                <i class="fas fa-download"></i>
                                Download Results
                            </button>
                            <button id="clear-results" class="clear-btn">
                                <i class="fas fa-times"></i>
                                Clear Results
                            </button>
                        </div>
                    </div>
                    <div id="results-content"></div>
                </div>

                <!-- Enhanced Processing Results Section -->
                <div id="enhanced-results-section" class="enhanced-results-section hidden">
                    <div class="enhanced-results-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <h2>Processing Results</h2>
                        <div class="enhanced-results-controls" style="display: flex; gap: 12px; justify-content: flex-end; margin-left: auto;">
                            <button id="download-excel-btn" class="download-btn" title="Download Excel with Results">
                                <i class="fas fa-download"></i>
                                Download Excel
                            </button>
                            <button id="clear-enhanced-results" class="clear-btn">
                                <i class="fas fa-times"></i>
                                Clear Results
                            </button>
                        </div>
                    </div>
                    
                    <!-- Enhanced Status Display Cards -->
                    <div class="enhanced-stats-grid">
                        <div class="enhanced-stat-card enhanced-total">
                            <div class="enhanced-stat-number" id="enhanced-total-items">0</div>
                            <div class="enhanced-stat-label">Total Items</div>
                        </div>
                        <div class="enhanced-stat-card enhanced-found">
                            <div class="enhanced-stat-number" id="enhanced-found-prices">0</div>
                            <div class="enhanced-stat-label">Found Prices</div>
                        </div>
                        <div class="enhanced-stat-card enhanced-success">
                            <div class="enhanced-stat-number" id="enhanced-success-rate">0%</div>
                            <div class="enhanced-stat-label">Success Rate</div>
                        </div>
                        <div class="enhanced-stat-card enhanced-time">
                            <div class="enhanced-stat-number" id="enhanced-processing-time">0s</div>
                            <div class="enhanced-stat-label">Processing Time</div>
                        </div>
                    </div>
                    
                    <div id="enhanced-results-content"></div>
                </div>

                <!-- Attachment Popup -->
                <div id="attachment-popup" class="attachment-popup hidden">
                    <div class="popup-section">
                        <button class="popup-item" data-action="add-files">
                            <i class="fas fa-upload"></i>
                            <span>Upload from computer</span>
                        </button>
                        <button class="popup-item" data-action="add-from-apps">
                            <i class="fas fa-cloud"></i>
                            <span>Add from Google Drive or OneDrive</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <!-- Cloud Storage Popup -->
                <div id="cloud-storage-popup" class="cloud-storage-popup hidden">
                    <div class="popup-section">
                        <button class="popup-item" data-action="google-drive">
                            <i class="fab fa-google-drive"></i>
                            <span>Google Drive</span>
                        </button>
                        <button class="popup-item" data-action="onedrive-personal">
                            <i class="fab fa-microsoft"></i>
                            <span>OneDrive Personal</span>
                        </button>
                        <button class="popup-item" data-action="onedrive-work">
                            <i class="fas fa-building"></i>
                            <span>OneDrive for Business</span>
                        </button>
                    </div>
                </div>

                <!-- Tools Popup -->
                <div id="tools-popup" class="tools-popup hidden">
                    <div class="tool-item">
                        <div class="tool-label">
                            <i class="fas fa-percentage"></i>
                            <span>Price Tolerance</span>
                        </div>
                        <select id="priceTolerance" class="tolerance-dropdown">
                            <option value="10">±10% (Very Strict)</option>
                            <option value="20" >±20% (Strict)</option>
                            <option value="30">±30% (Moderate)</option>
                            <option value="50" selected>±50% (Flexible)</option>
                            <option value="75">±75% (Very Flexible)</option>
                        </select>
                    </div>
                </div>

                <!-- Drag Overlay -->
                <div id="drag-overlay" class="drag-overlay">
                    <div class="drag-overlay-content">
                        <i class="fas fa-file-upload"></i>
                        <h3>Drop files here</h3>
                        <p>Release to upload your documents</p>
                    </div>
                </div>

                <!-- Hidden File Input -->
                <input type="file" id="file-input" multiple accept=".csv,.xls,.xlsx,.xlsm,.xlsb,image/*" style="display: none;">
            `;

            // Re-initialize components after restoring the landing page
            this.initializeTheme();
            this.initializeSidebar();
            
            // Always re-initialize ChatGPTInterface after DOM elements are created
            // to ensure proper binding with the new DOM
            if (this.chatGPTInterface) {
                console.log('App: Cleaning up existing ChatGPTInterface instance');
                this.chatGPTInterface.cleanup();
                this.chatGPTInterface = null;
            }
            
            console.log('App: Creating new ChatGPTInterface instance for home section');
            this.initializeChatGPTInterface();
            
            this.initializeEnhancedProcessing();
            this.bindGlobalEvents();
            this.initializeVoiceInput();
            
            // Ensure buttons are set up after all components are initialized
            setTimeout(() => {
                this.setupButtons();
            }, 100);
            
            // Ensure the welcome content is visible and chat messages are hidden
            const welcomeContent = document.querySelector('.welcome-content');
            const chatMessages = document.getElementById('chat-messages');
            
            if (welcomeContent) {
                welcomeContent.style.display = 'block';
            }
            
            if (chatMessages) {
                chatMessages.classList.add('hidden');
                chatMessages.style.display = 'none';
                chatMessages.innerHTML = '';
            }
            
            // Hide any results sections
            const resultsSection = document.getElementById('results-section');
            const enhancedResultsSection = document.getElementById('enhanced-results-section');
            
            if (resultsSection) {
                resultsSection.classList.add('hidden');
            }
            
            if (enhancedResultsSection) {
                enhancedResultsSection.classList.add('hidden');
            }
            
            console.log('✅ Home section loaded - landing page restored');
        }
    }

    loadInfoSection() {
        console.log('Loading info section');
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="page-container">
                    <div class="page-header">
                        <h1><i class="fas fa-info-circle"></i> About Our Company</h1>
                        <p>Learn more about our insurance pricing intelligence platform</p>
                    </div>
                    
                    <div class="page-content">
                        <div class="info-section">
                            <h2>Our Mission</h2>
                            <p>We provide cutting-edge insurance pricing solutions that help businesses make informed decisions and optimize their pricing strategies.</p>
                        </div>
                        
                        <div class="info-section">
                            <h2>Key Features</h2>
                            <div class="features-grid">
                                <div class="feature-card">
                                    <i class="fas fa-brain"></i>
                                    <h3>AI-Powered Analysis</h3>
                                    <p>Advanced machine learning algorithms for accurate pricing predictions</p>
                                </div>
                                <div class="feature-card">
                                    <i class="fas fa-chart-line"></i>
                                    <h3>Real-time Data</h3>
                                    <p>Live market data and competitor analysis</p>
                                </div>
                                <div class="feature-card">
                                    <i class="fas fa-shield-alt"></i>
                                    <h3>Risk Assessment</h3>
                                    <p>Comprehensive risk evaluation and mitigation strategies</p>
                                </div>
                                <div class="feature-card">
                                    <i class="fas fa-users"></i>
                                    <h3>Team Collaboration</h3>
                                    <p>Seamless team workflow and decision-making tools</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h2>Technology Stack</h2>
                            <ul class="tech-list">
                                <li><i class="fab fa-aws"></i> AWS Cloud Infrastructure</li>
                                <li><i class="fab fa-react"></i> React Frontend</li>
                                <li><i class="fab fa-node-js"></i> Node.js Backend</li>
                                <li><i class="fas fa-database"></i> Advanced Analytics</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    loadSettingsSection() {
        console.log('Loading settings section');
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="page-container">
                    <div class="page-header">
                        <h1><i class="fas fa-cog"></i> Settings</h1>
                        <p>Customize your experience and preferences</p>
                    </div>
                    
                    <div class="page-content">
                        <div class="settings-section">
                            <h2>Appearance</h2>
                            <div class="setting-item">
                                <label for="theme-toggle">Theme</label>
                                <div class="theme-toggle">
                                    <button id="light-theme" class="theme-btn active" data-theme="light">
                                        <i class="fas fa-sun"></i> Light
                                    </button>
                                    <button id="dark-theme" class="theme-btn" data-theme="dark">
                                        <i class="fas fa-moon"></i> Dark
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h2>Preferences</h2>
                            <div class="setting-item">
                                <label for="notifications">Email Notifications</label>
                                <input type="checkbox" id="notifications" checked>
                            </div>
                            <div class="setting-item">
                                <label for="auto-save">Auto-save Drafts</label>
                                <input type="checkbox" id="auto-save" checked>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h2>Account</h2>
                            <div class="setting-item">
                                <label>Email</label>
                                <span class="setting-value">user@example.com</span>
                            </div>
                            <div class="setting-item">
                                <label>Member Since</label>
                                <span class="setting-value">January 2024</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add theme toggle functionality
            this.setupThemeToggle();
        }
    }

    loadProfileSection() {
        console.log('Loading profile section');
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="page-container">
                    <div class="page-header">
                        <h1><i class="fas fa-user"></i> User Profile</h1>
                        <p>Manage your account and preferences</p>
                    </div>
                    
                    <div class="page-content">
                        <div class="profile-section">
                            <div class="profile-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="profile-info">
                                <h2>John Doe</h2>
                                <p>Senior Insurance Analyst</p>
                                <p><i class="fas fa-envelope"></i> john.doe@company.com</p>
                            </div>
                        </div>
                        
                        <div class="profile-section">
                            <h2>Personal Information</h2>
                            <div class="profile-form">
                                <div class="form-group">
                                    <label>Full Name</label>
                                    <input type="text" value="John Doe" placeholder="Enter your full name">
                                </div>
                                <div class="form-group">
                                    <label>Job Title</label>
                                    <input type="text" value="Senior Insurance Analyst" placeholder="Enter your job title">
                                </div>
                                <div class="form-group">
                                    <label>Department</label>
                                    <select>
                                        <option>Risk Management</option>
                                        <option>Underwriting</option>
                                        <option>Claims</option>
                                        <option>Sales</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="profile-section">
                            <h2>Activity Summary</h2>
                            <div class="activity-stats">
                                <div class="stat-card">
                                    <h3>Reports Generated</h3>
                                    <span class="stat-number">47</span>
                                </div>
                                <div class="stat-card">
                                    <h3>Analyses Completed</h3>
                                    <span class="stat-number">156</span>
                                </div>
                                <div class="stat-card">
                                    <h3>Team Members</h3>
                                    <span class="stat-number">12</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    loadAdminSection() {
        console.log('Loading admin section');
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="page-container">
                    <div class="page-header">
                        <h1><i class="fas fa-cog"></i> THIS IS ADMIN PAGE</h1>
                        <p>Administrative dashboard and system management</p>
                    </div>
                    
                    <div class="page-content">
                        <div class="admin-section">
                            <h2>System Overview</h2>
                            <div class="admin-stats">
                                <div class="admin-stat-card">
                                    <h3>Active Users</h3>
                                    <span class="admin-stat-number">1,247</span>
                                </div>
                                <div class="admin-stat-card">
                                    <h3>Total Reports</h3>
                                    <span class="admin-stat-number">8,934</span>
                                </div>
                                <div class="admin-stat-card">
                                    <h3>System Uptime</h3>
                                    <span class="admin-stat-number">99.9%</span>
                                </div>
                                <div class="admin-stat-card">
                                    <h3>Storage Used</h3>
                                    <span class="admin-stat-number">2.4 TB</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-section">
                            <h2>Recent Activity</h2>
                            <div class="activity-log">
                                <div class="log-entry">
                                    <span class="log-time">2 minutes ago</span>
                                    <span class="log-action">User login: john.doe@company.com</span>
                                </div>
                                <div class="log-entry">
                                    <span class="log-time">5 minutes ago</span>
                                    <span class="log-action">Report generated: Q4_2024_Analysis.pdf</span>
                                </div>
                                <div class="log-entry">
                                    <span class="log-time">12 minutes ago</span>
                                    <span class="log-action">New user registered: sarah.smith@company.com</span>
                                </div>
                                <div class="log-entry">
                                    <span class="log-time">1 hour ago</span>
                                    <span class="log-action">System backup completed successfully</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-section">
                            <h2>Quick Actions</h2>
                            <div class="admin-actions">
                                <button class="admin-btn">
                                    <i class="fas fa-users"></i> Manage Users
                                </button>
                                <button class="admin-btn">
                                    <i class="fas fa-database"></i> Backup System
                                </button>
                                <button class="admin-btn">
                                    <i class="fas fa-chart-bar"></i> View Analytics
                                </button>
                                <button class="admin-btn">
                                    <i class="fas fa-cog"></i> System Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    loadAuditSection() {
        console.log('Loading audit section');
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="page-container audit-dashboard">
                    <div class="page-header">
                        <h1><i class="fas fa-chart-bar"></i> Audit Dashboard</h1>
                        <p>Real-time access to all system logs, processing data, and analytics</p>
                    </div>
                    
                    <div class="page-content audit-content">
                        <!-- System Status & Analytics -->
                        <div class="audit-section">
                            <h2><i class="fas fa-tachometer-alt"></i> System Status & Analytics</h2>
                            <div class="audit-metrics" id="audit-metrics">
                                <div class="metric-card">
                                    <div class="metric-value" id="total-jobs">Loading...</div>
                                    <div class="metric-label">Total Jobs</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-value" id="success-rate">Loading...</div>
                                    <div class="metric-label">Success Rate</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-value" id="avg-duration">Loading...</div>
                                    <div class="metric-label">Avg Duration (s)</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-value" id="system-status">Loading...</div>
                                    <div class="metric-label">System Health</div>
                                </div>
                            </div>
                        </div>

                        <!-- Job Search & Filtering -->
                        <div class="audit-section">
                            <h2><i class="fas fa-search"></i> Job Search & Filtering</h2>
                            <div class="search-controls">
                                <div class="search-row">
                                    <input type="text" id="search-jobs" placeholder="Search jobs by description, type, or status..." class="search-input">
                                    <select id="job-type-filter" class="filter-select">
                                        <option value="">All Job Types</option>
                                        <option value="CSV">CSV Files</option>
                                        <option value="EXCEL">Excel Files</option>
                                        <option value="IMAGE">Image Processing</option>
                                        <option value="SINGLE">Single Items</option>
                                        <option value="UNKNOWN">Unknown</option>
                                    </select>
                                    <select id="job-status-filter" class="filter-select">
                                        <option value="">All Statuses</option>
                                        <option value="SUCCESS">Success</option>
                                        <option value="ERROR">Error</option>
                                        <option value="PROCESSING">Processing</option>
                                    </select>
                                </div>
                                <div class="search-row">
                                    <input type="date" id="date-from" class="date-input" placeholder="From Date">
                                    <input type="date" id="date-to" class="date-input" placeholder="To Date">
                                    <button id="search-btn" class="search-btn">
                                        <i class="fas fa-search"></i> Search
                                    </button>
                                    <button id="export-btn" class="export-btn">
                                        <i class="fas fa-download"></i> Export Data
                                    </button>
                                    <button id="refresh-btn" class="refresh-btn">
                                        <i class="fas fa-sync-alt"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Job Results Table -->
                        <div class="audit-section">
                            <h2><i class="fas fa-list"></i> Processing Jobs</h2>
                            <div class="table-container">
                                <table class="audit-table" id="jobs-table">
                                    <thead>
                                        <tr>
                                            <th data-sort="id" class="sortable">
                                                Job ID <i class="fas fa-sort"></i>
                                            </th>
                                            <th data-sort="jobType" class="sortable">
                                                Type <i class="fas fa-sort"></i>
                                            </th>
                                            <th data-sort="status" class="sortable">
                                                Status <i class="fas fa-sort"></i>
                                            </th>
                                            <th data-sort="createdAt" class="sortable">
                                                Created <i class="fas fa-sort"></i>
                                            </th>
                                            <th data-sort="itemCount" class="sortable">
                                                Items <i class="fas fa-sort"></i>
                                            </th>
                                            <th data-sort="successRate" class="sortable">
                                                Success Rate <i class="fas fa-sort"></i>
                                            </th>
                                            <th data-sort="duration" class="sortable">
                                                Duration <i class="fas fa-sort"></i>
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="jobs-tbody">
                                        <tr>
                                            <td colspan="8" class="loading-cell">Loading jobs...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="pagination-controls">
                                <div class="page-size-selector">
                                    <label for="page-size">Items per page:</label>
                                    <select id="page-size" onchange="app.changePageSize(this.value)">
                                        <option value="5">5</option>
                                        <option value="15" selected>15</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                    </select>
                                </div>
                            </div>
                            <div class="pagination" id="jobs-pagination">
                                <!-- Pagination controls will be added here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize the audit dashboard
            this.initializeAuditDashboard();
        }
    }

    async initializeAuditDashboard() {
        try {
            // Load initial data
            await this.loadAuditSummary();
            await this.loadAuditJobs();
            
            // Set up event listeners
            this.setupAuditEventListeners();
            
            // Set up auto-refresh for real-time updates
            this.setupAuditAutoRefresh();
            
        } catch (error) {
            console.error('Failed to initialize audit dashboard:', error);
            this.showAuditError('Failed to load audit data. Please check system connectivity.');
        }
    }

    async loadAuditSummary() {
        try {
            const response = await this.apiService.get('/api/logs/summary?days=30');
            const data = response.data; // ApiService wraps the response, so we need to access .data
            
            // Update metrics
            document.getElementById('total-jobs').textContent = data.totalJobs || 0;
            document.getElementById('success-rate').textContent = (data.successRate || 0).toFixed(1) + '%';
            document.getElementById('avg-duration').textContent = (data.averageDuration || 0).toFixed(1);
            
            // Check system health
            const healthResponse = await this.apiService.get('/api/logs/health');
            const healthData = healthResponse.data; // ApiService wraps the response, so we need to access .data
            const statusElement = document.getElementById('system-status');
            if (healthData.audit?.enabled) {
                statusElement.textContent = '✅ Healthy';
                statusElement.className = 'metric-value status-healthy';
            } else {
                statusElement.textContent = '❌ Issues';
                statusElement.className = 'metric-value status-error';
            }
            
            // Update analytics charts
            
            
        } catch (error) {
            console.error('Failed to load audit summary:', error);
            this.showAuditError('Failed to load summary data');
        }
    }

    async loadAuditJobs(page = 1, limit = null) {
        // Use current page size if not specified
        if (limit === null) {
            limit = this.currentPageSize || 15;
        }
        try {
            console.log('🔍 loadAuditJobs: Starting to fetch audit jobs for page', page, 'with limit', limit);
            console.log('🔍 loadAuditJobs: this.apiService:', this.apiService);
            
            const response = await this.apiService.get(`/api/logs/jobs?limit=${limit}&page=${page}`);
            console.log('🔍 loadAuditJobs: API response received:', response);
            
            const data = response.data; // ApiService wraps the response, so we need to access .data
            console.log('🔍 loadAuditJobs: data object:', data);
            console.log('🔍 loadAuditJobs: data.data:', data.data);
            console.log('🔍 loadAuditJobs: data.data?.length:', data.data?.length);
            console.log('🔍 loadAuditJobs: typeof data.data:', typeof data.data);
            console.log('🔍 loadAuditJobs: Array.isArray(data.data):', Array.isArray(data.data));
            
            if (data.error) {
                console.log('🔍 loadAuditJobs: API returned error:', data.error);
                throw new Error(data.message || 'Failed to fetch jobs');
            }
            
            const tbody = document.getElementById('jobs-tbody');
            console.log('🔍 loadAuditJobs: tbody element found:', !!tbody);
            
            if (data.data && data.data.length > 0) {
                console.log('🔍 loadAuditJobs: Real data found, rendering table with', data.data.length, 'jobs');
                tbody.innerHTML = data.data.map(job => {
                    // Calculate success rate and duration from available data
                    // Prefer backend-provided metrics; otherwise compute Found/(Found+Estimated)
                    let successRate;
                    if (typeof job.successRate === 'number' || typeof job.success_rate === 'number') {
                        successRate = (job.successRate ?? job.success_rate) || 0;
                    } else {
                        const found = job.foundCount || job.found || 0;
                        const estimated = job.estimatedCount || job.estimated || 0;
                        const denom = found + estimated;
                        successRate = denom > 0 ? (found / denom) * 100 : 0;
                    }
                    const duration = job.startedAt && job.completedAt ? 
                        ((new Date(job.completedAt) - new Date(job.startedAt)) / 1000).toFixed(1) + 's' : 'N/A';
                    
                    return `
                        <tr>
                            <td>${job.id?.substring(0, 8) || 'N/A'}</td>
                            <td><span class="job-type-badge type-${(job.jobType || 'unknown').toLowerCase()}">${job.jobType || 'Unknown'}</span></td>
                            <td><span class="status-badge status-${(job.status || 'unknown').toLowerCase()}">${job.status || 'Unknown'}</span></td>
                            <td>${job.createdAt ? new Date(job.createdAt).toLocaleString() : 'N/A'}</td>
                            <td>${job.itemCount || 0}</td>
                            <td>${successRate.toFixed(1)}%</td>
                            <td>${duration}</td>
                            <td>
                                <button class="action-btn view-btn" onclick="app.viewJobDetails('${job.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
                
                // Store the data for sorting and filtering
                this.auditJobsData = data.data;
                this.currentPage = data.page || page;
                this.totalPages = data.totalPages || 1;
                this.totalJobs = data.total || data.data.length;
                
                // Update pagination
                this.updatePagination();
                console.log('🔍 loadAuditJobs: Table rendered successfully with real data for page', this.currentPage);
            } else {
                console.log('🔍 loadAuditJobs: No real data found, falling back to mock data');
                console.log('🔍 loadAuditJobs: data.data is falsy or empty');
                // Fallback to mock data if no real data
                this.loadMockAuditData();
            }
            
        } catch (error) {
            console.error('🔍 loadAuditJobs: Error occurred:', error);
            console.error('🔍 loadAuditJobs: Error stack:', error.stack);
            // Fallback to mock data on error
            this.loadMockAuditData();
        }
    }

    loadMockAuditData() {
        console.log('Loading mock audit data');
        const mockData = [
            {
                id: 'mock-001',
                jobType: 'CSV',
                status: 'SUCCESS',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                itemCount: 25,
                successRate: 96.0,
                completedAt: new Date(Date.now() - 86350000).toISOString()
            },
            {
                id: 'mock-002',
                jobType: 'EXCEL',
                status: 'SUCCESS',
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                itemCount: 15,
                successRate: 100.0,
                completedAt: new Date(Date.now() - 172700000).toISOString()
            },
            {
                id: 'mock-003',
                jobType: 'IMAGE',
                status: 'PROCESSING',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                itemCount: 8,
                successRate: null,
                completedAt: null
            },
            {
                id: 'mock-004',
                jobType: 'SINGLE',
                status: 'SUCCESS',
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                itemCount: 1,
                successRate: 100.0,
                completedAt: new Date(Date.now() - 7150000).toISOString()
            },
            {
                id: 'mock-005',
                jobType: 'CSV',
                status: 'ERROR',
                createdAt: new Date(Date.now() - 43200000).toISOString(),
                itemCount: 12,
                successRate: 0.0,
                completedAt: new Date(Date.now() - 43150000).toISOString()
            }
        ];
        
        this.auditJobsData = mockData;
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalJobs = mockData.length;
        
        const tbody = document.getElementById('jobs-tbody');
        tbody.innerHTML = mockData.map(job => `
            <tr>
                <td>${job.id || 'N/A'}</td>
                <td><span class="job-type-badge type-${(job.job_type || job.jobType || 'unknown').toLowerCase()}">${job.job_type || job.jobType || 'Unknown'}</span></td>
                <td><span class="status-badge status-${(job.status || 'unknown').toLowerCase()}">${job.status || 'Unknown'}</span></td>
                <td>${(job.created_at || job.createdAt) ? new Date(job.created_at || job.createdAt).toLocaleString() : 'N/A'}</td>
                <td>${job.item_count || job.itemCount || 0}</td>
                <td>${(job.success_rate !== null && job.success_rate !== undefined) || (job.successRate !== null && job.successRate !== undefined) ? 
                    (job.success_rate || job.successRate).toFixed(1) + '%' : 'N/A'}</td>
                <td>${(job.completed_at || job.completedAt) && (job.created_at || job.createdAt) ? 
                    ((new Date(job.completed_at || job.completedAt) - new Date(job.created_at || job.createdAt)) / 1000).toFixed(1) + 's' : 'N/A'}</td>
                <td>
                    <button class="action-btn view-btn" onclick="app.viewJobDetails('${job.id || 'N/A'}')" ${!job.id ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
        
        this.updatePagination();
    }

    setupAuditEventListeners() {
        // Search functionality
        document.getElementById('search-btn')?.addEventListener('click', () => this.filterJobs());
        document.getElementById('search-jobs')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterJobs();
        });
        
        // Export functionality
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportAuditData());
        
        // Refresh functionality
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadAuditJobs());
        
        // Sorting functionality
        document.querySelectorAll('#jobs-table th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                if (column) this.sortTable(column);
            });
        });
        
        // Filter change events
        document.getElementById('job-type-filter')?.addEventListener('change', () => this.filterJobs());
        document.getElementById('job-status-filter')?.addEventListener('change', () => this.filterJobs());
        document.getElementById('date-from')?.addEventListener('change', () => this.filterJobs());
        document.getElementById('date-to')?.addEventListener('change', () => this.filterJobs());
    }

    setupAuditAutoRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadAuditSummary();
            this.loadAuditJobs();
        }, 30000);
    }

    async searchJobs() {
        // Implementation for job search with filters
        console.log('Searching jobs with current filters');
        await this.loadAuditJobs(); // For now, just reload - can add filtering later
    }

    async exportAuditData() {
        try {
            console.log('🔍 exportAuditData: Starting export process...');
            
            // Always fetch ALL data from the backend for export, regardless of current page
            console.log('🔍 exportAuditData: Fetching all audit data for export...');
            const response = await this.apiService.get('/api/logs/jobs/export');
            const data = response.data; // ApiService wraps the response, so we need to access .data
            
            if (data.error) {
                throw new Error(data.message || 'Failed to fetch data for export');
            }
            
            const dataToExport = data.data || [];
            console.log(`🔍 exportAuditData: Fetched ${dataToExport.length} jobs for export`);
            
            if (dataToExport && dataToExport.length > 0) {
                const csv = this.convertToCSV(dataToExport);
                this.downloadCSV(csv, `audit-data-export-${new Date().toISOString().split('T')[0]}.csv`);
                this.showNotification(`Successfully exported ${dataToExport.length} audit records`, 'success');
            } else {
                this.showNotification('No data to export', 'info');
            }
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showNotification('Failed to export data: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notification if any
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.closest('.notification').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    convertToCSV(data) {
        const headers = ['Job ID', 'Type', 'Status', 'Created At', 'Total Items', 'Success Rate', 'Duration'];
        const rows = data.map(job => {
            // Calculate success rate based on status
            let successRate = 0;
            if (job.status === 'SUCCESS') {
                successRate = 100;
            } else if (job.status === 'PARTIAL_SUCCESS') {
                successRate = 75; // Estimate for partial success
            } else if (job.status === 'FAILED') {
                successRate = 0;
            } else if (job.status === 'PROCESSING') {
                successRate = 50; // Estimate for processing
            }
            
            // Calculate duration in seconds
            let duration = 0;
            if (job.completedAt && job.createdAt) {
                duration = Math.round((new Date(job.completedAt) - new Date(job.createdAt)) / 1000);
            } else if (job.completed_at && job.created_at) {
                duration = Math.round((new Date(job.completed_at) - new Date(job.created_at)) / 1000);
            }
            
            return [
                job.id || '',
                job.jobType || job.job_type || '',
                job.status || '',
                job.createdAt ? new Date(job.createdAt).toLocaleString() : 
                job.created_at ? new Date(job.created_at).toLocaleString() : '',
                job.itemCount || job.item_count || 0,
                successRate,
                duration
            ];
        });
        
        return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }



    async viewJobDetails(jobId) {
        try {
            console.log(`🔍 viewJobDetails called with jobId: ${jobId}`);
            console.log(`🔍 Current auditJobsData:`, this.auditJobsData);
            
            // Validate jobId
            if (!jobId || jobId === 'N/A' || jobId === 'undefined') {
                throw new Error('Invalid job ID');
            }
            
            // For mock data, create a mock response
            let jobData;
            if (jobId.startsWith('mock-')) {
                console.log(`🔍 Looking for mock job with ID: ${jobId}`);
                jobData = this.auditJobsData.find(job => job.id === jobId);
                console.log(`🔍 Found mock job data:`, jobData);
                if (!jobData) {
                    throw new Error('Mock job not found');
                }
            } else {
                console.log(`🔍 Fetching real job data for ID: ${jobId}`);
                const response = await this.apiService.get(`/api/logs/jobs/${jobId}`);
                const data = response.data; // ApiService wraps the response, so we need to access .data
                console.log(`🔍 API Response for job ${jobId}:`, data);
                if (data.error) {
                    throw new Error(data.message || 'Failed to fetch job details');
                }
                // The API returns job data directly, not wrapped in a 'job' property
                jobData = data.job || data;
                console.log(`✅ Job data extracted:`, jobData);
            }
            
            // Ensure we have valid job data
            if (!jobData || !jobData.id) {
                throw new Error('Invalid job data received');
            }
            
            console.log(`🎯 About to show modal for job:`, {
                id: jobData.id,
                type: jobData.job_type || jobData.jobType,
                status: jobData.status,
                createdAt: jobData.created_at || jobData.createdAt,
                itemCount: jobData.item_count || jobData.itemCount,
                successRate: jobData.success_rate || jobData.successRate
            });
            
            this.showJobDetailsModal(jobData);
            
        } catch (error) {
            console.error('Failed to load job details:', error);
            this.showJobDetailsModal(null, error.message);
        }
    }

        showJobDetailsModal(jobData, errorMessage = null) {
        console.log('🔍 Creating job details modal:', { jobData, errorMessage });
        console.log('🔍 Job ID being displayed:', jobData?.id);
        console.log('🔍 Job Type being displayed:', jobData?.job_type || jobData?.jobType);
        console.log('🔍 Job Status being displayed:', jobData?.status);
        console.log('🔍 Full job data for modal:', JSON.stringify(jobData, null, 2));

        // Remove existing modal if any
        const existingModal = document.getElementById('job-details-modal');
        if (existingModal) {
            console.log('🗑️ Removing existing modal');
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'job-details-modal';
        modal.className = 'modal-overlay';
        
        if (errorMessage) {
            console.log('❌ Creating error modal');
            modal.innerHTML = `
                <div class="modal-content error-modal" style="max-width: 700px !important; width: 95% !important;">
                    <div class="modal-header">
                        <h3 style="color: #ffffff !important; font-size: 1.875rem !important; font-weight: 700 !important;"><i class="fas fa-exclamation-triangle"></i> Error Loading Job Details</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <p class="error-message">${errorMessage}</p>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                                <i class="fas fa-check"></i> OK
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            console.log('✅ Creating job details modal with data:', jobData);
            console.log('✅ Modal will display for job ID:', jobData.id);
            
            // Format dates nicely
            const formatDate = (dateString) => {
                if (!dateString) return 'N/A';
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };
            
            // Calculate duration
            const getDuration = () => {
                if (!(jobData.completedAt) || !(jobData.createdAt)) return 'N/A';
                const duration = (new Date(jobData.completedAt) - new Date(jobData.createdAt)) / 1000;
                if (duration < 60) return `${duration.toFixed(1)}s`;
                if (duration < 3600) return `${(duration / 60).toFixed(1)}m`;
                return `${(duration / 3600).toFixed(1)}h`;
            };
            
            // Get status icon and color
            const getStatusInfo = (status) => {
                const statusMap = {
                    'completed': { icon: 'fa-check-circle', color: 'success' },
                    'processing': { icon: 'fa-spinner fa-spin', color: 'warning' },
                    'failed': { icon: 'fa-times-circle', color: 'danger' },
                    'pending': { icon: 'fa-clock', color: 'info' }
                };
                return statusMap[status?.toLowerCase()] || { icon: 'fa-question-circle', color: 'unknown' };
            };
            
            // Get job type icon
            const getJobTypeIcon = (type) => {
                const typeMap = {
                    'csv': 'fa-file-csv',
                    'excel': 'fa-file-excel',
                    'xlsx': 'fa-file-excel'
                };
                return typeMap[type?.toLowerCase()] || 'fa-file-alt';
            };
            
            const statusInfo = getStatusInfo(jobData.status);
            const jobTypeIcon = getJobTypeIcon(jobData.job_type || jobData.jobType);
            
            console.log('✅ Status info:', statusInfo);
            console.log('✅ Job type icon:', jobTypeIcon);
            console.log('✅ Job Type (snake_case):', jobData.job_type);
            console.log('✅ Job Type (camelCase):', jobData.jobType);
            
            const modalHTML = `
                <div class="modal-content" style="max-width: 700px !important; width: 95% !important;">
                    <div class="modal-header">
                        <h3 style="color: #ffffff !important; font-size: 1.875rem !important; font-weight: 700 !important;"><i class="fas fa-info-circle"></i> Job Details</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Job Details Grid -->
                        <div class="job-details-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important; gap: 1.5rem !important;">
                            <div class="detail-item">
                                <label><i class="fas fa-hashtag"></i> Job ID</label>
                                <span class="detail-value">${jobData.id || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <label><i class="fas ${jobTypeIcon}"></i> File Type</label>
                                <span class="detail-value">
                                    <span class="job-type-badge type-${(jobData.job_type || jobData.jobType || 'unknown').toLowerCase()}">
                                        ${jobData.job_type || jobData.jobType || 'Unknown'}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <label><i class="fas ${statusInfo.icon}"></i> Status</label>
                                <span class="detail-value">
                                    <span class="status-badge status-${statusInfo.color}">
                                        ${jobData.status || 'Unknown'}
                                    </span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <label><i class="fas fa-calendar-plus"></i> Created</label>
                                <span class="detail-value">${formatDate(jobData.createdAt)}</span>
                            </div>
                            <div class="detail-item">
                                <label><i class="fas fa-list-ol"></i> Items Processed</label>
                                <span class="detail-value">${jobData.itemCount || 0} items</span>
                            </div>
                            <div class="detail-item">
                                <label><i class="fas fa-percentage"></i> Success Rate</label>
                                <span class="detail-value">
                                    ${(() => {
                                        // Calculate success rate based on itemCount and status
                                        if (jobData.itemCount > 0 && jobData.status === 'SUCCESS') {
                                            return '<span class="success-rate high">100.0%</span>';
                                        } else if (jobData.status === 'SUCCESS') {
                                            return '<span class="success-rate medium">100.0%</span>';
                                        } else if (jobData.status === 'ERROR') {
                                            return '<span class="success-rate low">0.0%</span>';
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label><i class="fas fa-clock"></i> Processing Time</label>
                                <span class="detail-value">${getDuration()}</span>
                            </div>
                            ${jobData.completedAt ? `
                            <div class="detail-item">
                                <label><i class="fas fa-calendar-check"></i> Completed</label>
                                <span class="detail-value">${formatDate(jobData.completedAt)}</span>
                            </div>
                            ` : ''}
                        </div>
                        
                        <!-- Additional Info Section -->
                        ${(jobData.notes || jobData.description) ? `
                        <div class="job-notes-section">
                            <h4><i class="fas fa-sticky-note"></i> Additional Information</h4>
                            <div class="notes-content">
                                <p>${jobData.notes || jobData.description || 'No additional information available.'}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                <i class="fas fa-times"></i> Close
                            </button>
                            ${this.shouldShowDownloadButton(jobData) ? `
                            <button class="download-btn" data-job-id="${jobData.id}" data-job-type="${jobData.jobType}">
                                <i class="fas fa-download"></i> Download File
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Generated modal HTML for job ID:', jobData.id);
            console.log('✅ Modal HTML preview:', modalHTML.substring(0, 200) + '...');
            
            modal.innerHTML = modalHTML;
        }
        
        // Add modal to body
        document.body.appendChild(modal);
        console.log('📌 Modal added to DOM:', modal);
        
        // Ensure modal is visible with enhanced animation
        setTimeout(() => {
            if (modal.parentNode) {
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
                modal.style.opacity = '1';
                console.log('✅ Modal visibility enforced');
                
                // Add entrance animation
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                }
            }
        }, 10);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('🖱️ Closing modal (outside click)');
                modal.style.animation = 'modalFadeOut 0.2s ease forwards';
                setTimeout(() => modal.remove(), 200);
            }
        });
        
        // Add escape key listener
        const handleEscape = (e) => {
            if (e.key === 'Escape' && modal.parentNode) {
                console.log('⌨️ Closing modal (escape key)');
                modal.style.animation = 'modalFadeOut 0.2s ease forwards';
                setTimeout(() => modal.remove(), 200);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Add download button event listener
        const downloadBtn = modal.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const jobId = downloadBtn.getAttribute('data-job-id');
                const jobType = downloadBtn.getAttribute('data-job-type');
                console.log('📥 Download button clicked for job:', jobId, 'type:', jobType);
                this.downloadJobFile(jobId, jobType);
            });
            console.log('✅ Download button event listener added');
        }
        
        console.log('🎯 Job details modal created successfully');
        console.log('🔧 Job Details Modal v2.0 - Property mapping updated for snake_case/camelCase compatibility');
    }

    shouldShowDownloadButton(jobData) {
        if (!jobData || (!jobData.jobType && !jobData.job_type)) return false;
        const jobType = jobData.job_type || jobData.jobType;
        const supportedTypes = ['csv', 'excel', 'xlsx', 'image'];
        return supportedTypes.includes(jobType.toLowerCase());
    }

    async downloadJobFile(jobId, jobType) {
        try {
            console.log(`📥 Downloading file for job ${jobId}, type: ${jobType}`);
            
            // Show loading state
            const downloadBtn = document.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
                downloadBtn.disabled = true;
            }
            
            // Check if this is a mock job
            if (jobId.startsWith('mock-')) {
                console.log('📋 Mock job detected, generating sample file...');
                await this.downloadMockJobFile(jobId, jobType);
                return;
            }
            
            // For real jobs, try to get the file from the server
            try {
                const response = await this.apiService.get(`/api/logs/jobs/${jobId}`);
                const data = response.data; // ApiService wraps the response, so we need to access .data
                
                // Check if we have a real job with file information
                if (data.job && data.job.file_id) {
                    // Real job with file ID - try to get file metadata and download
                    console.log('📋 Real job detected with file ID:', data.job.file_id);
                    
                    try {
                        // Get file metadata from the new files endpoint
                        const fileResponse = await this.apiService.get(`/api/logs/files/${data.job.file_id}`);
                        console.log('📁 File metadata response:', fileResponse);
                        
                        if (fileResponse.data && fileResponse.data.file) {
                            console.log('📁 File metadata found:', fileResponse.data.file);
                            
                            // Check if we have a download URL
                            if (fileResponse.data.downloadUrl) {
                                console.log('📥 Using download URL:', fileResponse.data.downloadUrl);
                                
                                try {
                                    // Get the presigned URL from the download endpoint
                                    const downloadResponse = await this.apiService.get(fileResponse.data.downloadUrl);
                                    console.log('📥 Download response:', downloadResponse);
                                    
                                    if (downloadResponse.data && downloadResponse.data.url) {
                                        // We have a presigned URL - use it to download
                                        console.log('✅ Got presigned URL, initiating download');
                                        window.location.href = downloadResponse.data.url;
                                        
                                        this.showNotification(
                                            `Downloading ${downloadResponse.data.filename || fileResponse.data.file.original_filename || 'file'}...`, 
                                            'success'
                                        );
                                        return;
                                    } else {
                                        console.error('❌ No presigned URL in response:', downloadResponse.data);
                                        throw new Error('No presigned URL received from server');
                                    }
                                } catch (downloadError) {
                                    console.error('❌ Presigned URL generation failed:', downloadError);
                                    throw downloadError;
                                }
                            } else {
                                console.error('❌ No download URL in file metadata:', fileResponse.data);
                                throw new Error('No download URL provided in file metadata');
                            }
                        } else {
                            console.error('❌ Invalid file metadata response:', fileResponse.data);
                            throw new Error('File metadata not available - invalid response format');
                        }
                    } catch (fileError) {
                        console.error('❌ File metadata fetch failed:', fileError);
                        // Don't fall back to sample files for real jobs - show the actual error
                        throw new Error(`Failed to fetch file metadata: ${fileError.message}`);
                    }
                } else if (data.job && data.job.fileUrl) {
                    // Job has direct file URL (future enhancement)
                    console.log('📁 Using direct file URL:', data.job.fileUrl);
                    const link = document.createElement('a');
                    link.href = data.job.fileUrl;
                    link.download = `job-${jobId}.${this.getFileExtension(jobType)}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    console.log('✅ File download initiated from direct URL');
                    this.showNotification('File download started', 'success');
                } else {
                    // No file information available
                    console.error('❌ No file information in job data:', data.job);
                    throw new Error('No file information available for this job');
                }
            } catch (apiError) {
                console.error('❌ API call failed:', apiError);
                // Don't fall back to sample files for real jobs - show the actual error
                throw new Error(`Failed to fetch job data: ${apiError.message}`);
            }
            
        } catch (error) {
            console.error('❌ Error downloading file:', error);
            this.showNotification('Failed to download file: ' + error.message, 'error');
        } finally {
            // Reset button state
            const downloadBtn = document.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download File';
                downloadBtn.disabled = false;
            }
        }
    }

    async downloadMockJobFile(jobId, jobType) {
        try {
            console.log(`📋 Generating sample file for mock job: ${jobId}`);
            
            let fileContent = '';
            let fileName = `job-${jobId}`;
            let mimeType = 'text/plain';
            
            // Generate sample content based on job type
            switch (jobType.toLowerCase()) {
                case 'csv':
                    fileContent = this.generateSampleCSV(jobId);
                    fileName += '.csv';
                    mimeType = 'text/csv';
                    break;
                case 'excel':
                case 'xlsx':
                    fileContent = this.generateSampleExcel(jobId);
                    fileName += '.xlsx';
                    mimeType = 'application/vnd.openxmlformats-officespreadsheetml.sheet';
                    break;
                case 'image':
                    fileContent = this.generateSampleImage(jobId);
                    fileName += '.png';
                    mimeType = 'image/png';
                    break;
                default:
                    fileContent = this.generateSampleText(jobId);
                    fileName += '.txt';
                    mimeType = 'text/plain';
            }
            
            // Create and download the file
            const blob = new Blob([fileContent], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            console.log('✅ Sample file generated and downloaded');
            this.showNotification('Sample file downloaded successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error generating sample file:', error);
            this.showNotification('Failed to generate sample file: ' + error.message, 'error');
        }
    }

    generateSampleCSV(jobId) {
        const headers = ['Item ID', 'Description', 'Category', 'Price', 'Source', 'Confidence'];
        const sampleData = [
            ['001', 'Sample Insurance Item 1', 'Health', '$150.00', 'Sample Source', '95%'],
            ['002', 'Sample Insurance Item 2', 'Auto', '$75.50', 'Sample Source', '87%'],
            ['003', 'Sample Insurance Item 3', 'Home', '$200.00', 'Sample Source', '92%'],
            ['004', 'Sample Insurance Item 4', 'Life', '$300.00', 'Sample Source', '89%'],
            ['005', 'Sample Insurance Item 5', 'Business', '$125.75', 'Sample Source', '94%']
        ];
        
        return [headers, ...sampleData].map(row => row.join(',')).join('\n');
    }

    generateSampleExcel(jobId) {
        // For Excel, we'll create a simple CSV-like structure that can be opened in Excel
        return this.generateSampleCSV(jobId);
    }

    generateSampleImage(jobId) {
        // For images, we'll create a simple SVG that represents a sample image
        const svgContent = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="300" fill="#f0f0f0"/>
            <text x="200" y="150" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
                Sample Image for Job ${jobId}
            </text>
            <text x="200" y="180" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
                Generated on ${new Date().toLocaleDateString()}
            </text>
        </svg>`;
        
        return svgContent;
    }

    generateSampleText(jobId) {
        return `Sample Text File for Job ${jobId}

Generated on: ${new Date().toLocaleDateString()}
Job Type: Sample Job
Status: Completed

This is a sample text file that would normally contain the actual job data.
In a real scenario, this would be replaced with the actual file content from the server.

Sample Data:
- Item 1: Sample insurance item with description
- Item 2: Another sample item for demonstration
- Item 3: Third sample item to show format

End of sample file.`;
    }

    getFileExtension(jobType) {
        if (!jobType) return 'txt';
        const extensionMap = {
            'csv': 'csv',
            'excel': 'xlsx',
            'xlsx': 'xlsx',
            'image': 'png'
        };
        return extensionMap[jobType.toLowerCase()] || 'txt';
    }

    showAuditError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'audit-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        document.querySelector('.page-content')?.prepend(errorDiv);
    }

    handleResize() {
        // Handle resize events if needed
    }

    openVoiceModal() {
        const voiceModal = document.getElementById('voice-modal');
        if (voiceModal) {
            voiceModal.classList.add('active');
            // Initialize voice recognition if not already done
            if (window.voiceInputManager && !window.voiceInputManager.isInitialized) {
                window.voiceInputManager.init();
            }
        }
    }

    closeVoiceModal() {
        const voiceModal = document.getElementById('voice-modal');
        if (voiceModal) {
            voiceModal.classList.remove('active');
            // Stop recording if active
            if (window.voiceInputManager && window.voiceInputManager.isRecording) {
                window.voiceInputManager.stop();
            }
        }
    }

    setupThemeToggle() {
        const lightThemeBtn = document.getElementById('light-theme');
        const darkThemeBtn = document.getElementById('dark-theme');
        
        if (lightThemeBtn && darkThemeBtn) {
            lightThemeBtn.addEventListener('click', () => this.setTheme('light'));
            darkThemeBtn.addEventListener('click', () => this.setTheme('dark'));
            
            // Set initial state based on current theme
            const currentTheme = this.getCurrentTheme();
            this.updateThemeButtons(currentTheme);
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateThemeButtons(theme);
        this.updateThemeToggleButton(theme);
        console.log(`Theme changed to: ${theme}`);
    }

    getCurrentTheme() {
        return localStorage.getItem('theme') || 'light';
    }

    updateThemeButtons(theme) {
        const lightThemeBtn = document.getElementById('light-theme');
        const darkThemeBtn = document.getElementById('dark-theme');
        
        if (lightThemeBtn && darkThemeBtn) {
            lightThemeBtn.classList.toggle('active', theme === 'light');
            darkThemeBtn.classList.toggle('active', theme === 'dark');
        }
    }

    updateThemeToggleButton(theme) {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            const icon = themeToggleBtn.querySelector('i');
            if (icon) {
                icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }
    }

    initializeTheme() {
        const savedTheme = this.getCurrentTheme();
        this.setTheme(savedTheme);
    }

    initializeVoiceInput() {
        if (window.voiceInputManager) {
            console.log('Voice input already initialized');
            return;
        }

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Voice input not supported in this browser.');
            return;
        }

        const voiceBtn = document.getElementById('voice-btn');
        const voiceModal = document.getElementById('voice-modal');

        if (!voiceBtn || !voiceModal) {
            console.warn('Voice UI elements not found');
            return;
        }

        window.voiceInputManager = {
            recognition: null,
            isRecording: false,
            isInitialized: false,

            init() {
                if (this.isInitialized) return;

                try {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    this.recognition = new SpeechRecognition();
                    this.recognition.continuous = false;
                    this.recognition.interimResults = true;
                    this.recognition.lang = 'en-US';
                    this.recognition.maxAlternatives = 1;

                    this.recognition.onstart = () => {
                        this.isRecording = true;
                        this.updateButtonStates();
                        this.updateStatus('Listening... Speak now');
                        console.log('Voice recognition started');
                    };

                    this.recognition.onresult = (event) => {
                        let transcript = '';
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            transcript += event.results[i][0].transcript;
                        }

                        const transcriptEl = document.getElementById('voice-transcript');
                        if (transcriptEl) {
                            transcriptEl.textContent = transcript;
                            transcriptEl.classList.add('visible');
                        }

                        if (event.results[event.results.length - 1].isFinal) {
                            const chatInput = document.getElementById('chat-input');
                            if (chatInput && transcript.trim()) {
                                chatInput.value = transcript.trim();
                                chatInput.dispatchEvent(new Event('input'));
                            }
                            setTimeout(() => this.closeModal(), 500);
                        }
                    };

                    this.recognition.onerror = (event) => {
                        console.error('Voice recognition error:', event.error);
                        this.isRecording = false;
                        this.updateButtonStates();

                        let errorMessage = 'Voice input failed. Please try again.';

                        switch (event.error) {
                            case 'no-speech':
                                errorMessage = 'No speech detected. Try speaking louder.';
                                break;
                            case 'not-allowed':
                                errorMessage = 'Microphone access denied. Please allow microphone access.';
                                break;
                            case 'network':
                                errorMessage = 'Network error. Please check your connection.';
                                break;
                            case 'aborted':
                                return;
                        }

                        this.updateStatus(errorMessage);
                    };

                    this.recognition.onend = () => {
                        this.isRecording = false;
                        this.updateButtonStates();
                        console.log('Voice recognition ended');
                    };

                    this.isInitialized = true;
                } catch (error) {
                    console.error('Error initializing voice recognition:', error);
                }
            },

            start() {
                if (this.isRecording) {
                    console.log('Already recording, ignoring start request');
                    return;
                }

                if (!this.isInitialized) {
                    this.init();
                }

                try {
                    if (this.recognition) {
                        this.recognition.start();
                    }
                } catch (error) {
                    console.error('Error starting recognition:', error);
                    this.updateStatus('Could not start voice recording');
                    this.isRecording = false;
                    this.updateButtonStates();
                }
            },

            stop() {
                if (this.recognition && this.isRecording) {
                    try {
                        this.recognition.stop();
                    } catch (error) {
                        console.error('Error stopping recognition:', error);
                    }
                }
                this.isRecording = false;
                this.updateButtonStates();
            },

            updateButtonStates() {
                const startRecordingEl = document.getElementById('start-recording');
                const stopRecordingEl = document.getElementById('stop-recording');

                if (startRecordingEl) startRecordingEl.disabled = this.isRecording;
                if (stopRecordingEl) stopRecordingEl.disabled = !this.isRecording;
            },

            openModal() {
                voiceModal.classList.add('active');
                this.updateStatus('Click Start Recording to begin');
                this.updateButtonStates();

                const transcriptEl = document.getElementById('voice-transcript');
                if (transcriptEl) {
                    transcriptEl.textContent = '';
                    transcriptEl.classList.remove('visible');
                }
            },

            closeModal() {
                this.stop();
                voiceModal.classList.remove('active');
            },

            updateStatus(message) {
                const status = document.getElementById('voice-status');
                if (status) {
                    status.textContent = message;
                }
            }
        };

        window.voiceInputManager.init();

        // Set up event listeners
        voiceBtn.onclick = () => {
            console.log('Voice button clicked');
            window.voiceInputManager.openModal();
        };

        const startRecordingBtn = document.getElementById('start-recording');
        const stopRecordingBtn = document.getElementById('stop-recording');
        const closeBtn = document.getElementById('voice-modal-close');

        if (startRecordingBtn) {
            startRecordingBtn.onclick = () => window.voiceInputManager.start();
        }

        if (stopRecordingBtn) {
            stopRecordingBtn.onclick = () => window.voiceInputManager.stop();
        }

        if (closeBtn) {
            closeBtn.onclick = () => window.voiceInputManager.closeModal();
        }

        voiceModal.onclick = (e) => {
            if (e.target === voiceModal) {
                window.voiceInputManager.closeModal();
            }
        };

        console.log('Voice input initialized successfully');
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check processing mode
        const processingMode = document.getElementById('processingMode')?.value || 'enhanced';
        
        if (processingMode === 'enhanced') {
            // Use enhanced processing
            console.log(`🚀 Using enhanced processing for file: ${file.name}`);
            await this.enhancedProcessing.processFile(file);
        } else {
            // Use legacy CSV processing
            console.log(`🔄 Using legacy CSV processing for file: ${file.name}`);
            this.showLoading('Processing CSV file...');
            
            try {
                console.log(`📁 Processing file: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
                
                // Use optimized processing with paging
                const result = await this.apiService.processCSVOptimized(file, 1, 50);
                
                if (result.success) {
                    this.displayResults(result);
                    this.showSuccess(`✅ Processing completed! Found ${result.statistics.foundResults} items, estimated ${result.statistics.estimatedResults} items. Processing time: ${result.timing.totalProcessingTimeMinutes}m ${result.timing.totalProcessingTimeSeconds % 60}s`);
                } else {
                    this.showError('Processing failed');
                }
            } catch (error) {
                console.error('❌ File processing error:', error);
                this.showError(`Processing failed: ${error.message}`);
            } finally {
                this.hideLoading();
            }
        }
    }

    displayResults(result) {
        const resultsContainer = document.getElementById('results');
        const statisticsContainer = document.getElementById('statistics');
        
        // Display statistics
        statisticsContainer.innerHTML = `
            <div class="statistics-grid">
                <div class="stat-item">
                    <span class="stat-label">Total Items:</span>
                    <span class="stat-value">${result.statistics.totalItems}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Found:</span>
                    <span class="stat-value success">${result.statistics.foundResults}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Estimated:</span>
                    <span class="stat-value warning">${result.statistics.estimatedResults}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Errors:</span>
                    <span class="stat-value error">${result.statistics.errorResults}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Processing Time:</span>
                    <span class="stat-value">${result.timing.totalProcessingTimeMinutes}m ${result.timing.totalProcessingTimeSeconds % 60}s</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rate:</span>
                    <span class="stat-value">${result.timing.itemsPerMinute} items/min</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Cache Hit Rate:</span>
                    <span class="stat-value">${result.cache.hitRate}%</span>
                </div>
            </div>
        `;
        
        // Display results with paging
        let resultsHTML = `
            <div class="results-header">
                <h2>Results (Page ${result.pagination.currentPage} of ${result.pagination.totalPages})</h2>
                <div class="results-controls">
                    <button id="clear-results" class="clear-btn">
                        <i class="fas fa-times"></i>
                        Clear Results
                    </button>
                </div>
            </div>
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Item #</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Source</th>
                            <th>Status</th>
                            <th>Processing Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        result.data.forEach(item => {
            const statusClass = item.error ? 'error' : (item.isEstimate ? 'warning' : 'success');
            const statusText = item.error ? 'Error' : (item.isEstimate ? 'Estimated' : 'Found');
            const processingTime = item.processingTime ? `${item.processingTime}ms` : 'N/A';
            
            resultsHTML += `
                <tr class="${statusClass}">
                    <td>${item.id || item['Item #'] || 'N/A'}</td>
                    <td>${item.description || 'N/A'}</td>
                    <td>${item.category || 'N/A'}</td>
                                            <td>${item.price ? `${item.price}` : 'N/A'}</td>
                    <td>${item.source || 'N/A'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${processingTime}</td>
                </tr>
            `;
        });
        
        resultsHTML += `
                    </tbody>
                </table>
            </div>
            <div class="pagination-controls">
                ${result.pagination.hasPrevPage ? `<button onclick="app.changePage(${result.pagination.currentPage - 1})" class="page-btn">← Previous</button>` : ''}
                <span class="page-info">Page ${result.pagination.currentPage} of ${result.pagination.totalPages}</span>
                ${result.pagination.hasNextPage ? `<button onclick="app.changePage(${result.pagination.currentPage + 1})" class="page-btn">Next →</button>` : ''}
            </div>
        `;
        
        resultsContainer.innerHTML = resultsHTML;
        
        // Update summary cards with actual data
        this.updateSummaryCards(result);
        
        // Store current result for paging
        this.currentResult = result;
    }

    updateSummaryCards(result) {
        console.log('🔍 Updating summary cards with result data:', result);
        
        try {
            // Calculate summary statistics for regular results
            const totalItems = result.data ? result.data.length : 0;
            const foundPrices = result.data ? result.data.filter(item => {
                const status = item['Search Status'] || item.Status || item.status;
                const s = (status || '').toString().toLowerCase();
                return s === 'found' || s === 'price found' || s === 'exact' || s === 'found exact';
            }).length : 0;
            const estimatedPrices = result.data ? result.data.filter(item => {
                const status = item['Search Status'] || item.Status || item.status;
                return (status || '').toString().toLowerCase() === 'estimated';
            }).length : 0;
            const denom = foundPrices + estimatedPrices;
            const successRate = denom > 0 ? Math.round((foundPrices / denom) * 100) : 0;
            const processingTime = result.timing ? 
                `${result.timing.totalProcessingTimeMinutes}m ${result.timing.totalProcessingTimeSeconds % 60}s` : '0s';
            
            console.log('📊 Summary stats calculated:', {
                totalItems,
                foundPrices,
                successRate,
                processingTime
            });
            
            // Update regular results summary cards
            const regularTotalItems = document.getElementById('total-items');
            const regularFoundPrices = document.getElementById('found-prices');
            const regularSuccessRate = document.getElementById('success-rate');
            const regularProcessingTime = document.getElementById('processing-time');
            
            if (regularTotalItems) regularTotalItems.textContent = totalItems;
            if (regularFoundPrices) regularFoundPrices.textContent = foundPrices;
            if (regularSuccessRate) regularSuccessRate.textContent = `${successRate}%`;
            if (regularProcessingTime) regularProcessingTime.textContent = processingTime;
            
            console.log('✅ Summary cards updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating summary cards:', error);
        }
    }

    async changePage(page) {
        if (!this.currentResult || !this.currentFile) return;
        
        this.showLoading(`Loading page ${page}...`);
        
        try {
            const result = await this.apiService.processCSVOptimized(this.currentFile, page, this.currentResult.pagination.pageSize);
            
            if (result.success) {
                this.displayResults(result);
            } else {
                this.showError('Failed to load page');
            }
        } catch (error) {
            console.error('❌ Page change error:', error);
            this.showError(`Failed to load page: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    // Clear current processing state when returning to home
    clearCurrentState() {
        console.log('🧹 Clearing current processing state');
        
        // Clear any current results
        this.currentResults = null;
        this.currentFile = null;
        
        // Clear any loading indicators
        this.hideLoading();
        this.hideTypingIndicator();
        
        // Clear any file selections
        if (this.chatGPTInterface) {
            this.chatGPTInterface.clearFiles();
        }
        
        // Reset send button state
        this.updateSendButtonState();
        
        console.log('✅ Current state cleared');
    }

    updatePagination() {
        const paginationContainer = document.getElementById('jobs-pagination');
        if (!paginationContainer) return;
        
        const totalPages = this.totalPages || 1;
        const currentPage = this.currentPage || 1;
        const totalJobs = this.totalJobs || 0;
        
        console.log('🔍 updatePagination: totalPages =', totalPages, 'currentPage =', currentPage, 'totalJobs =', totalJobs);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="pagination-btn prev-btn" onclick="app.goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>`;
        }
        
        // Page numbers - show all pages for better debugging
        const maxVisiblePages = 7; // Show more pages to ensure all are visible
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust startPage if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        console.log('🔍 updatePagination: startPage =', startPage, 'endPage =', endPage);
        
        // Add first page and ellipsis if needed
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn page-btn" onclick="app.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHTML += `<span class="pagination-page current">${i}</span>`;
            } else {
                paginationHTML += `<button class="pagination-btn page-btn" onclick="app.goToPage(${i})">${i}</button>`;
            }
        }
        
        // Add last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn page-btn" onclick="app.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn next-btn" onclick="app.goToPage(${currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>`;
        }
        
        paginationHTML += '</div>';
        
        // Page info
        paginationHTML += `<div class="pagination-info">
            Page ${currentPage} of ${totalPages} (${totalJobs} total jobs)
        </div>`;
        
        paginationContainer.innerHTML = paginationHTML;
        console.log('🔍 updatePagination: HTML generated successfully');
    }

    async goToPage(page) {
        console.log('🔍 goToPage: Navigating to page', page);
        this.currentPage = page;
        // Fetch data for the specific page
        await this.loadAuditJobs(page, this.currentPageSize || 15);
    }

    async changePageSize(newSize) {
        console.log('🔍 changePageSize: Changing page size to', newSize);
        this.currentPageSize = parseInt(newSize);
        this.currentPage = 1; // Reset to first page when changing page size
        await this.loadAuditJobs(1, this.currentPageSize);
    }

    sortTable(column) {
        if (!this.auditJobsData || this.auditJobsData.length === 0) return;
        
        const tbody = document.getElementById('jobs-tbody');
        if (!tbody) return;
        
        // Toggle sort direction
        if (this.currentSortColumn === column) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = 'asc';
        }
        
        // Sort the data
        const sortedData = [...this.auditJobsData].sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];
            
            // Handle special cases
            if (column === 'createdAt') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (column === 'duration') {
                aVal = a.completedAt && a.createdAt ? 
                    (new Date(a.completedAt) - new Date(a.createdAt)) / 1000 : 0;
                bVal = b.completedAt && b.createdAt ? 
                    (new Date(b.completedAt) - new Date(b.createdAt)) / 1000 : 0;
            }
            
            if (aVal < bVal) return this.currentSortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Update the table
        tbody.innerHTML = sortedData.map(job => `
            <tr>
                <td>${job.id || 'N/A'}</td>
                <td><span class="job-type-badge type-${(job.job_type || job.jobType || 'unknown').toLowerCase()}">${job.job_type || job.jobType || 'Unknown'}</span></td>
                <td><span class="status-badge status-${(job.status || 'unknown').toLowerCase()}">${job.status || 'Unknown'}</span></td>
                <td>${(job.created_at || job.createdAt) ? new Date(job.created_at || job.createdAt).toLocaleString() : 'N/A'}</td>
                <td>${job.item_count || job.itemCount || 0}</td>
                <td>${(job.success_rate !== null && job.success_rate !== undefined) || (job.successRate !== null && job.successRate !== undefined) ? 
                    (job.success_rate || job.successRate).toFixed(1) + '%' : 'N/A'}</td>
                <td>${(job.completed_at || job.completedAt) && (job.created_at || job.createdAt) ? 
                    ((new Date(job.completed_at || job.completedAt) - new Date(job.created_at || job.createdAt)) / 1000).toFixed(1) + 's' : 'N/A'}</td>
                <td>
                    <button class="action-btn view-btn" onclick="app.viewJobDetails('${job.id || 'N/A'}')" ${!job.id ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Update sort indicators
        this.updateSortIndicators(column);
    }

    updateSortIndicators(activeColumn) {
        const headers = document.querySelectorAll('#jobs-table th.sortable');
        headers.forEach(header => {
            const icon = header.querySelector('i');
            if (header.dataset.sort === activeColumn) {
                icon.className = this.currentSortDirection === 'asc' ? 
                    'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    filterJobs() {
        const searchTerm = document.getElementById('search-jobs').value.toLowerCase();
        const typeFilter = document.getElementById('job-type-filter').value;
        const statusFilter = document.getElementById('job-status-filter').value;
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        
        if (!this.auditJobsData) return;
        
        let filteredData = this.auditJobsData.filter(job => {
            // Search term filter
            if (searchTerm && !(job.id || '').toLowerCase().includes(searchTerm) && 
                !(job.job_type || job.jobType || '').toLowerCase().includes(searchTerm) && 
                !(job.status || '').toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            // Type filter
            if (typeFilter && (job.job_type || job.jobType) !== typeFilter) {
                return false;
            }
            
            // Status filter
            if (statusFilter && job.status !== statusFilter) {
                return false;
            }
            
            // Date range filter
            if (dateFrom || dateTo) {
                const jobDate = new Date(job.created_at || job.createdAt);
                if (dateFrom && jobDate < new Date(dateFrom)) {
                    return false;
                }
                if (dateTo && jobDate > new Date(dateTo)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Update the table with filtered data
        const tbody = document.getElementById('jobs-tbody');
        if (filteredData.length > 0) {
            tbody.innerHTML = filteredData.map(job => `
                <tr>
                    <td>${job.id || 'N/A'}</td>
                    <td><span class="job-type-badge type-${(job.job_type || job.jobType || 'unknown').toLowerCase()}">${job.job_type || job.jobType || 'Unknown'}</span></td>
                    <td><span class="status-badge status-${(job.status || 'unknown').toLowerCase()}">${job.status || 'Unknown'}</span></td>
                    <td>${(job.created_at || job.createdAt) ? new Date(job.created_at || job.createdAt).toLocaleString() : 'N/A'}</td>
                    <td>${job.item_count || job.itemCount || 0}</td>
                    <td>${(job.success_rate !== null && job.success_rate !== undefined) || (job.successRate !== null && job.successRate !== undefined) ? 
                        (job.success_rate || job.successRate).toFixed(1) + '%' : 'N/A'}</td>
                    <td>${(job.completed_at || job.completedAt) && (job.created_at || job.createdAt) ? 
                        ((new Date(job.completed_at || job.completedAt) - new Date(job.created_at || job.createdAt)) / 1000).toFixed(1) + 's' : 'N/A'}</td>
                    <td>
                        <button class="action-btn view-btn" onclick="app.viewJobDetails('${job.id || 'N/A'}')" ${!job.id ? 'disabled' : ''}>
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No jobs match the current filters.</td></tr>';
        }
        
        // Update pagination for filtered results
        this.totalJobs = filteredData.length;
        this.currentPage = 1;
        this.totalPages = Math.ceil(filteredData.length / 10);
        this.updatePagination();
    }
}

// Initialize the app only once
if (!window.appInstance) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const app = new InsurancePricingApp();
            // Ensure global reference is set
            if (!window.app) {
                window.app = app;
            }
        });
    } else {
        const app = new InsurancePricingApp();
        // Ensure global reference is set
        if (!window.app) {
            window.app = app;
        }
    }
}

// Global function to handle URL opening and storage
window.openUrl = function(url, source, productQuery = '') {
    console.log('🔗 Opening URL:', url, 'for source:', source, 'product:', productQuery);
    
    if (url && url.trim() !== '') {
        // Open the URL in a new tab
        window.open(url, '_blank');
        
        // Store the URL in localStorage for future reference
        const urlData = {
            url: url,
            source: source,
            productQuery: productQuery,
            timestamp: new Date().toISOString()
        };
        
        // Get existing URLs or create new array
        let storedUrls = JSON.parse(localStorage.getItem('pricingUrls') || '[]');
        storedUrls.push(urlData);
        
        // Keep only last 50 URLs to prevent storage bloat
        if (storedUrls.length > 50) {
            storedUrls = storedUrls.slice(-50);
        }
        
        localStorage.setItem('pricingUrls', JSON.stringify(storedUrls));
        
        console.log('✅ URL stored:', urlData);
        
        // Show a brief notification
        if (window.app && window.app.showNotification) {
            window.app.showNotification(`Opening ${source}...`, 'success');
        }
    } else {
        // If no URL, create a search URL for the source with the product query
        const searchUrl = createSearchUrlForSource(source, productQuery);
        if (searchUrl) {
            window.open(searchUrl, '_blank');
            console.log('🔍 Created search URL for source:', source, 'product:', productQuery, '->', searchUrl);
        } else {
            console.log('⚠️ No URL available for source:', source);
            if (window.app && window.app.showNotification) {
                window.app.showNotification(`No direct URL available for ${source}`, 'warning');
            }
        }
    }
};

// Helper function to create search URLs for different sources
function createSearchUrlForSource(source, productQuery = '') {
    if (!source) return null;
    
    const sourceLower = source.toLowerCase();
    
    // Clean and encode the product query
    const cleanQuery = productQuery
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 80);
    
    const encodedQuery = encodeURIComponent(cleanQuery);
    
    // Create search URLs for different retailers with the actual product query
    if (sourceLower.includes('walmart')) {
        return `https://www.walmart.com/search?q=${encodedQuery}`;
    } else if (sourceLower.includes('amazon')) {
        return `https://www.amazon.com/s?k=${encodedQuery}`;
    } else if (sourceLower.includes('target')) {
        return `https://www.target.com/s?searchTerm=${encodedQuery}`;
    } else if (sourceLower.includes('best buy')) {
        return `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedQuery}`;
    } else if (sourceLower.includes('home depot')) {
        return `https://www.homedepot.com/s/${encodedQuery}`;
    } else if (sourceLower.includes('lowes')) {
        return `https://www.lowes.com/search?searchTerm=${encodedQuery}`;
    } else {
        // Default to Google Shopping
        return `https://www.google.com/search?tbm=shop&q=${encodedQuery}`;
    }
}
