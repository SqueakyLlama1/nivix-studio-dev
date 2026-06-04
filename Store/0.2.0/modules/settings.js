function getEBD(id) {return document.getElementById(id)};

export const visualSettings = {
    disableAnimations: false,
    menuDelay: 50
};

export function disableAnimations() {
    // Disable Dynamic Transition
    visualSettings.disableAnimations = true;
    // Disable All CSS Transitions
    const elements = document.querySelectorAll('*');
    elements.forEach(function(element) {
        element.style.transition = "none";
    });
}