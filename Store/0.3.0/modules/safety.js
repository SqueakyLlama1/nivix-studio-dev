const forbiddenPattern = /[^a-zA-Z0-9\s-]/g;

export function sanitize(input) {
    if (typeof input !== 'string') return '';

    return input.replace(forbiddenPattern, '');
}

export function isSafe(input, forbidNull = false) {
    if (typeof input !== 'string') return false;

    const cleaned = sanitize(input);

    if (input !== cleaned) return false;
    if (forbidNull && cleaned.trim().length === 0) return false;

    return true;
}

export function filterInput(inputElement) {
    const start = inputElement.selectionStart;
    const end = inputElement.selectionEnd;

    const currentValue = inputElement.value;
    const cleanedValue = sanitize(currentValue);

    if (currentValue !== cleanedValue) {
        inputElement.value = cleanedValue;

        // Adjust cursor so it stays in roughly the same position
        const diff = currentValue.length - cleanedValue.length;
        inputElement.setSelectionRange(start - diff, end - diff);

        console.warn(
            `[SAFETY] Forbidden character removed: Only letters, numbers, spaces, and hyphens allowed.`
        );
    }
}