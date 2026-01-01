const openTab = async id => {
    studio.log.new("log", `[Tab] Opening tab: ${id}`);
    const tabs = document.querySelectorAll('.tab');
    if (!tabs.length) return studio.log.new("warn", '[Tab] No tabs found');
    
    if (window.jQuery) {
        // Fade out all tabs, then fade in the requested one
        $(tabs).fadeOut(175).promise().done(function() {
            $(`#${id}`).fadeIn(175);
        });
    } else {
        // Fallback for plain JS: instantly show/hide
        tabs.forEach(tab => {
            tab.style.display = (tab.id === id ? 'block' : 'none');
        });
    }
};