class UIEnhancer {
    constructor() {
        this.init();
    }

    init() {
        console.log("Initializing UI Enhancer...");
        this.setupGlobalInteractions();
        this.setupListObservers();
        this.setupModalObservers();
    }

    setupGlobalInteractions() {
        // Global delegation for hover and click sounds
        document.addEventListener('mouseover', (e) => {
            if (this.isInteractive(e.target)) {
                if (window.audioManager) {
                    // Very quiet tick for hover
                    window.audioManager.playSound('ui_type_03.wav', { volume: 0.05 });
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (this.isInteractive(e.target)) {
                if (window.audioManager) {
                    // Standard click
                    window.audioManager.playSound('ui_click_01.wav', { volume: 0.3 });

                    // Create a visual ripple effect
                    this.createRipple(e);
                }
            }
        });

        // Add focus listeners for inputs
        document.addEventListener('focus', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                if (window.audioManager) {
                    window.audioManager.playSound('ui_type_01.wav', { volume: 0.05 });
                }
            }
        }, true);
    }

    isInteractive(element) {
        // Check if element is a button, input, link, or has specific classes
        if (!element) return false;
        const tag = element.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A') return true;
        if (element.classList.contains('inventory-item')) return true;
        if (element.classList.contains('quest-item')) return true;
        if (element.classList.contains('suggestion-item')) return true;
        if (element.classList.contains('clickable')) return true;
        // Check parents for interactive containers (e.g. list items)
        if (element.parentElement && (element.parentElement.classList.contains('inventory-item') || element.parentElement.tagName === 'BUTTON')) return true;
        return false;
    }

    createRipple(e) {
        const button = e.target.closest('button');
        if (button) {
            const circle = document.createElement('span');
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;

            const rect = button.getBoundingClientRect();

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            circle.classList.add('ripple');

            const ripple = button.getElementsByClassName('ripple')[0];
            if (ripple) {
                ripple.remove();
            }

            button.appendChild(circle);
        }
    }

    setupListObservers() {
        // IDs of lists to animate items sliding in
        const listIds = [
            'inventoryListPlayer',
            'inventoryListContainer',
            'craftingRecipeList',
            'constructionBuildableList',
            'nearbyEntitiesList',
            'actionList',
            'itemList',
            'detailRecipeComponents',
            'detailConstructionComponents',
            'questList'
        ];

        const observerConfig = { childList: true, subtree: false };

        const callback = (mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node, index) => {
                        if (node.nodeType === 1) { // Element node
                            node.classList.add('slide-in-new');
                            // Stagger animation slightly based on index if multiple added at once (though mutation usually fires in batches, nodes are separate)
                            // We can't easily get the index of the batch here, but CSS animation delay can be random or fixed.
                            // A simple fixed animation class is usually enough for "juice".

                            // Remove class after animation to clean up? Not strictly necessary if it's a one-time entry.
                        }
                    });
                }
            }
        };

        const observer = new MutationObserver(callback);

        listIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                observer.observe(el, observerConfig);
            } else {
                // If element doesn't exist yet, we could wait, but for now we assume they exist in DOM at startup
                // If they are created dynamically later, we'd need a robust retry or delegation.
                // Most are static in index.html.
            }
        });

        // Console specific observer (scrolling text)
        const consoleEl = document.getElementById('console');
        if (consoleEl) {
             const consoleObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            node.classList.add('console-msg-new');
                        }
                    });
                    // Auto scroll is handled elsewhere, but the animation adds juice.
                });
             });
             consoleObserver.observe(consoleEl, { childList: true });
        }
    }

    playOpenSound() {
        const now = Date.now();
        if (this.lastOpenSoundTime && (now - this.lastOpenSoundTime < 200)) {
            return; // Debounce
        }
        this.lastOpenSoundTime = now;
        if (window.audioManager) {
            window.audioManager.playSound('ui_menu_open_01.wav', { volume: 0.5 });
        }
    }

    setupModalObservers() {
        // Observe style attribute changes on modals/panels to trigger animation classes

        // IDs for centered modals (need translate)
        const centerModalIds = [
            'settingsModal',
            'medicalTreatmentModal',
            'questLogUI'
        ];

        // IDs for static panels (no translate)
        const panelIds = [
            'craftingUI',
            'constructionUI',
            'character-creator',
            'vehicleModificationUI',
            'character-info-panel',
            'dialogueUI'
        ];

        const allIds = [...centerModalIds, ...panelIds];

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    const wasHidden = mutation.oldValue && mutation.oldValue.includes('hidden');
                    const isHidden = target.classList.contains('hidden');

                    const isCenteredModal = centerModalIds.includes(target.id);
                    const animClass = isCenteredModal ? 'modal-open-anim' : 'panel-open-anim';

                    if (wasHidden && !isHidden) {
                        // Truly opened just now
                        // Check if we already have the animation class to avoid loops
                        if (!target.classList.contains(animClass)) {
                            target.classList.add(animClass);
                            this.playOpenSound();
                        }
                    } else if (!wasHidden && isHidden) {
                        // Truly closed
                        target.classList.remove(animClass);
                    }
                }
            });
        });

        allIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.uiEnhancer = new UIEnhancer();
    });
} else {
    window.uiEnhancer = new UIEnhancer();
}
