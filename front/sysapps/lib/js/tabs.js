const tabs = {
    async change(id, display = "block") {
        console.log(`[TABS LIB] Opening tab: ${id}`);

        const tabs = document.querySelectorAll(".tab");
        if (!tabs.length) {
            console.warn("[TABS LIB] No tabs found");
            return;
        }

        if (window.jQuery) {
            $(tabs).fadeOut(25, function () {
                const $target = $(`#${id}`);
                if (!$target.length) return;

                $target.css({ display, opacity: 0 }).fadeTo(25, 1);
            });
        } else {
            tabs.forEach(tab => {
                tab.style.display = (tab.id === id ? display : "none");
            });
        }
    }
}