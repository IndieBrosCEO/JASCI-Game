class UIManager {
    constructor() {
        this.toastContainer = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create container for toasts if it doesn't exist
        if (!document.getElementById('toast-notification-container')) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-notification-container';
            document.body.appendChild(this.toastContainer);

            // Apply basic styles dynamically, though preferably in CSS
            this.toastContainer.style.position = 'fixed';
            this.toastContainer.style.top = '20px';
            this.toastContainer.style.left = '50%';
            this.toastContainer.style.transform = 'translateX(-50%)';
            this.toastContainer.style.zIndex = '9999';
            this.toastContainer.style.pointerEvents = 'none'; // Click through container
            this.toastContainer.style.display = 'flex';
            this.toastContainer.style.flexDirection = 'column';
            this.toastContainer.style.gap = '10px';
            this.toastContainer.style.width = '300px';
        } else {
            this.toastContainer = document.getElementById('toast-notification-container');
        }
    }

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {string} type - The type of notification: 'info', 'success', 'warning', 'error', 'event', 'event-critical'.
     * @param {number} duration - Duration in ms before auto-dismissing. Default 3000ms.
     */
    showToastNotification(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerText = message;

        // Styles for the toast
        toast.style.padding = '10px 15px';
        toast.style.borderRadius = '4px';
        toast.style.color = '#fff';
        toast.style.fontFamily = "'DwarfFortress', monospace";
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease-in-out';
        toast.style.pointerEvents = 'auto'; // Allow clicking (e.g., to dismiss if we added a button)
        toast.style.textAlign = 'center';
        toast.style.border = '1px solid #555';

        // Type-specific colors
        switch (type) {
            case 'success':
                toast.style.backgroundColor = 'rgba(40, 167, 69, 0.9)'; // Green
                toast.style.borderColor = '#28a745';
                break;
            case 'warning':
                toast.style.backgroundColor = 'rgba(255, 193, 7, 0.9)'; // Yellow/Orange
                toast.style.color = '#000';
                toast.style.borderColor = '#ffc107';
                break;
            case 'error':
            case 'danger':
                toast.style.backgroundColor = 'rgba(220, 53, 69, 0.9)'; // Red
                toast.style.borderColor = '#dc3545';
                break;
            case 'event':
                toast.style.backgroundColor = 'rgba(23, 162, 184, 0.9)'; // Cyan/Info
                toast.style.borderColor = '#17a2b8';
                break;
            case 'event-critical':
                toast.style.backgroundColor = 'rgba(102, 16, 242, 0.9)'; // Purple
                toast.style.borderColor = '#6610f2';
                toast.style.fontWeight = 'bold';
                break;
            case 'info':
            case 'info_minor':
            default:
                toast.style.backgroundColor = 'rgba(50, 50, 50, 0.9)'; // Dark Grey
                toast.style.borderColor = '#777';
                break;
        }

        this.toastContainer.appendChild(toast);

        // Fade in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (this.toastContainer.contains(toast)) {
                    this.toastContainer.removeChild(toast);
                }
            }, 300); // Wait for transition
        }, duration);
    }
}

// Make globally available
window.UIManager = UIManager;
