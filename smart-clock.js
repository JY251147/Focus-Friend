class SmartClock extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        window.log?.('SmartClock component constructed.', 'Clock');

        this.state = 'idle'; // idle, focus, break
        this.focusDuration = 20 * 60; // 20 minutes
        this.breakDuration = 5 * 60; // 5 minutes
        this.remainingTime = this.focusDuration;
        this.timer = null;
    }

    get currentState() {
        return this.state;
    }

    connectedCallback() {
        window.log?.('SmartClock component connected to DOM.', 'Clock');
        this.render();
        
        this.startButton = this.shadowRoot.querySelector('#start-focus-btn');
        this.statusDisplay = this.shadowRoot.querySelector('#status-display');
        this.timeDisplay = this.shadowRoot.querySelector('#time-display');

        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startFocus());
            window.log?.('Attached click listener to "Start Focus" button.', 'Clock');
        } else {
            window.log?.('Could not find "Start Focus" button in shadow DOM!', 'Clock-Error');
        }
    }

    render() {
        window.log?.('Rendering SmartClock component UI.', 'Clock');
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: sans-serif;
                    text-align: center;
                    background-color: var(--secondary-bg, #FFFFFF);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid var(--border-color, #B0C4DE);
                }
                h2 {
                    margin-top: 0;
                    color: var(--header-bg, #4A90E2);
                }
                #time-display {
                    font-size: 4em;
                    font-weight: bold;
                    margin: 20px 0;
                    color: #333;
                    font-family: 'Courier New', Courier, monospace;
                }
                #status-display {
                    font-size: 1.2em;
                    margin-bottom: 20px;
                    color: #555;
                }
                #start-focus-btn {
                    width: 100%;
                    padding: 15px 20px;
                    font-size: 1.2em;
                    font-weight: bold;
                    background-color: var(--header-bg, #4A90E2);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                #start-focus-btn:hover {
                    opacity: 0.9;
                }
                #start-focus-btn:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
            </style>
            <div id="clock-container">
                <h2>Scientific Focus Partner</h2>
                <div id="status-display">Ready to focus?</div>
                <div id="time-display">${this.formatTime(this.remainingTime)}</div>
                <button id="start-focus-btn">Start Focus</button>
            </div>
        `;
    }

    tick() {
        this.remainingTime--;
        
        if (this.remainingTime < 0) {
            if (this.state === 'focus') {
                window.log?.('Focus time finished. Transitioning to break.', 'Clock');
                this.state = 'break';
                this.remainingTime = this.breakDuration;
                // First, notify that the break has started.
                this.dispatchEvent(new CustomEvent('break-started', { bubbles: true, composed: true }));
                // Then, ask for an activity suggestion.
                this.dispatchEvent(new CustomEvent('active-break-prompt', { bubbles: true, composed: true }));
                window.log?.('Dispatched break-started and active-break-prompt events.', 'Clock');
            } else if (this.state === 'break') {
                window.log?.('Break time finished. Resetting to idle.', 'Clock');
                this.resetToIdle();
            }
        }
        
        this.updateDisplay();
    }

    startFocus() {
        window.log?.(`startFocus called. Current state: ${this.state}`, 'Clock');
        if (this.state !== 'idle') return;

        this.state = 'focus';
        this.remainingTime = this.focusDuration;
        this.updateDisplay();
        this.startButton.disabled = true;
        
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => this.tick(), 1000);
        window.log?.('State set to "focus". Timer started.', 'Clock');
    }

    resetToIdle() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.state = 'idle';
        this.remainingTime = this.focusDuration;
        this.updateDisplay();
        this.startButton.disabled = false;
        window.log?.('Clock reset to idle state.', 'Clock');
    }

    updateDisplay() {
        const statusMessages = {
            idle: 'Ready to focus?',
            focus: 'FOCUS TIME! Stay on task.',
            break: 'BREAK TIME! Move around!',
        };
        if (this.statusDisplay) {
            this.statusDisplay.textContent = statusMessages[this.state] || 'Unknown State';
        }
        if (this.timeDisplay) {
            this.timeDisplay.textContent = this.formatTime(this.remainingTime);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

window.log?.('smart-clock.js script loaded. Defining custom element.', 'Clock');
customElements.define('smart-clock', SmartClock);
