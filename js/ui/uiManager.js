class ToastUIManager {
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

        // Sound Effects
        if (window.audioManager) {
            let sound = 'ui_type_02.wav'; // Default info/minor
            let volume = 0.4;
            switch (type) {
                case 'success':
                    sound = 'ui_craft_success_01.wav';
                    volume = 0.6;
                    break;
                case 'warning':
                    sound = 'ui_error_01.wav';
                    volume = 0.4;
                    break;
                case 'error':
                case 'danger':
                    sound = 'ui_error_01.wav';
                    volume = 0.7;
                    break;
                case 'event':
                    sound = 'ui_confirm_01.wav';
                    volume = 0.6;
                    break;
                case 'event-critical':
                    sound = 'quest_complete_01.wav';
                    volume = 0.8;
                    break;
                case 'info':
                case 'info_minor':
                default:
                    sound = 'ui_type_02.wav';
                    volume = 0.3;
                    break;
            }
            window.audioManager.playSound(sound, { volume });
        }

        // Inline styles removed in favor of CSS classes in style.css

        this.toastContainer.appendChild(toast);

        // Animation is handled by CSS keyframes on class .toast-notification

        // Auto remove
        setTimeout(() => {
            toast.classList.add('toast-exiting'); // Trigger fade out animation
            setTimeout(() => {
                if (this.toastContainer.contains(toast)) {
                    this.toastContainer.removeChild(toast);
                }
            }, 300); // Wait for transition
        }, duration);
    }
}

// Make globally available
window.ToastUIManager = ToastUIManager;
