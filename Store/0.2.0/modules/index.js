import * as load from './load.js';

export const store = {
    "sessionVersion": "0.2.0"
}

load.init();

export function quit() {
    window.close();
}