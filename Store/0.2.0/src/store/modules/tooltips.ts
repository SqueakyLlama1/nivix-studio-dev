export function initDelayedTooltips(): void {
    const delayedButtons = document.querySelectorAll<HTMLElement>('.tooltip-delayed-support-button, .tooltip-delayed-button');
    
    delayedButtons.forEach(btn => {
        let timer: ReturnType<typeof setTimeout>;

        function adjustPosition(targetBtn: HTMLElement): void {
            const tooltip = targetBtn.querySelector<HTMLElement>('.tooltip');
            if (!tooltip) return;
            
            const rect = tooltip.getBoundingClientRect();
            const padding = 10;
            let nudgeX = 0;
            let nudgeY = 0;
            
            if (rect.right > window.innerWidth) {
                nudgeX = (rect.right - window.innerWidth + padding) * -1;
            } else if (rect.left < 0) {
                nudgeX = Math.abs(rect.left) + padding;
            }
            
            if (rect.bottom > window.innerHeight) {
                nudgeY = (rect.bottom - window.innerHeight + padding) * -1;
            } else if (rect.top < 0) {
                nudgeY = Math.abs(rect.top) + padding;
            }
            
            tooltip.style.setProperty('--tooltip-nudge-x', `${nudgeX}px`);
            tooltip.style.setProperty('--tooltip-nudge-y', `${nudgeY}px`);
        }
        
        try {
            btn.addEventListener('mouseenter', () => {
                timer = setTimeout(() => {
                    btn.classList.add('tooltip-ready-button');
                    adjustPosition(btn);
                }, 750);
            });
            
            btn.addEventListener('mouseleave', () => {
                clearTimeout(timer);
                btn.classList.remove('tooltip-ready-button');
                const tooltip = btn.querySelector<HTMLElement>('.tooltip');
                if (tooltip) {
                    tooltip.style.setProperty('--tooltip-nudge-x', '0px');
                    tooltip.style.setProperty('--tooltip-nudge-y', '0px');
                }
            });
        } catch {
            btn.classList.replace('tooltip-delayed-button', 'tooltip-button');
            btn.classList.replace('tooltip-delayed-support-button', 'tooltip-support-button');
        }
    });
}