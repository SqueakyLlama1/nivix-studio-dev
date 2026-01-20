const unzipper = require('unzipper');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.stdin.resume();
process.stdin.setEncoding("utf8");

const homedir = path.join(os.homedir(), 'nvxstdo');        // Storage directory (NEVER wipe)
const tempDir = path.join(homedir, "temp");                 // Temp directory (ZIPs allowed)
const workDir = process.cwd();                              // Working directory (the app folder)

fs.mkdirSync(tempDir, { recursive: true });

// -------------------------------
// Ask utility
// -------------------------------
function ask(q) {
    return new Promise(resolve => {
        process.stdout.write(q + " ");
        process.stdin.once("data", data => resolve(data.toString().trim()));
    });
}

// -------------------------------
// Fetch JSON utility
// -------------------------------
async function fetchJSON(url) {
    const proto = url.startsWith("https") ? https : http;
    
    return new Promise((resolve, reject) => {
        proto.get(url, res => {
            if (res.statusCode === 404) return reject("404 Not Found: " + url);
            
            let buf = "";
            res.on("data", chunk => buf += chunk);
            res.on("end", () => {
                try {
                    resolve(JSON.parse(buf));
                } catch (err) {
                    reject("Invalid JSON from " + url);
                }
            });
        }).on("error", reject);
    });
}

// -------------------------------
// Download file utility
// -------------------------------
async function downloadFile(url, destPath) {
    const proto = url.startsWith("https") ? https : http;
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        proto.get(url, res => {
            if (res.statusCode === 404)
                return reject(new Error("404 - File not found: " + url));
            
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
            file.on("error", reject);
        }).on("error", reject);
    });
}

// -------------------------------
// Install Version
// -------------------------------
async function installVersion(version) {
    console.log(`\n[Installer] Installing Studio ${version}...`);
    
    const zipURL = `https://www.nivixtech.com/studio/app/studio-${version}.zip`;
    const zipPath = path.join(tempDir, `studio-${version}.zip`);
    
    try {
        await downloadFile(zipURL, zipPath);
        console.log("Downloaded ZIP.");
        
        // =================================================
        // Wipe working directory (ONLY this folder)
        // Protect: update.js, update.sh, update.bat
        // DO NOT touch storage dir or temp ZIPs
        // =================================================
        console.log("Wiping working directory...");

        const protectedFiles = new Set([
            "update.js",
            "update.sh",
            "update.bat"
        ]);

        const items = fs.readdirSync(workDir);

        for (const item of items) {
            if (protectedFiles.has(item)) {
                console.log(`Skipping protected file: ${item}`);
                continue;
            }

            const full = path.join(workDir, item);
            fs.rmSync(full, { recursive: true, force: true });
        }
        
        // ------------ Extract ZIP ------------
        console.log("Extracting...");
        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: workDir }))
            .promise();
        
        console.log(`Studio ${version} installed successfully.`);
        console.log("Restart Studio.");
        
        process.exit(0);
        
    } catch (err) {
        console.error("Failed to install version:", err);
    }
}

// -------------------------------
// Main update logic
// -------------------------------
async function checkUpdate() {
    const pkgPath = path.join(homedir, 'pkg.json');
    let localVersion = null;
    
    if (fs.existsSync(pkgPath)) {
        try {
            const pkgData = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            localVersion = pkgData.version;
        } catch (err) {
            console.error("Failed to read local pkg.json:", err);
        }
    }
    
    // Download list.json
    const listURL = "https://www.nivixtech.com/studio/list.json";
    let list = await fetchJSON(listURL);
    
    const latestVersion = list?.updates?.studio?.version;
    if (!latestVersion) {
        console.error("list.json missing updates.studio.version");
        return;
    }
    
    console.log("\nLocal version:", localVersion);
    console.log("Latest version:", latestVersion);
    
    
    // ==============================
    // CASE 1: Up to date
    // ==============================
    if (localVersion === latestVersion) {
        console.log("\nStudio is up to date.");
        
        const ans = await ask("Exit (e) or downgrade (d)?");
        if (ans === "d") return startDowngradeMenu();
        return process.exit(0);
    }
    
    // ==============================
    // CASE 2: Update available
    // ==============================
    console.log(`\nUpdate available → ${latestVersion}`);
    
    const ans = await ask("Update (u), downgrade (d), or cancel (c)? ");
    if (ans === "u") return installVersion(latestVersion);
    if (ans === "d") return startDowngradeMenu();
    return process.exit(0);
}

// -------------------------------
// Downgrade Menu
// -------------------------------
async function startDowngradeMenu() {
    const histURL = "https://www.nivixtech.com/studio/studio-history.json";
    
    let history;
    try {
        history = await fetchJSON(histURL);
    } catch (err) {
        console.error("Failed to load version history:", err);
        return;
    }
    
    const versions = history?.history?.versions;
    if (!Array.isArray(versions)) {
        console.error("Invalid version history format (expected history.versions array).");
        console.log("DEBUG received:", history);
        return;
    }
    
    console.log("\nAvailable versions:");
    versions.forEach(v => console.log(" -", v));
    
    while (true) {
        const choice = await ask("\nEnter version to install (or 'cancel'): ");
        
        if (choice.toLowerCase() === "cancel") {
            console.log("Cancelled.");
            return;
        }
        
        if (!versions.includes(choice)) {
            console.log("Invalid version. Try again.");
            continue;
        }
        
        return installVersion(choice);
    }
}

// -------------------------------
// Run
// -------------------------------
checkUpdate().catch(err => {
    console.error("Update check failed:", err);
});