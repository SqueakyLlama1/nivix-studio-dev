#!/bin/bash
set -e

# Remove wrapper script
rm -f /usr/bin/nivix-studio

# Remove desktop entry
rm -f /usr/share/applications/nivix-studio.desktop

# Remove icon
rm -f /usr/share/icons/hicolor/256x256/apps/nivix-studio.png

# Remove metainfo XML
rm -f /usr/share/metainfo/nivix-studio.metainfo.xml

# Update icon and desktop cache
if command -v gtk-update-icon-cache >/dev/null; then
    gtk-update-icon-cache -f /usr/share/icons/hicolor || true
fi
if command -v update-desktop-database >/dev/null; then
    update-desktop-database /usr/share/applications/ || true
fi

exit 0
