const safety = {
    header: "[SAFETY] ",
    filterInput(inputElement) {
        const h = safety.header;
        const forbiddenPattern = /[^a-zA-Z0-9\s-]/g;
        
        let currentValue = inputElement.value;
        let cleanedValue = currentValue.replace(forbiddenPattern, '');
        
        if (currentValue !== cleanedValue) {
            inputElement.value = cleanedValue;
            
            console.warn(`${h}Forbidden character removed: The name can only contain letters, numbers, spaces, and hyphens.`);
        }
    }
};