// Sidebar Component
export class Sidebar {
    constructor(options) {
        this.container = options.container;
        this.onNavigate = options.onNavigate || (() => {});
        this.activeSection = 'home';
        this.isOpen = false;
        this.isCollapsed = false;
        
        this.init();
    }
    
    init() {
        this.findElements();
        this.bindEvents();
        this.setActiveSection(this.activeSection);
        this.setupResponsive();
        this.ensureHomeAccessibility();
    }
    
    findElements() {
        this.toggleButton = document.getElementById('sidebar-toggle');
        this.closeButton = document.getElementById('sidebar-close');
        this.overlay = document.getElementById('sidebar-overlay');
    }
    
    bindEvents() {
        // Navigation item clicks
        const navItems = this.container.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.handleNavigation(section);
                
                // Close sidebar after navigation on all screen sizes
                this.close();
            });
            
            // Add hover effects
            item.addEventListener('mouseenter', () => {
                this.addHoverEffect(item);
            });
            
            item.addEventListener('mouseleave', () => {
                this.removeHoverEffect(item);
            });
        });
        
        // Logo click - go to home
        const logo = this.container.querySelector('.logo');
        if (logo) {
            logo.addEventListener('click', () => {
                console.log('🏠 Logo clicked - navigating to Home');
                this.handleNavigation('home');
                this.close();
            });
            
            // Add hover effect to logo
            logo.addEventListener('mouseenter', () => {
                logo.style.cursor = 'pointer';
                logo.style.transform = 'scale(1.05)';
            });
            
            logo.addEventListener('mouseleave', () => {
                logo.style.transform = 'scale(1)';
            });
        }
        
        // Toggle button click
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                this.toggle();
            });
        }
        
        // Close button click
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.close();
            });
        }
        
        // Overlay click to close
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.close();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC to close sidebar on mobile/tablet
            if (e.key === 'Escape' && this.isOpen && window.innerWidth < 1024) {
                this.close();
            }
            
            // Alt + M to toggle sidebar
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    setupResponsive() {
        // Handle window resize
        window.addEventListener('resize', () => {
            // Close sidebar on any screen size change
            this.close();
        });
        
        // Set initial state - sidebar hidden on all screen sizes
        this.container.classList.remove('open');
        this.overlay.classList.remove('active');
        this.isOpen = false;
    }
    
    handleNavigation(section) {
        // Always allow navigation to home, even if it's the current section
        if (section === 'home') {
            console.log('🏠 Navigating to Home - always allowed');
            this.setActiveSection(section);
            this.onNavigate(section);
            return;
        }
        
        // Don't navigate if it's the same section (except home)
        if (section === this.activeSection) return;
        
        // Handle logout confirmation
        if (section === 'logout') {
            this.onNavigate(section);
            return; // Don't change active section for logout
        }
        
        this.setActiveSection(section);
        this.onNavigate(section);
    }
    
    setActiveSection(section) {
        // Remove active class from all items
        const navItems = this.container.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to selected item
        const activeItem = this.container.querySelector(`[data-section="${section}"]`);
        if (activeItem && section !== 'logout') {
            activeItem.classList.add('active');
            this.activeSection = section;
            
            // Add activation animation
            this.animateActivation(activeItem);
        }
    }
    
    addHoverEffect(item) {
        if (!item.classList.contains('active')) {
            item.style.transform = 'translateX(4px)';
        }
    }
    
    removeHoverEffect(item) {
        if (!item.classList.contains('active')) {
            item.style.transform = '';
        }
    }
    
    animateActivation(item) {
        // Add a subtle pulse animation
        item.style.animation = 'none';
        item.offsetHeight; // Trigger reflow
        item.style.animation = 'fadeIn 0.3s ease-out';
        
        // Create ripple effect
        this.createRippleEffect(item);
    }
    
    createRippleEffect(item) {
        const ripple = document.createElement('div');
        ripple.classList.add('ripple');
        
        const rect = item.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = rect.width / 2 - size / 2;
        const y = rect.height / 2 - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        // Add ripple keyframes if not already present
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    from {
                        transform: scale(0);
                        opacity: 1;
                    }
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Ensure item has relative positioning
        const originalPosition = item.style.position;
        item.style.position = 'relative';
        item.style.overflow = 'hidden';
        
        item.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
                item.style.position = originalPosition;
                item.style.overflow = '';
            }
        }, 600);
    }
    
    // Method to programmatically set active section
    updateActiveSection(section) {
        this.setActiveSection(section);
    }
    
    // Method to highlight specific sections (e.g., for notifications)
    highlightSection(section, duration = 3000) {
        const item = this.container.querySelector(`[data-section="${section}"]`);
        if (item) {
            item.classList.add('highlighted');
            
            // Add highlight styles if not already present
            if (!document.querySelector('#highlight-styles')) {
                const style = document.createElement('style');
                style.id = 'highlight-styles';
                style.textContent = `
                    .nav-item.highlighted {
                        background-color: rgba(59, 130, 246, 0.2) !important;
                        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4) !important;
                        animation: highlight-pulse 1s infinite alternate;
                    }
                    
                    @keyframes highlight-pulse {
                        from { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4); }
                        to { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            setTimeout(() => {
                item.classList.remove('highlighted');
            }, duration);
        }
    }
    
    // Method to add badge/notification to a section
    addNotificationBadge(section, count = 1) {
        const item = this.container.querySelector(`[data-section="${section}"]`);
        if (item) {
            // Remove existing badge
            const existingBadge = item.querySelector('.notification-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Create new badge
            const badge = document.createElement('span');
            badge.classList.add('notification-badge');
            badge.textContent = count > 99 ? '99+' : count.toString();
            
            // Add badge styles if not already present
            if (!document.querySelector('#badge-styles')) {
                const style = document.createElement('style');
                style.id = 'badge-styles';
                style.textContent = `
                    .notification-badge {
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        background: #ef4444;
                        color: white;
                        border-radius: 10px;
                        font-size: 10px;
                        font-weight: 600;
                        padding: 2px 6px;
                        min-width: 16px;
                        height: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                        animation: badge-appear 0.3s ease-out;
                        z-index: 1;
                    }
                    
                    @keyframes badge-appear {
                        from {
                            transform: scale(0);
                            opacity: 0;
                        }
                        to {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            item.style.position = 'relative';
            item.appendChild(badge);
        }
    }
    
    // Method to remove notification badge
    removeNotificationBadge(section) {
        const item = this.container.querySelector(`[data-section="${section}"]`);
        if (item) {
            const badge = item.querySelector('.notification-badge');
            if (badge) {
                badge.style.animation = 'badge-appear 0.3s ease-out reverse';
                setTimeout(() => {
                    if (badge.parentNode) {
                        badge.remove();
                    }
                }, 300);
            }
        }
    }
    
    // Method to disable/enable sections
    setSectionEnabled(section, enabled = true) {
        const item = this.container.querySelector(`[data-section="${section}"]`);
        if (item) {
            if (enabled) {
                item.classList.remove('disabled');
                item.style.pointerEvents = '';
                item.style.opacity = '';
            } else {
                item.classList.add('disabled');
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.5';
            }
        }
    }
    
    // Method to get current active section
    getActiveSection() {
        return this.activeSection;
    }
    
    // Sidebar control methods
    open() {
        this.isOpen = true;
        this.container.classList.add('open');
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Update main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.add('sidebar-open');
        }
        
        // Update toggle button icon
        if (this.toggleButton) {
            const icon = this.toggleButton.querySelector('i');
            icon.className = 'fas fa-times';
        }
    }
    
    close() {
        this.isOpen = false;
        this.container.classList.remove('open');
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Update main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.remove('sidebar-open');
        }
        
        // Update toggle button icon
        if (this.toggleButton) {
            const icon = this.toggleButton.querySelector('i');
            icon.className = 'fas fa-bars';
        }
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    // Desktop collapse functionality (ChatGPT style)
    collapse() {
        this.isCollapsed = true;
        this.container.classList.add('collapsed');
        
        // Update toggle button icon and position
        if (this.toggleButton) {
            const icon = this.toggleButton.querySelector('i');
            icon.className = 'fas fa-bars';
            
            // Animate button position when sidebar collapses
            if (window.innerWidth >= 1024) {
                this.toggleButton.style.left = '20px';
            }
        }
    }
    
    expand() {
        this.isCollapsed = false;
        this.container.classList.remove('collapsed');
        
        // Update toggle button icon and position
        if (this.toggleButton) {
            const icon = this.toggleButton.querySelector('i');
            icon.className = 'fas fa-times';
            
            // Animate button position when sidebar expands
            if (window.innerWidth >= 1024) {
                this.toggleButton.style.left = '300px';
            }
        }
    }
    
    toggleCollapse() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }
    
    // Method to reset sidebar to initial state
    reset() {
        this.setActiveSection('home');
        this.close();
        this.expand();
        
        // Remove all badges and highlights
        const badges = this.container.querySelectorAll('.notification-badge');
        badges.forEach(badge => badge.remove());
        
        const highlighted = this.container.querySelectorAll('.highlighted');
        highlighted.forEach(item => item.classList.remove('highlighted'));
        
        // Re-enable all sections
        const navItems = this.container.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            this.setSectionEnabled(item.getAttribute('data-section'), true);
        });
    }
    
    // Method to ensure Home button is always accessible
    ensureHomeAccessibility() {
        const homeItem = this.container.querySelector('[data-section="home"]');
        if (homeItem) {
            // Always enable home navigation
            homeItem.classList.remove('disabled');
            homeItem.style.pointerEvents = '';
            homeItem.style.opacity = '';
            
            // Add special styling to indicate it's always clickable
            homeItem.style.cursor = 'pointer';
            
            // Add a subtle indicator that home is always accessible
            if (!homeItem.querySelector('.home-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'home-indicator';
                indicator.innerHTML = '<i class="fas fa-home"></i>';
                indicator.style.cssText = `
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--accent-color, #3b82f6);
                    opacity: 0.7;
                    font-size: 12px;
                `;
                homeItem.style.position = 'relative';
                homeItem.appendChild(indicator);
            }
        }
    }
}

export default Sidebar;
