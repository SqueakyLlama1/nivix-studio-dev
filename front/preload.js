async function waitForFrontend() {
    const start = Date.now();
    const timeout = 15000;
    const ip = await window.ndutil.getIP();
    while (Date.now() - start < timeout) {
        try {
            const res = await fetch(`http://${ip}:58000/ready`);
            if (res.ok) {
                window.location.href = `http://${ip}:58000/front/index.html`;
                return;
            }
        } catch { }
        await new Promise(r => setTimeout(r, 200));
    }
    document.body.innerHTML = "<h1>Frontend Timeout</h1><br><p>The frontend failed to respond in time, please contact support at <strong>+1 (385) 214 3655</strong> if this issue persists.</p>";
}
waitForFrontend();