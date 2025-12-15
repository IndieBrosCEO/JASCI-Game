class UIManager {
    constructor() {
        this.toastContainer = null;
        this.createToastContainer();
    }

    createToastContainer() {
        if (document.getElementById('toast-container')) {
            this.toastContainer = document.getElementById('toast-container');
            return;
        }

        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.style.position = 'fixed';
        this.toastContainer.style.bottom = '20px';
        this.toastContainer.style.left = '50%';
        this.toastContainer.style.transform = 'translateX(-50%)';
        this.toastContainer.style.display = 'flex';
        this.toastContainer.style.flexDirection = 'column-reverse'; // Newest at bottom
        this.toastContainer.style.alignItems = 'center';
        this.toastContainer.style.zIndex = '10000';
        this.toastContainer.style.pointerEvents = 'none'; // Let clicks pass through container

        document.body.appendChild(this.toastContainer);
    }

    showToastNotification(message, type = 'info', duration = 3000) {
        if (!this.toastContainer) this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;

        // Inline styles for basic look, can be moved to CSS
        toast.style.background = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
        toast.style.marginTop = '10px';
        toast.style.borderRadius = '5px';
        toast.style.border = '1px solid #555';
        toast.style.fontFamily = "'DwarfFortress', monospace";
        toast.style.pointerEvents = 'auto'; // Allow clicking on toast if needed
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease-in-out';

        // Type specific styles
        if (type === 'success') {
            toast.style.border = '1px solid #4CAF50';
            toast.style.color = '#e8f5e9';
        } else if (type === 'error' || type === 'failure') {
            toast.style.border = '1px solid #F44336';
            toast.style.color = '#ffebee';
        } else if (type === 'warning') {
            toast.style.border = '1px solid #ff9800';
            toast.style.color = '#fff3e0';
        }

        this.toastContainer.appendChild(toast);

        // Fade in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });

        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500); // Wait for transition
        }, duration);
    }
}

// Global Assignment
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
