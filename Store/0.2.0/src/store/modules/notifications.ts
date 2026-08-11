import { loadCSS } from "./file_loader";

interface NotificationItem {
    message: string;
    type: string;
    duration: number;
    sticky: boolean;
}

const queue: NotificationItem[] = [];
let isProcessing = false;

export function init(): void {
    loadCSS("sheets/notifications.css");
}

export function show_notification(
    message: string, 
    type: string = "info", 
    duration: number = 3000, 
    sticky: boolean = type === "error"
): void {
    queue.push({ message, type, duration, sticky });
    
    if (!isProcessing) {
        processQueue();
    }
}

async function processQueue(): Promise<void> {
    if (queue.length === 0) {
        isProcessing = false;
        return;
    }
    
    isProcessing = true;
    const current = queue.shift()!;
    
    await renderNotification(current);
    
    processQueue();
}

function renderNotification(item: NotificationItem): Promise<void> {
    return new Promise((resolve) => {
        const container = document.createElement("div");
        container.className = `notification-box ${item.type}`;
        container.setAttribute("role", "status");
        container.setAttribute("aria-live", "polite");
        
        const messageOutput = document.createElement("p");
        messageOutput.className = "notification-message";
        messageOutput.textContent = item.message;
        
        const closeBtn = document.createElement("button");
        closeBtn.className = "notification-close";
        closeBtn.setAttribute("aria-label", "Dismiss notification");
        closeBtn.innerHTML = "&times;";
        
        container.appendChild(messageOutput);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
        
        let dismissTimer: number | null = null;
        let isDismissed = false;
        
        const dismiss = () => {
            if (isDismissed) return;
            isDismissed = true;
            
            if (dismissTimer !== null) {
                clearTimeout(dismissTimer);
            }
            
            container.style.animation = "fadeOutNotification 0.25s ease-in-out forwards";
            
            container.addEventListener("animationend", () => {
                container.remove();
                resolve();
            }, { once: true });
        };
        
        closeBtn.addEventListener("click", dismiss);
        
        if (!item.sticky) {
            dismissTimer = window.setTimeout(dismiss, item.duration);
        }
    });
}