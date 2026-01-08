const ColorLib = {
    _rgba: { r: 0, g: 0, b: 0, a: 1 },

    load(colorString) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = colorString;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        
        this._rgba = { r, g, b, a: a / 255 };
        return this;
    },

    /**
     * Blends the current color with another
     * @param {string} color2 - CSS color string to mix in
     * @param {number} weight - 0 to 100 (percentage of the new color)
     */
    mix(color2, weight = 50) {
        const p = weight / 100;
        const c2 = this._getRGBA(color2); // Helper to get target color data

        this._rgba.r = Math.round(this._rgba.r * (1 - p) + c2.r * p);
        this._rgba.g = Math.round(this._rgba.g * (1 - p) + c2.g * p);
        this._rgba.b = Math.round(this._rgba.b * (1 - p) + c2.b * p);
        this._rgba.a = this._rgba.a * (1 - p) + c2.a * p;
        return this;
    },

    // Internal helper for mixing without changing main state prematurely
    _getRGBA(str) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = str;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: a / 255 };
    },

    brightness(amt) {
        this._rgba.r = Math.min(255, Math.max(0, this._rgba.r + amt));
        this._rgba.g = Math.min(255, Math.max(0, this._rgba.g + amt));
        this._rgba.b = Math.min(255, Math.max(0, this._rgba.b + amt));
        return this;
    },

    transparency(alpha) {
        this._rgba.a = Math.min(1, Math.max(0, alpha));
        return this;
    },

    toHex() {
        const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
        return `#${toHex(this._rgba.r)}${toHex(this._rgba.g)}${toHex(this._rgba.b)}`.toUpperCase();
    },

    toRGBA() {
        return `rgba(${Math.round(this._rgba.r)}, ${Math.round(this._rgba.g)}, ${Math.round(this._rgba.b)}, ${this._rgba.a})`;
    }
};