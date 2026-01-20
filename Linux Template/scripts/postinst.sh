#!/bin/bash
set -e

# --- VARIABLES ---
INSTALL_DIR="/opt/nivix-studio/dist"
WRAPPER_SCRIPT="/usr/bin/nivix-studio"

# --- CREATE WRAPPER SCRIPT ---
cat > "$WRAPPER_SCRIPT" <<'EOF'
#!/bin/bash
NODE_EXEC="node"
SCRIPT_FILE="/opt/nivix-studio/dist/runtime.js"

if ! command -v $NODE_EXEC >/dev/null 2>&1; then
    zenity --error --title="Fatal Error" --text="Node.js is not installed or not in PATH."
    exit 1
fi

if ! command -v zenity >/dev/null 2>&1; then
    echo "Zenity is missing; cannot launch GUI."
    exit 1
fi

cd /opt/nivix-studio/dist || exit 1

$NODE_EXEC "$SCRIPT_FILE" &
NODE_PID=$!

zenity --info --title="Nivix Studio Control" \
       --text="Studio is running. Close this window to stop it. You can safely click off of this popup." \
       --ok-label="Exit Studio" \
       --width=350

kill $NODE_PID 2>/dev/null || true
exit 0
EOF

chmod +x "$WRAPPER_SCRIPT"

# --- Update icon cache and desktop database ---
if command -v gtk-update-icon-cache >/dev/null; then
    gtk-update-icon-cache -f /usr/share/icons/hicolor || true
fi

if command -v update-desktop-database >/dev/null; then
    update-desktop-database /usr/share/applications/ || true
fi

if command -v appstreamcli >/dev/null; then
    appstreamcli refresh-cache || true
fi

exit 0
