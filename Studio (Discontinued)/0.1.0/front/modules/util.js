// ======================
// Utility Functions
// ======================

const wait = ms => new Promise(res => setTimeout(res, ms));

const getEBD = id => {
    if (typeof id !== "string") return null;
    return document.getElementById(id);
};

const pretty = str => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');