# Quick Start Guide - Insurance Pricing System V2

## 🚀 5-Minute Overview

This is a **modern insurance pricing application** with AWS Cognito authentication. Users must log in before accessing any features.

### Key Points:
- **Authentication-first**: No access without login
- **ChatGPT-style interface**: Modern chat for insurance queries
- **AWS Cognito**: Secure user management
- **Vanilla JavaScript**: No frameworks, just ES6 modules
- **Responsive design**: Works on all devices

## 📁 Essential Files

### Core Files (Must Understand)
```
index.html              # Entry point - loads everything
js/app.js              # Main controller - orchestrates everything
js/components/AuthComponent.js  # Handles login/logout
src/config/amplify-config.js   # AWS Cognito configuration
styles/main.css        # Global styles and theme variables
```

### Key Components
```
js/components/
├── AuthComponent.js      # Authentication (login form, session management)
├── ChatInterface.js      # Chat functionality
├── ChatGPTInterface.js   # AI chat interface
├── Sidebar.js           # Navigation
└── VoiceInput.js        # Speech-to-text
```

## 🔐 Authentication Flow (Critical to Understand)

1. **User visits app** → Loading screen appears
2. **App checks if user is logged in** → AWS Cognito check
3. **If NOT logged in** → Beautiful centered login form
4. **If logged in** → Main application loads
5. **User logs out** → Back to login form

### Code Flow:
```javascript
// 1. App starts (js/app.js)
async init() {
    await this.initializeAuthentication();  // Check login status
    if (this.isAuthenticated) {
        this.showMainApplication();         // Show main app
    }
    // If not authenticated, login form is already shown
}

// 2. Authentication check (js/components/AuthComponent.js)
async checkAuthStatus() {
    // Try to get current user from AWS Cognito
    // If fails → show login form
    // If succeeds → user is authenticated
}
```

## 🎨 Theme System

The app supports light/dark themes using CSS variables:

```css
/* Light theme (default) */
:root {
    --bg-primary: #ffffff;
    --text-primary: #1a1a1a;
    --primary-color: #3498db;
}

/* Dark theme */
[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --text-primary: #ffffff;
}
```

**Theme toggle**: Global button in the main interface

## 🛠️ Development Setup

### Prerequisites
- Node.js (v14+)
- AWS CLI configured
- Python (for local server)

### Quick Start
```bash
# 1. Clone and install
git clone <repo>
cd price-is-right-V2
npm install

# 2. Configure AWS (if not done)
aws configure set aws_access_key_id YOUR_KEY
aws configure set aws_secret_access_key YOUR_SECRET
aws configure set default.region us-east-1

# 3. Deploy Cognito (if not done)
.\deploy-cognito.ps1

# 4. Start development server
python -m http.server 5000

# 5. Open browser
http://localhost:5000
```

## 🧪 Testing

All test files are in `test/` directory:
- `auth-test.html` - Test authentication
- `test-buttons.html` - Test UI components
- `test.html` - General functionality
- `popup-test.html` - Test popups

**Access tests**: `http://localhost:5000/test/`

## 🐛 Common Issues

### 1. "Loading Insurance Pricing System..." stuck
**Cause**: Authentication initialization failed
**Fix**: Check browser console for errors, verify AWS Amplify is loading

### 2. Login form not working
**Cause**: AWS Cognito configuration incorrect
**Fix**: Check `src/config/amplify-config.js` has correct IDs

### 3. Theme not changing
**Cause**: CSS variables not defined or cached
**Fix**: Clear browser cache, check `styles/main.css`

## 🔧 Adding New Features

### 1. Create Component
```javascript
// js/components/NewFeature.js
export class NewFeature {
    constructor(container) {
        this.container = container;
    }
    
    async init() {
        // Setup logic
        this.render();
    }
    
    render() {
        // Render HTML
    }
}
```

### 2. Add to Main App
```javascript
// js/app.js
import { NewFeature } from './components/NewFeature.js';

// In init() method
this.newFeature = new NewFeature(container);
await this.newFeature.init();
```

### 3. Add Styling
```css
/* styles/new-feature.css */
.new-feature {
    /* Use CSS variables for theming */
    background: var(--bg-primary);
    color: var(--text-primary);
}
```

## 📚 Key Concepts

### Component Pattern
- **Constructor**: Takes container element
- **init()**: Async initialization
- **render()**: Renders HTML
- **Event listeners**: Added in render()

### State Management
- **App state**: `js/app.js` manages global state
- **Component state**: Each component manages its own state
- **Authentication state**: Managed by `AuthComponent`

### File Organization
- **Components**: `js/components/`
- **Services**: `js/services/`
- **Styles**: `styles/`
- **Config**: `src/config/`
- **Tests**: `test/`

## 🚨 Important Notes

1. **Authentication is required** for everything
2. **AWS Cognito must be configured** before testing
3. **All components are ES6 modules**
4. **CSS variables are used for theming**
5. **Test files are in separate directory**

## 🆘 Getting Help

1. **Check browser console** (F12) for errors
2. **Review test files** for examples
3. **Read DEVELOPER_GUIDE.md** for detailed info
4. **Check README.md** for setup instructions

---

**Remember**: This is an **authentication-first application**. Every feature requires a logged-in user! 