class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authCallbacks = [];
        this.init();
    }
    init() {
        this.checkAuthState();
        Logger.info('Auth manager initialized');
    }
    checkAuthState() {
        const user = firebase.getCurrentUser();
        if (user) {
            this.currentUser = user;
            this.notifyAuthCallbacks(user);
            Logger.info('User session restored', { uid: user.uid });
        }
    }
    async register(formData) {
        try {
            Logger.userAction('Registration attempt', { email: formData.email, userType: formData.userType });
            this.validateRegistrationData(formData);
            if (formData.password !== formData.confirmPassword) {
                throw new Error('Passwords do not match');
            }
            const startTime = performance.now();
            const result = await firebase.signUp(formData.email, formData.password, {
                fullName: formData.fullName,
                userType: formData.userType
            });
            const duration = performance.now() - startTime;
            Logger.performance('User registration', duration, { 
                email: formData.email, 
                userType: formData.userType 
            });
            this.currentUser = result.user;
            this.notifyAuthCallbacks(result.user);
            Logger.info('User registration successful', { 
                uid: result.user.uid,
                userType: result.user.userType,
                email: result.user.email
            });
            return result.user;
        } catch (error) {
            Logger.error('Registration failed', { 
                email: formData.email,
                error: error.message 
            }, error);
            throw error;
        }
    }
    async login(formData) {
        try {
            Logger.userAction('Login attempt', { email: formData.email, userType: formData.userType });
            this.validateLoginData(formData);
            const startTime = performance.now();
            const result = await firebase.signIn(formData.email, formData.password, formData.userType);
            const duration = performance.now() - startTime;
            Logger.performance('User login', duration, { 
                email: formData.email, 
                userType: formData.userType 
            });
            this.currentUser = result.user;
            this.notifyAuthCallbacks(result.user);
            Logger.info('User login successful', { 
                uid: result.user.uid,
                userType: result.user.userType,
                email: result.user.email
            });
            return result.user;
        } catch (error) {
            Logger.error('Login failed', { 
                email: formData.email,
                error: error.message 
            }, error);
            Logger.security('Failed login attempt', {
                email: formData.email,
                userType: formData.userType,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    async logout() {
        try {
            Logger.userAction('Logout initiated', { uid: this.currentUser?.uid });
            const startTime = performance.now();
            await firebase.signOut();
            const duration = performance.now() - startTime;
            Logger.performance('User logout', duration);
            const previousUser = this.currentUser;
            this.currentUser = null;
            this.notifyAuthCallbacks(null);
            Logger.info('User logout successful', { uid: previousUser?.uid });
            return true;
        } catch (error) {
            Logger.error('Logout failed', { error: error.message }, error);
            throw error;
        }
    }
    validateRegistrationData(data) {
        const errors = [];
        if (!data.fullName || data.fullName.trim().length < 2) {
            errors.push('Full name must be at least 2 characters long');
        }
        if (!this.isValidEmail(data.email)) {
            errors.push('Please enter a valid email address');
        }
        if (!this.isValidPassword(data.password)) {
            errors.push('Password must be at least 6 characters long');
        }
        if (!data.userType || !['admin', 'user'].includes(data.userType)) {
            errors.push('Please select a valid user type');
        }
        if (!data.agreeTerms) {
            errors.push('You must agree to the terms and conditions');
        }
        if (errors.length > 0) {
            Logger.warn('Registration validation failed', { errors });
            throw new Error(errors.join('. '));
        }
    }
    validateLoginData(data) {
        const errors = [];
        if (!this.isValidEmail(data.email)) {
            errors.push('Please enter a valid email address');
        }
        if (!data.password || data.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }
        if (!data.userType || !['admin', 'user'].includes(data.userType)) {
            errors.push('Please select a valid user type');
        }
        if (errors.length > 0) {
            Logger.warn('Login validation failed', { errors });
            throw new Error(errors.join('. '));
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isValidPassword(password) {
        return password && password.length >= 6;
    }
    getCurrentUser() {
        return this.currentUser;
    }
    isAuthenticated() {
        return this.currentUser !== null;
    }
    hasRole(role) {
        return this.currentUser && this.currentUser.userType === role;
    }
    requireAuth() {
        if (!this.isAuthenticated()) {
            Logger.security('Unauthorized access attempt', {
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
            throw new Error('Authentication required');
        }
        return this.currentUser;
    }
    requireRole(role) {
        this.requireAuth();
        if (!this.hasRole(role)) {
            Logger.security('Insufficient permissions', {
                requiredRole: role,
                userRole: this.currentUser.userType,
                uid: this.currentUser.uid
            });
            throw new Error('Insufficient permissions');
        }
        return this.currentUser;
    }
    onAuthStateChanged(callback) {
        this.authCallbacks.push(callback);
        if (this.currentUser) {
            callback(this.currentUser);
        }
    }
    notifyAuthCallbacks(user) {
        this.authCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                Logger.error('Auth callback error', { error: error.message }, error);
            }
        });
    }
    refreshSession() {
        Logger.info('Session refresh requested', { uid: this.currentUser?.uid });
        return Promise.resolve(this.currentUser);
    }
    getSessionInfo() {
        if (!this.currentUser) {
            return null;
        }
        return {
            uid: this.currentUser.uid,
            email: this.currentUser.email,
            displayName: this.currentUser.displayName,
            userType: this.currentUser.userType,
            lastLogin: this.currentUser.lastLogin,
            sessionDuration: Date.now() - new Date(this.currentUser.lastLogin || Date.now()).getTime()
        };
    }
}
const authManager = new AuthManager();
function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    if (!loginForm) return;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const data = {
            email: formData.get('email'),
            password: formData.get('password'),
            userType: formData.get('userType')
        };
        try {
            showLoading('Authenticating...');
            loginBtn.disabled = true;
            const user = await authManager.login(data);
            hideLoading();
            showToast('Login successful!', 'success');
            setTimeout(() => {
                if (user.userType === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } catch (error) {
            hideLoading();
            loginBtn.disabled = false;
            showToast(error.message, 'error');
        }
    });
}
function initializeRegistration() {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    if (!registerForm) return;
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            userType: formData.get('userType'),
            agreeTerms: formData.get('agreeTerms') === 'on'
        };
        try {
            showLoading('Creating account...');
            registerBtn.disabled = true;
            const user = await authManager.register(data);
            hideLoading();
            showToast('Account created successfully!', 'success');
            setTimeout(() => {
                if (user.userType === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } catch (error) {
            hideLoading();
            registerBtn.disabled = false;
            showToast(error.message, 'error');
        }
    });
}
function initializeDashboard() {
    try {
        const user = authManager.requireAuth();
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email;
        }
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await authManager.logout();
                    showToast('Logged out successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } catch (error) {
                    showToast('Logout failed: ' + error.message, 'error');
                }
            });
        }
        Logger.info('Dashboard initialized for user', { 
            uid: user.uid, 
            userType: user.userType 
        });
    } catch (error) {
        Logger.error('Dashboard authentication failed', { error: error.message });
        showToast('Authentication required', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
}
function initializeAdminDashboard() {
    try {
        const user = authManager.requireRole('admin');
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email;
        }
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await authManager.logout();
                    showToast('Logged out successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } catch (error) {
                    showToast('Logout failed: ' + error.message, 'error');
                }
            });
        }
        initializeLocationUpload();
        loadLocations();
        loadSystemStats();
        Logger.info('Admin dashboard initialized', { uid: user.uid });
    } catch (error) {
        Logger.error('Admin authentication failed', { error: error.message });
        showToast('Admin access required', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
}
window.authManager = authManager;