# Developer Guide - Insurance Pricing System V2

This guide is designed to help new developers understand the project architecture, key concepts, and how to work with the codebase effectively.

## 🎯 Project Overview

This is a **modern insurance pricing application** built with vanilla JavaScript and AWS services. The application features:

- **Authentication-first design** - Users must log in before accessing any features
- **ChatGPT-style interface** - Modern chat interface for insurance queries
- **Real-time voice input** - Speech-to-text functionality
- **File management** - Drag-and-drop file uploads
- **Theme system** - Light/dark theme support
- **Responsive design** - Works on all device sizes

## 🏗️ Architecture Principles

### 1. **Authentication-First Architecture**
- **No access without login**: The entire application is protected behind AWS Cognito authentication
- **Session management**: JWT tokens handle user sessions
- **Automatic redirects**: Users are redirected to login when not authenticated

### 2. **Component-Based Design**
- **Modular JavaScript**: Each feature is a separate ES6 module
- **Single Responsibility**: Each component has one clear purpose
- **Reusable components**: Components can be used across different parts of the app

### 3. **Progressive Enhancement**
- **Core functionality works without JavaScript**: Basic HTML structure is accessible
- **Enhanced with JavaScript**: Advanced features are added progressively
- **Graceful degradation**: Features degrade gracefully when not supported

## 🔑 Key Concepts

### Authentication Flow
```javascript
// 1. User visits app → Loading screen
// 2. App checks authentication status
// 3. If not authenticated → Show login form
// 4. If authenticated → Show main application
// 5. User logs out → Redirect to login form
```

### Component Lifecycle
```javascript
class ComponentName {
    constructor(container) {
        this.container = container;
        // Don't auto-initialize here
    }
    
    async init() {
        // Initialize component
        await this.setup();
        this.render();
    }
    
    render() {
        // Render component HTML
    }
    
    destroy() {
        // Clean up event listeners
    }
}
```

### Theme System
```css
/* CSS Variables for theming */
:root {
    --bg-primary: #ffffff;
    --text-primary: #1a1a1a;
    /* Light theme variables */
}

[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --text-primary: #ffffff;
    /* Dark theme variables */
}
```

## 📁 File Structure Deep Dive

### Core Application Files

#### `index.html`
- **Entry point** of the application
- Contains the basic HTML structure
- Loads all CSS and JavaScript files
- Includes loading screen and main container

#### `js/app.js`
- **Main application controller**
- Orchestrates all components
- Handles authentication flow
- Manages application state

#### `js/components/AuthComponent.js`
- **Authentication handling**
- Renders login form
- Manages user sessions
- Handles login/logout logic

#### `js/components/ChatInterface.js`
- **Chat functionality**
- Message handling
- Real-time updates
- File attachments

#### `js/components/ChatGPTInterface.js`
- **AI chat interface**
- ChatGPT-style UI
- Message threading
- Response handling

### Configuration Files

#### `src/config/amplify-config.js`
```javascript
export const amplifyConfig = {
    Auth: {
        region: 'us-east-1',
        userPoolId: 'your-user-pool-id',
        userPoolWebClientId: 'your-client-id',
        identityPoolId: 'your-identity-pool-id',
        mandatorySignIn: true,
        authenticationFlowType: 'USER_SRP_AUTH'
    }
};
```

#### `aws-credentials.env`
- Contains AWS credentials for deployment
- **Never commit to version control**
- Used by deployment scripts

## 🔧 Development Workflow

### 1. **Understanding the Authentication Flow**

The authentication system works in this order:

1. **App Initialization** (`js/app.js`)
   ```javascript
   async init() {
       await this.initializeAuthentication();
       if (this.isAuthenticated) {
           this.showMainApplication();
       }
   }
   ```

2. **Authentication Check** (`js/components/AuthComponent.js`)
   ```javascript
   async checkAuthStatus() {
       // Check if user is already logged in
       // If not, show login form
   }
   ```

3. **Login Process**
   ```javascript
   async handleLogin(e) {
       // Authenticate with AWS Cognito
       // On success, call onLoginSuccess callback
   }
   ```

### 2. **Adding New Features**

When adding new features:

1. **Create a new component** in `js/components/`
2. **Follow the component pattern**:
   ```javascript
   export class NewFeature {
       constructor(container) {
           this.container = container;
       }
       
       async init() {
           // Setup logic
       }
       
       render() {
           // Render HTML
       }
   }
   ```

3. **Add to main app** (`js/app.js`):
   ```javascript
   import { NewFeature } from './components/NewFeature.js';
   
   // In the app class
   this.newFeature = new NewFeature(container);
   await this.newFeature.init();
   ```

### 3. **Styling Guidelines**

- **Use CSS variables** for theming
- **Follow BEM methodology** for class naming
- **Mobile-first responsive design**
- **Accessibility considerations**

## 🧪 Testing Strategy

### Test Files Location
All test files are in the `test/` directory:

- `auth-test.html` - Test authentication components
- `test-buttons.html` - Test UI interactions
- `test.html` - General functionality testing
- `popup-test.html` - Test popup components

### Running Tests
1. Start development server: `python -m http.server 5000`
2. Navigate to: `http://localhost:5000/test/`
3. Open specific test file

### Testing Best Practices
- **Test components in isolation**
- **Mock external dependencies**
- **Test both success and error scenarios**
- **Verify accessibility features**

## 🐛 Debugging Guide

### Common Issues and Solutions

#### 1. **Loading Screen Stuck**
**Symptoms**: "Loading Insurance Pricing System..." never disappears

**Debugging Steps**:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify AWS Amplify library is loading
4. Check network connectivity

**Common Causes**:
- AWS Amplify not loaded
- Authentication initialization error
- Network connectivity issues

#### 2. **Authentication Fails**
**Symptoms**: Login form doesn't work or shows errors

**Debugging Steps**:
1. Check Cognito configuration in `src/config/amplify-config.js`
2. Verify AWS credentials are correct
3. Ensure user exists in Cognito User Pool
4. Check browser console for error messages

#### 3. **Theme Not Applying**
**Symptoms**: Dark/light theme toggle doesn't work

**Debugging Steps**:
1. Check CSS variable definitions in `styles/main.css`
2. Verify theme toggle functionality in `js/app.js`
3. Clear browser cache
4. Check localStorage for theme preference

### Debug Mode
Enable detailed logging by checking browser console for:
- Authentication status messages
- Component initialization logs
- API request/response details
- Error stack traces

## 🔄 State Management

### Application State
The application uses a simple state management pattern:

```javascript
class InsurancePricingApp {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.currentSection = 'home';
        this.initialized = false;
    }
}
```

### Component State
Each component manages its own state:

```javascript
class AuthComponent {
    constructor(container) {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.onLoginSuccess = null;
    }
}
```

## 🚀 Performance Considerations

### Loading Optimization
- **Lazy loading** of components
- **Minimal initial bundle** size
- **Progressive enhancement**

### Memory Management
- **Event listener cleanup** in component destroy methods
- **Proper garbage collection** of unused objects
- **Efficient DOM manipulation**

### Network Optimization
- **Request queuing** for API calls
- **Retry logic** for failed requests
- **Caching strategies** for static assets

## 🔒 Security Best Practices

### Authentication Security
- **JWT token validation** on all API requests
- **Secure token storage** in memory (not localStorage)
- **Automatic token refresh** handling
- **Session timeout** management

### Input Validation
- **Client-side validation** for immediate feedback
- **Server-side validation** for security
- **XSS prevention** through proper escaping
- **CSRF protection** through tokens

### File Upload Security
- **File type validation** on client and server
- **File size limits** enforcement
- **Virus scanning** for uploaded files
- **Secure file storage** with encryption

## 📚 Learning Resources

### JavaScript Concepts
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Async/Await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)

### AWS Services
- [AWS Cognito](https://docs.aws.amazon.com/cognito/)
- [AWS Amplify](https://docs.amplify.aws/)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)

### Web Development
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)

## 🤝 Contributing Guidelines

### Code Style
- **ES6+ JavaScript** with modules
- **Semantic HTML** structure
- **CSS variables** for theming
- **Responsive design** principles

### Git Workflow
1. **Create feature branch** from main
2. **Make focused commits** with clear messages
3. **Test thoroughly** before submitting
4. **Update documentation** as needed
5. **Submit pull request** with description

### Code Review Checklist
- [ ] Code follows project conventions
- [ ] All tests pass
- [ ] No console errors
- [ ] Responsive design works
- [ ] Accessibility features included
- [ ] Documentation updated

## 🆘 Getting Help

### When You're Stuck
1. **Check the troubleshooting section** in README.md
2. **Review test files** for examples
3. **Check browser console** for error messages
4. **Search existing issues** in the repository
5. **Ask specific questions** with context

### Useful Commands
```bash
# Start development server
python -m http.server 5000

# Check AWS CLI configuration
aws sts get-caller-identity

# Deploy Cognito infrastructure
.\deploy-cognito.ps1

# Run tests
# Navigate to http://localhost:5000/test/
```

---

**Remember**: This application is designed to be **authentication-first**. Every feature requires a logged-in user, and the entire application flow is built around this principle. 