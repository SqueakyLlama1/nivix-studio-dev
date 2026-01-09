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

    // --- Standard Transformations ---

    invert() {
        this._rgba.r = 255 - this._rgba.r;
        this._rgba.g = 255 - this._rgba.g;
        this._rgba.b = 255 - this._rgba.b;
        return this;
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

    // --- Advanced Transformations (HSL) ---

    shiftHue(degrees) {
        const hsl = this._getHSL();
        hsl.h = (hsl.h + degrees / 360) % 1;
        if (hsl.h < 0) hsl.h += 1;
        this._setHSL(hsl);
        return this;
    },

    saturation(percent) {
        const hsl = this._getHSL();
        hsl.s = Math.min(1, Math.max(0, percent / 100));
        this._setHSL(hsl);
        return this;
    },

    // --- Utility & Contrast ---

    getContrast() {
        const yiq = (this._rgba.r * 299 + this._rgba.g * 587 + this._rgba.b * 114) / 1000;
        return yiq >= 128 ? 'black' : 'white';
    },

    // --- Internal Helpers ---

    _getHSL() {
        let { r, g, b } = this._rgba;
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) h = s = 0;
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return { h, s, l };
    },

    _setHSL({ h, s, l }) {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        this._rgba.r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
        this._rgba.g = Math.round(hue2rgb(p, q, h) * 255);
        this._rgba.b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
    },

    _getCMYK(str = null) {
        let { r, g, b } = str ? this._getRGBA(str) : this._rgba;
        let r_ = r / 255, g_ = g / 255, b_ = b / 255;
        let k = 1 - Math.max(r_, g_, b_);
        return {
            c: (1 - r_ - k) / (1 - k) || 0,
            m: (1 - g_ - k) / (1 - k) || 0,
            y: (1 - b_ - k) / (1 - k) || 0,
            k: k
        };
    },

    _setCMYK({ c, m, y, k }) {
        this._rgba.r = Math.round(255 * (1 - c) * (1 - k));
        this._rgba.g = Math.round(255 * (1 - m) * (1 - k));
        this._rgba.b = Math.round(255 * (1 - y) * (1 - k));
    },

    _getRGBA(str) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = str;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: a / 255 };
    },

    // --- Outputs ---

    toHex() {
        const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
        return `#${toHex(this._rgba.r)}${toHex(this._rgba.g)}${toHex(this._rgba.b)}`.toUpperCase();
    },

    toRGBA() {
        return `rgba(${Math.round(this._rgba.r)}, ${Math.round(this._rgba.g)}, ${Math.round(this._rgba.b)}, ${this._rgba.a})`;
    }
};