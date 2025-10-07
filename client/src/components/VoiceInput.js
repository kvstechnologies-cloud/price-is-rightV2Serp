// Voice Input Component
class VoiceInput {
    constructor(options) {
        this.container = options.container;
        this.onTranscript = options.onTranscript;
        
        this.isRecording = false;
        this.recognition = null;
        this.transcript = '';
        
        this.init();
    }
    
    init() {
        this.setupSpeechRecognition();
        this.bindEvents();
    }
    
    setupSpeechRecognition() {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateUI();
            console.log('Voice recording started');
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            this.transcript = finalTranscript + interimTranscript;
            this.updateTranscriptDisplay();
            
            if (finalTranscript) {
                this.onTranscript(finalTranscript);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopRecording();
        };
        
        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateUI();
            console.log('Voice recording ended');
        };
    }
    
    bindEvents() {
        if (!this.container) return;
        
        const startBtn = this.container.querySelector('#start-recording');
        const stopBtn = this.container.querySelector('#stop-recording');
        const closeBtn = this.container.querySelector('#voice-modal-close');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startRecording();
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopRecording();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Connect voice button in chat interface
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.openModal();
            });
        }
    }
    
    startRecording() {
        if (!this.recognition) {
            this.showError('Speech recognition not supported in this browser');
            return;
        }
        
        if (this.isRecording) return;
        
        try {
            this.transcript = '';
            this.recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.showError('Could not start voice recording');
        }
    }
    
    stopRecording() {
        if (!this.recognition || !this.isRecording) return;
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }
    
    openModal() {
        if (this.container) {
            this.container.classList.add('active');
            this.updateUI();
        }
    }
    
    closeModal() {
        this.stopRecording();
        if (this.container) {
            this.container.classList.remove('active');
        }
    }
    
    updateUI() {
        if (!this.container) return;
        
        const startBtn = this.container.querySelector('#start-recording');
        const stopBtn = this.container.querySelector('#stop-recording');
        const status = this.container.querySelector('#voice-status');
        
        if (startBtn) startBtn.disabled = this.isRecording;
        if (stopBtn) stopBtn.disabled = !this.isRecording;
        
        if (status) {
            if (this.isRecording) {
                status.textContent = 'Listening... Click stop when finished';
                status.className = 'recording';
            } else {
                status.textContent = 'Click the microphone to start speaking';
                status.className = '';
            }
        }
    }
    
    updateTranscriptDisplay() {
        const transcriptEl = this.container?.querySelector('#voice-transcript');
        if (transcriptEl) {
            transcriptEl.textContent = this.transcript;
            transcriptEl.classList.add('visible');
        }
    }
    
    showError(message) {
        const status = this.container?.querySelector('#voice-status');
        if (status) {
            status.textContent = message;
            status.className = 'error';
        }
        console.error('Voice Input Error:', message);
    }
}

// Make VoiceInput globally available
window.VoiceInput = VoiceInput;

export default VoiceInput;