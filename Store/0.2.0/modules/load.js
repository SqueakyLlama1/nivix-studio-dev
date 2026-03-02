import { store } from "./index.js";
import { visualSettings } from "./settings.js";

function getEBD(id) {return document.getElementById(id)};

export function init() {
    const version = `v${store.sessionVersion}`;
    getEBD("load-footer-version").textContent = version;

    if (visualSettings.disableAnimations) {
        const loaderElements = document.querySelectorAll(".load-loader");
        loaderElements.forEach(function(loaderElement) {
            loaderElement.style.animation = "l3 1s infinite steps(10)";
        });
    }
}