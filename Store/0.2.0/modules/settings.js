function getEBD(id) {return document.getElementById(id)};

export let preferences = {
    disableAnimations: false,
    menuDelay: 750,
    disableShapeAnimations: false
};

export async function init() {
    const savedPreferences = await window.storeAPI.getPreferences();
    if (savedPreferences && Object.keys(savedPreferences).length > 0) {
        preferences = savedPreferences;
        return;
    }
}

export async function setPreference(key, value) {
    if (!(key in preferences)) {
        const errorMsg = `Unknown key: ${key}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    if (typeof(value) !== typeof(preferences[key])) {
        const errorMsg = `The new value for ${key} is not the same type as the existing value: ${typeof(preferences[key])}. Type of attempted value is ${typeof(value)}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    preferences[key] = value;
    await window.storeAPI.setPreferences(preferences);
}