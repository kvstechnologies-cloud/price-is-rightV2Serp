export class AuthComponent {
    constructor(container) {
        this.container = container;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.onLoginSuccess = null;
    }

    async init() {
        // Check if user is already authenticated
        await this.checkAuthStatus();
        this.render();
    }

    async checkAuthStatus() {
        try {
            // Check localStorage for authentication persistence
            const storedAuth = localStorage.getItem('isAuthenticated');
            const storedEmail = localStorage.getItem('userEmail');
            const authTimestamp = localStorage.getItem('authTimestamp');
            
            // Check if stored auth is still valid (within 24 hours)
            const isValidStoredAuth = storedAuth === 'true' && 
                                    storedEmail && 
                                    authTimestamp && 
                                    (Date.now() - parseInt(authTimestamp)) < (24 * 60 * 60 * 1000);
            
            if (isValidStoredAuth) {
                console.log('Using stored authentication from localStorage');
                this.currentUser = { 
                    attributes: { 
                        email: storedEmail 
                    } 
                };
                this.isAuthenticated = true;
                return true;
            } else {
                console.log('Stored authentication is invalid or expired');
                // Clear any invalid stored authentication
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('authTimestamp');
            }
            
            this.isAuthenticated = false;
            this.currentUser = null;
            return false;
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
            return false;
        }
    }

    render() {
        if (this.isAuthenticated) {
            this.renderAuthenticatedView();
        } else {
            this.renderLoginForm();
        }
    }

    renderAuthenticatedView() {
        this.container.innerHTML = `
            <div id="main-app-content" class="auth-container">
                <div class="auth-header">
                    <h2>Welcome, ${this.currentUser?.attributes?.email || 'User'}!</h2>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
                <div class="auth-content">
                    <p>You are now authenticated and can access the main application.</p>
                    <button id="show-main-app" class="btn btn-primary">Continue to App</button>
                </div>
            </div>
        `;

        // Add event listeners
        const logoutBtn = this.container.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const showMainAppBtn = this.container.querySelector('#show-main-app');
        if (showMainAppBtn) {
            showMainAppBtn.addEventListener('click', () => {
                if (this.onLoginSuccess) {
                    this.onLoginSuccess();
                }
            });
        }
    }

    renderLoginForm() {
        this.container.innerHTML = `
            <div class="auth-container">
                <div class="auth-header">
                    <h2>Insurance Pricing System</h2>
                    <p>Please sign in to continue</p>
                </div>
                <div class="auth-content">
                    <form id="login-form" class="auth-form">
                        <div class="form-group">
                            <label for="email">Email:</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Password:</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Sign In</button>
                    </form>
                    <div class="auth-info">
                        <p><strong>Development Mode:</strong> Any email/password combination will work for testing.</p>
                    </div>
                </div>
            </div>
        `;

        // Add form event listener
        const form = this.container.querySelector('#login-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing In...';
        submitBtn.disabled = true;

        try {
            // Development mode - simulate authentication
            this.currentUser = { attributes: { email } };
            this.isAuthenticated = true;
            console.log('Development mode login successful');
            
            // Store authentication state for development mode
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userEmail', email);
            localStorage.setItem('authTimestamp', Date.now().toString());

            // Call the success callback to show main app
            if (this.onLoginSuccess) {
                this.onLoginSuccess();
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleLogout() {
        try {
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Clear stored authentication state
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('authTimestamp');
            
            this.render();
            console.log('Logout successful');
            
            // Reload the page to show login form
            window.location.reload();
        } catch (error) {
            console.error('Logout failed:', error);
            alert(`Logout failed: ${error.message}`);
        }
    }

    showMainApp() {
        // This method will be called to show the main application content
        // after successful authentication
        const mainAppContent = this.container.querySelector('#main-app-content');
        if (mainAppContent) {
            mainAppContent.style.display = 'block';
        }
    }

    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            currentUser: this.currentUser
        };
    }

    setLoginSuccessCallback(callback) {
        this.onLoginSuccess = callback;
    }
} 