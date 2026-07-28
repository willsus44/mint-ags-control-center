#!/usr/bin/env bash

APPLET_ID="ags-control-center@mint"

echo "Desinstalando Mint AGS Control Center..."

pkill ags 2>/dev/null || true
pkill -f "ags-panel-clickwatch" 2>/dev/null || true

rm -f /tmp/ags-quickpanel-open
rm -f /tmp/ags.log
rm -f /tmp/ags-clickwatch.log

rm -f "$HOME/.local/bin/ags-panel-control"
rm -f "$HOME/.local/bin/ags-panel-clickwatch"
rm -f "$HOME/.local/bin/ags-audio-apps"

rm -rf "$HOME/.local/share/cinnamon/applets/$APPLET_ID"

echo ""
echo "Desinstalado."
echo ""
echo "No se eliminaron estos archivos por seguridad:"
echo "$HOME/.config/ags/config.js"
echo "$HOME/.config/ags/style.css"
echo ""
echo "Si quieres borrarlos manualmente:"
echo "rm -f ~/.config/ags/config.js ~/.config/ags/style.css"
