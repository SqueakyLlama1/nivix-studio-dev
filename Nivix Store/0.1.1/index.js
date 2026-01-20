// Alias jQuery to global if available
window.$ = window.jQuery = window.$ || undefined;

let inventoryPath = ['appdata', 'store', 'inventory.ndjson'];
let inventory = [];
let selectedItems = [];
let selectedItem = null;
let changed = false;

// Initialize inventory path and ensure file exists
(async () => {
    try {
        if (!window.parent.ndutil) return;
        // Ensure file exists
        const exists = await window.parent.ndutil.fileExists(inventoryPath);
        if (!exists) {
            console.log("inventory.ndjson not found, creating new file...");
            await window.parent.ndutil.writeFile(inventoryPath, "");
        }
    } catch (err) {
        console.error("Failed to initialize inventory:", err);
    }
})();

// Search input
const searchInput = document.getElementById("explorerSearchBar");
if (searchInput) {
    searchInput.addEventListener("input", e => searchInventory(e.target.value));
}

// Ensure a file exists
async function ensureFileExists(filepath) {
    if (!window.parent.ndutil) return;
    const exists = await window.parent.ndutil.fileExists(filepath);
    if (!exists) {
        await window.parent.ndutil.writeFile(filepath, "");
    }
}

// Safe decode URI component
function safeDecode(str) {
    try { return decodeURIComponent(str); } catch { return str; }
}

// Update CSS theme color
async function updateThemeColor(newColor) {
    if (!window.parent.ndutil) return;
    try {
        const indexCssPath = await window.parent.ndutil.pathjoin(['apps', 'store', "index.css"]);

        let css = await window.parent.ndutil.readFile(indexCssPath);
        if (newColor === "default") {
            css = css.replace(/(--theme-color:\s*)([^;]+);/, "$1var(--default-theme-color);");
        } else {
            if (!/^#[a-fA-F0-9]{6}$/.test(newColor)) {
                console.error("Invalid color format. Use hex like #rrggbb or 'default'.");
                return;
            }
            css = css.replace(/(--theme-color:\s*)(#[a-fA-F0-9]{6}|var\(--default-theme-color\));/, `$1${newColor};`);
        }

        await window.parent.ndutil.writeFile(indexCssPath, css);

        const themeLink = document.getElementById("mainStyle");
        if (themeLink) themeLink.href = themeLink.href.split("?")[0] + "?cacheBust=" + Date.now();
        console.log("🎨 Theme updated to", newColor);
    } catch (err) {
        console.error("Failed to update theme color:", err);
    }
}

// Format ISO date string to yyyy-mm-dd
function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
        const d = new Date(isoStr);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    } catch {
        return isoStr;
    }
}

// Search inventory and update DOM
function searchInventory(query) {
    const explorer = document.getElementById("explorerItems");
    if (!explorer) return;

    const lowerQuery = query.trim().toLowerCase();
    explorer.innerHTML = "";

    inventory.forEach(item => {
        const name = safeDecode(item.name).toLowerCase();
        const keywords = (item.keywords || []).map(k => safeDecode(k).toLowerCase());
        if (lowerQuery === "" || name.includes(lowerQuery) || keywords.some(k => k.includes(lowerQuery))) {
            appendItemToDOM(item);
        }
    });
}

// Simple delay
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Quit with save confirmation
async function quit() {
    if (changed) {
        openTab("quitMenu");
        await wait(1500);
        if (window.parent.ndutil && inventoryPath) await saveInventoryNDJSON();
    }
    updateButtonState();
    window.parent.endTask('store');
}

// Load inventory NDJSON
async function loadInventoryNDJSON(onItem, onDone) {
    if (!window.parent.ndutil) return;
    try {
        const content = await window.parent.ndutil.readNDJSON(inventoryPath);
        inventory = Array.isArray(content) ? content.filter(item => item != null) : [];
        inventory.sort((a,b) => safeDecode(a.name).localeCompare(safeDecode(b.name)));
        if (onItem) inventory.forEach(onItem);
        if (onDone) onDone();
        console.log(`✅ Loaded ${inventory.length} items.`);
    } catch (err) {
        console.error("Failed to load NDJSON:", err);
    }
}

// Save inventory NDJSON
async function saveInventoryNDJSON() {
    if (!window.parent.ndutil) return;
    const lines = inventory.map(item => JSON.stringify(item)).join("\n") + "\n";
    try {
        await window.parent.ndutil.writeFile(inventoryPath, lines);
        console.log("✅ Inventory saved successfully.");
        changed = false;
    } catch (err) {
        console.error("❌ Failed to save inventory:", err.message);
        alert("Failed to save inventory:\n" + err.message);
    }
    updateButtonState();
}
	
	// Append a single item element to explorer
	function appendItemToDOM(item) {
		const glorifiedName = safeDecode(item.name);
		const glorifiedLocation = safeDecode(item.location);
		const glorifiedDate = formatDate(safeDecode(item.date));
		const glorifiedKeywordsArray = (item.keywords || []).map(k => safeDecode(k));
		const glorifiedKeywords = glorifiedKeywordsArray.length > 0 ? glorifiedKeywordsArray.join(", ") : "None";
		const quantity = item.quantity ?? 0;
		
		const explorer = document.getElementById("explorerItems");
		if (!explorer) return;
		
		const div = document.createElement("div");
		div.className = "item";
		div.id = item.id;
		div.onclick = () => select(item.id);
		div.innerHTML = `
    <div class="nameSection"><span>${glorifiedName}</span></div> 
    <div class="dateSection"><span>${glorifiedDate}</span></div> 
    <div class="locationSection"><span>${glorifiedLocation || "—"}</span></div> 
    <div class="keywordSection"><span>${glorifiedKeywords}</span></div> 
    <div class="amountSection"><span>${quantity}</span></div>
  `;
		explorer.appendChild(div);
	}
	
	// Show or hide the shade overlay with fade if available
	function shade(action) {
		const shadeEl = document.getElementById("shade");
		if (!shadeEl) return;
		
		if (action === "open") {
			try {
				$("#shade").fadeIn(150);
			} catch (err) {
				shadeEl.style.display = "block";
				console.log(`Fade not available: ${err}`);
			}
		} else {
			try {
				$("#shade").fadeOut(150);
			} catch (err) {
				shadeEl.style.display = "none";
				console.log(`Fade not available: ${err}`);
			}
		}
	}
	
	// Remove all items from explorer DOM
	function clearExplorer() {
		document.querySelectorAll(".explorer .item").forEach(el => el.remove());
	}
	
	// Reset all inputs inside a panel
	function resetPanelInputs(panelId) {
		const panel = document.getElementById(panelId);
		if (!panel) return;
		
		const inputs = panel.querySelectorAll("input, textarea, select");
		inputs.forEach(input => {
			if (input.type === "checkbox" || input.type === "radio") {
				input.checked = false;
			} else {
				input.value = "";
			}
		});
	}
	
	// Show a panel with fade or fallback
	function openPanel(id) {
		const panels = document.querySelectorAll(".panel");
		shade("open");
		
		try {
			$(panels).fadeOut(150);
			$("#" + id).fadeIn(150);
		} catch (err) {
			panels.forEach(panel => (panel.style.display = "none"));
			console.warn(`jQuery not found, fade not available: ${err}`);
			const panel = document.getElementById(id);
			if (panel) panel.style.display = "block";
		}
	}
	
	// Hide a panel with fade or fallback, reset inputs afterwards
	function closePanel(id) {
		const panel = document.getElementById(id);
		shade("close");
		if (!panel) return;
		
		try {
			$(panel).fadeOut(150, () => resetPanelInputs(id));
		} catch (err) {
			panel.style.display = "none";
			resetPanelInputs(id);
			console.warn(`jQuery not found, fade not available: ${err}`);
		}
	}
	
	// Hide all panels with fade or fallback, reset inputs afterwards
	function closeAllPanels() {
		const panels = document.querySelectorAll(".panel");
		shade("close");
		
		try {
			$(panels).fadeOut(150, () => {
				panels.forEach(panel => resetPanelInputs(panel.id));
			});
		} catch (err) {
			panels.forEach(panel => {
				panel.style.display = "none";
				resetPanelInputs(panel.id);
			});
			console.warn(`jQuery not found, fade not available: ${err}`);
		}
	}
	
	// Switch visible tab with fade or fallback
	function openTab(id) {
		const tabs = document.querySelectorAll(".tab");
		try {
			$(tabs).fadeOut(150);
			$("#" + id).fadeIn(150);
		} catch (err) {
			tabs.forEach(tab => (tab.style.display = "none"));
			console.warn(`jQuery not found, fade not available: ${err}`);
			const tab = document.getElementById(id);
			if (tab) tab.style.display = "block";
		}
	}
	
	// Wait for jQuery to load then execute callback
	function waitForjQuery(callback, interval = 50, maxTries = 100) {
		let tries = 0;
		function check() {
			if (typeof $ === "function") {
				callback();
			} else {
				tries++;
				if (tries < maxTries) {
					setTimeout(check, interval);
				} else {
					console.error("jQuery did not load in time.");
				}
			}
		}
		check();
	}
	
	waitForjQuery(() => {
		$(async function () {
			setTimeout(async () => {
				updateButtonState();
				if (window.parent.ndutil && inventoryPath) {
					await loadInventoryNDJSON(
						item => appendItemToDOM(item),
						() => {
							console.log(`Loaded ${inventory.length} items.`);
							openTab("workpanel");
						}
					);
					$("#save").on("click", async () => await saveInventoryNDJSON());
				} else {
					console.error("window.parent.ndutil or inventoryPath not ready");
				}
			}, 500);
		});
	});
	
	// -------------- Item Selection --------------
	
	// Select or deselect item by ID and update UI & buttons
	function select(itemId) {
		const itemElement = document.getElementById(itemId);
		if (!itemElement) return;
		
		const isSelected = itemElement.classList.contains("selected");
		
		if (!isSelected) {
			if (!selectedItems.includes(itemId)) selectedItems.push(itemId);
			itemElement.classList.add("selected");
			itemElement.classList.remove("item");
		} else {
			selectedItems = selectedItems.filter(id => id !== itemId);
			itemElement.classList.remove("selected");
			itemElement.classList.add("item");
		}
		
		selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;
		
		const removeBtn = document.getElementById("removeItem");
		const editBtn = document.getElementById("editItem");
		const detailsBtn = document.getElementById("itemDetails");
		
		if (removeBtn) removeBtn.disabled = selectedItems.length === 0;
		if (editBtn) editBtn.disabled = selectedItems.length !== 1;
		if (detailsBtn) detailsBtn.disabled = selectedItems.length !== 1;
	}
	
	// --------- Item Managing ---------
	
	// Update UI button states based on selection and changes
	function updateButtonState() {
		const removeBtn = document.getElementById("removeItem");
		const editBtn = document.getElementById("editItem");
		const detailsBtn = document.getElementById("itemDetails");
		const saveBtn = document.getElementById("save");
		
		if (removeBtn) removeBtn.disabled = selectedItems.length === 0;
		if (editBtn) editBtn.disabled = selectedItems.length !== 1;
		if (detailsBtn) detailsBtn.disabled = selectedItems.length !== 1;
		if (saveBtn) saveBtn.disabled = !changed;
	}
	
	// Reload explorer DOM and restore selection highlight
	function reloadExplorer() {
		const explorer = document.getElementById("explorerItems");
		if (!explorer) return;
		
		explorer.innerHTML = "";
		inventory.forEach(item => appendItemToDOM(item));
		
		// Restore selection highlight
		selectedItems.forEach(id => {
			const elem = document.getElementById(id);
			if (elem) {
				elem.classList.add("selected");
				elem.classList.remove("item");
			}
		});
	}
	
	// Add new item from form inputs
	function addItem() {
		const nameInput = document.getElementById("addItem-name");
		const locationInput = document.getElementById("addItem-location");
		const quantityInput = document.getElementById("addItem-quantity");
		const keywordsInput = document.getElementById("addItem-keywords");
		const output = document.getElementById("addItem-output");
		
		if (!nameInput || !locationInput || !quantityInput || !keywordsInput || !output) return;
		
		const name = nameInput.value.trim();
		const location = locationInput.value.trim();
		const quantity = parseInt(quantityInput.value.trim(), 10);
		const keywordsRaw = keywordsInput.value.trim();
		
		if (!name) {
			output.textContent = "Please enter an item name";
			return;
		}
		if (!location) {
			output.textContent = "Please enter an item location";
			return;
		}
		if (isNaN(quantity)) {
			output.textContent = "Please enter a valid number for quantity";
			return;
		}
		
		const id = name.toLowerCase();
		
		if (inventory.find(item => item.id === id)) {
			output.textContent = "An item with that name already exists.";
			return;
		}
		
		const date = new Date().toISOString();
		
		let item = {
			id,
			name: encodeURIComponent(name),
			date: encodeURIComponent(date),
			location: encodeURIComponent(location),
			quantity,
		};
		
		if (keywordsRaw !== "") {
			item.keywords = keywordsRaw
			.split(",")
			.map(k => encodeURIComponent(k.trim()))
			.filter(k => k !== "");
		}
		
		changed = true;
		inventory.push(item);
		appendItemToDOM(item);
		reloadExplorer();
		updateButtonState();
		
		// Clear form
		nameInput.value = "";
		locationInput.value = "";
		quantityInput.value = "";
		keywordsInput.value = "";
		output.textContent = "";
	}
	
	// Remove selected items from inventory and DOM
	function removeSelectedItems() {
		if (selectedItems.length === 0) return;
		
		selectedItems.forEach(id => {
			const index = inventory.findIndex(item => item.id === id);
			if (index !== -1) {
				inventory.splice(index, 1);
			}
			const elem = document.getElementById(id);
			if (elem) elem.remove();
		});
		
		selectedItems = [];
		selectedItem = null;
		changed = true;
		updateButtonState();
		reloadExplorer();
	}
	
	// Open edit panel and populate with selected item data
	function editSelectedItem() {
		if (selectedItems.length !== 1) return;
		
		const id = selectedItems[0];
		const item = inventory.find(it => it.id === id);
		if (!item) return;
		
		openPanel("editItemPanel");
		
		const nameInput = document.getElementById("editItem-name");
		const locationInput = document.getElementById("editItem-location");
		const quantityInput = document.getElementById("editItem-quantity");
		const keywordsInput = document.getElementById("editItem-keywords");
		
		if (!nameInput || !locationInput || !quantityInput || !keywordsInput) return;
		
		nameInput.value = safeDecode(item.name);
		locationInput.value = safeDecode(item.location);
		quantityInput.value = item.quantity ?? 0;
		keywordsInput.value = (item.keywords || []).map(k => safeDecode(k)).join(", ");
	}
	
	// Apply edits made in edit panel to inventory
	function editItem() {
		if (selectedItems.length !== 1) return;
		
		const id = selectedItems[0];
		const item = inventory.find(it => it.id === id);
		if (!item) return;
		
		const nameInput = document.getElementById("editItem-name");
		const locationInput = document.getElementById("editItem-location");
		const quantityInput = document.getElementById("editItem-quantity");
		const keywordsInput = document.getElementById("editItem-keywords");
		const output = document.getElementById("editItem-output");
		
		if (!nameInput || !locationInput || !quantityInput || !keywordsInput || !output) return;
		
		const newName = nameInput.value.trim();
		const newLocation = locationInput.value.trim();
		const newQuantity = parseInt(quantityInput.value.trim(), 10);
		const newKeywords = keywordsInput.value.trim();
		
		if (!newName) {
			output.textContent = "Please enter an item name";
			return;
		}
		if (!newLocation) {
			output.textContent = "Please enter an item location";
			return;
		}
		if (isNaN(newQuantity)) {
			output.textContent = "Please enter a valid number for quantity";
			return;
		}
		
		item.name = encodeURIComponent(newName);
		item.location = encodeURIComponent(newLocation);
		item.quantity = newQuantity;
		item.keywords =
		newKeywords === ""
		? []
		: newKeywords.split(",").map(k => encodeURIComponent(k.trim())).filter(k => k !== "");
		
		changed = true;
		reloadExplorer();
		updateButtonState();
		closePanel("editItemPanel");
	}
	
	// Show details of selected item in detail panel
	function detailItem() {
		if (!selectedItem) return;
		
		const item = inventory.find(it => it.id === selectedItem);
		if (!item) return;
		
		const nameField = document.getElementById("detailItem-name");
		const nameEncodedField = document.getElementById("detailItem-name-encoded");
		const locationField = document.getElementById("detailItem-location");
		const locationEncodedField = document.getElementById("detailItem-location-encoded");
		const keywordsField = document.getElementById("detailItem-keywords");
		const keywordsEncodedField = document.getElementById("detailItem-keywords-encoded");
		const quantityField = document.getElementById("detailItem-quantity");
		const modifiedField = document.getElementById("detailItem-modified");
		
		if (
			!nameField ||
			!nameEncodedField ||
			!locationField ||
			!locationEncodedField ||
			!keywordsField ||
			!keywordsEncodedField ||
			!quantityField ||
			!modifiedField
		)
		return;
		
		nameField.value = safeDecode(item.name);
		nameEncodedField.value = item.name;
		locationField.value = safeDecode(item.location);
		locationEncodedField.value = item.location;
		
		const decodedKeywords = (item.keywords || []).map(k => safeDecode(k)).join(", ");
		const encodedKeywords = (item.keywords || []).join(", ");
		
		keywordsField.value = decodedKeywords || "None";
		keywordsEncodedField.value = encodedKeywords || "None";
		
		quantityField.value = String(item.quantity ?? 0);
		modifiedField.value = formatDate(safeDecode(item.date));
		
		openPanel("itemDetailPanel");
	}