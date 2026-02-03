import { nodeforge } from "./index.js";

function getEBD(id) {return document.getElementById(id)};

export function init() {
    const version = `v${nodeforge.sessionVersion}`;
    getEBD("load-footer-version").textContent = version;
}