// Utility Functions for EPLQ

function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageElement = overlay?.querySelector('p');
    if (overlay) {
        if (messageElement) {
            messageElement.textContent = message;
        }
        overlay.classList.remove('hidden');
    }
}
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toastId = `toast_${Date.now()}`;
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="${iconMap[type] || iconMap.info}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="closeToast('${toastId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        closeToast(toastId);
    }, duration);
    Logger.info('Toast notification shown', { message, type, duration });
}
function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function validateCoordinate(value, type) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (type === 'latitude') {
        return num >= -90 && num <= 90;
    } else if (type === 'longitude') {
        return num >= -180 && num <= 180;
    }
    return false;
}
function validateRadius(radius) {
    const num = parseFloat(radius);
    return !isNaN(num) && num > 0 && num <= 50;
}
function formatDistance(distance) {
    if (distance < 1) {
        return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(2)}km`;
}
function formatDuration(milliseconds) {
    if (milliseconds < 1000) {
        return `${milliseconds.toFixed(1)}ms`;
    }
    return `${(milliseconds / 1000).toFixed(2)}s`;
}
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        Logger.warn('Failed to save to localStorage', { key, error: error.message });
        return false;
    }
}
function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        Logger.warn('Failed to load from localStorage', { key, error: error.message });
        return defaultValue;
    }
}
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        Logger.warn('Failed to remove from localStorage', { key, error: error.message });
        return false;
    }
}
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}
function removeQueryParam(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}
function isMobile() {
    return window.innerWidth <= 768;
}
function isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
}
function isDesktop() {
    return window.innerWidth > 1024;
}
function getTouchSupport() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
function measurePerformance(name, fn) {
    return async function(...args) {
        const startTime = performance.now();
        const result = await fn.apply(this, args);
        const duration = performance.now() - startTime;
        
        Logger.performance(name, duration);
        return result;
    };
}
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
function fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.display = 'block';
    const start = performance.now();
    function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        element.style.opacity = progress.toString();
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}
function fadeOut(element, duration = 300) {
    const start = performance.now();
    const startOpacity = parseFloat(element.style.opacity) || 1;
    function animate(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        element.style.opacity = (startOpacity * (1 - progress)).toString();
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    }
    requestAnimationFrame(animate);
}
function handleError(error, context = '') {
    Logger.error(`Error in ${context}`, { error: error.message }, error);
    if (error.name === 'NetworkError') {
        showToast('Network error. Please check your connection.', 'error');
    } else if (error.name === 'AuthError') {
        showToast('Authentication error. Please log in again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } else {
        showToast(`An error occurred: ${error.message}`, 'error');
    }
}
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success', 2000);
        return true;
    } catch (error) {
        Logger.warn('Failed to copy to clipboard', { error: error.message });
        showToast('Failed to copy to clipboard', 'warning');
        return false;
    }
}
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
window.closeToast = closeToast;
window.validateEmail = validateEmail;
window.validateCoordinate = validateCoordinate;
window.validateRadius = validateRadius;
window.formatDistance = formatDistance;
window.formatDuration = formatDuration;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.handleError = handleError;
window.copyToClipboard = copyToClipboard;