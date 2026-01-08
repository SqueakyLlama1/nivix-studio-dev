const tooltips = {
    init_delayed() {
        const delayedButtons = document.querySelectorAll('.tooltip-delayed-support-button, .tooltip-delayed-button');

        delayedButtons.forEach(btn => {
            let timer;

            try {
                btn.addEventListener('mouseenter', () => {
                    timer = setTimeout(() => {
                        btn.classList.add('tooltip-ready-button');
                        this.adjustPosition(btn);
                    }, 750);
                });

                btn.addEventListener('mouseleave', () => {
                    clearTimeout(timer);
                    btn.classList.remove('tooltip-ready-button');
                    const tooltip = btn.querySelector('.tooltip');
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

        console.log(`[TOOLTIPS LIB] Initialized ${delayedButtons.length} delayed tooltips`);
    },

    adjustPosition(btn) {
        const tooltip = btn.querySelector('.tooltip');
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
}