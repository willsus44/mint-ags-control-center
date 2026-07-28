k#!/usr/bin/env bash

set -e

APPLET_ID="ags-control-center@mint"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DATE="$(date +%Y%m%d-%H%M%S)"

echo "Instalando Mint AGS Control Center..."

if ! command -v ags >/dev/null 2>&1; then
    echo ""
    echo "ERROR: AGS no está instalado."
    echo "Primero instala Aylur's GTK Shell / AGS y luego vuelve a ejecutar este instalador."
    echo ""
    exit 1
fi

echo "Instalando dependencias necesarias..."

sudo apt update
sudo apt install -y \
    xdotool \
    xinput \
    zenity \
    pamixer \
    brightnessctl \
    network-manager \
    bluez \
    bluetooth \
    fonts-font-awesome

mkdir -p "$HOME/.config/ags"
mkdir -p "$HOME/.local/bin"
mkdir -p "$HOME/.local/share/cinnamon/applets/$APPLET_ID"

if [ -f "$HOME/.config/ags/config.js" ]; then
    cp "$HOME/.config/ags/config.js" "$HOME/.config/ags/config.js.backup-$BACKUP_DATE"
fi

if [ -f "$HOME/.config/ags/style.css" ]; then
    cp "$HOME/.config/ags/style.css" "$HOME/.config/ags/style.css.backup-$BACKUP_DATE"
fi

install -m 644 "$BASE_DIR/ags/config.js" "$HOME/.config/ags/config.js"
install -m 644 "$BASE_DIR/ags/style.css" "$HOME/.config/ags/style.css"

install -m 755 "$BASE_DIR/bin/ags-panel-control" "$HOME/.local/bin/ags-panel-control"
install -m 755 "$BASE_DIR/bin/ags-panel-clickwatch" "$HOME/.local/bin/ags-panel-clickwatch"
install -m 755 "$BASE_DIR/bin/ags-audio-apps" "$HOME/.local/bin/ags-audio-apps"

cp -r "$BASE_DIR/cinnamon-applet/$APPLET_ID/"* "$HOME/.local/share/cinnamon/applets/$APPLET_ID/"

sed -i "s|__HOME__|$HOME|g" "$HOME/.config/ags/config.js"
sed -i "s|__HOME__|$HOME|g" "$HOME/.config/ags/style.css"
sed -i "s|__HOME__|$HOME|g" "$HOME/.local/bin/ags-panel-control"
sed -i "s|__HOME__|$HOME|g" "$HOME/.local/bin/ags-panel-clickwatch"
sed -i "s|__HOME__|$HOME|g" "$HOME/.local/share/cinnamon/applets/$APPLET_ID/applet.js"

chmod +x "$HOME/.local/bin/ags-panel-control"
chmod +x "$HOME/.local/bin/ags-panel-clickwatch"

pkill ags 2>/dev/null || true
pkill -f "ags-panel-clickwatch" 2>/dev/null || true
rm -f /tmp/ags-quickpanel-open

ags >/tmp/ags.log 2>&1 &

echo ""
echo "Instalación terminada."
echo ""
echo "Ahora agrega la miniaplicación desde:"
echo "Clic derecho en el panel de Cinnamon → Miniaplicaciones → Gestionar"
echo "Busca: AGS Control Center"
echo "Luego: Agregar al panel"
echo ""
echo "Si no aparece, cierra sesión y vuelve a entrar."
