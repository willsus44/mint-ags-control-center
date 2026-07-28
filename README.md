# Mint AGS Control Center

Panel de control personalizado para Linux Mint Cinnamon usando AGS.

## Características

- Control de Wi-Fi
- Lista de redes Wi-Fi disponibles
- Control de Bluetooth
- Lista de dispositivos Bluetooth
- Slider de volumen
- Control de aplicaciones reproduciendo audio
- Slider de brillo con límite mínimo de seguridad
- Indicador de batería
- Selector de perfiles de energía
- Soporte para temas
- Botones de cerrar sesión, ajustes, suspender, reiniciar y apagar
- Integración como miniaplicación de Cinnamon
- Se abre desde el panel superior
- Se cierra al hacer clic fuera del recuadro

## Capturas

![Panel](screenshots/captura1.png)

![Panel](screenshots/captura2.png)

![Panel](screenshots/captura3.png)

![Panel](screenshots/captura4.png)

![Panel](screenshots/captura5.png)

![Panel](screenshots/captura6.png)

![Panel](screenshots/captura7.png)


## Requisitos

- Linux Mint Cinnamon
- Sesión X11
- AGS / Aylur's GTK Shell
- NetworkManager
- BlueZ / Bluetooth
- pamixer
- brightnessctl
- xdotool
- xinput
- zenity

El instalador instala casi todas las dependencias necesarias, excepto AGS.

## Instalación

```bash
git clone https://github.com/willsus44/mint-ags-control-center.git
cd mint-ags-control-center
./install.sh
```

Luego agrega la miniaplicación:

```text
Clic derecho en el panel de Cinnamon
Miniaplicaciones
Gestionar
Buscar: AGS Control Center
Agregar al panel
```

Si no aparece la miniaplicación, cierra sesión y vuelve a entrar.

## Desinstalación

```bash
./uninstall.sh
```

## Notas

Este proyecto fue creado para Linux Mint Cinnamon en X11.

Puede requerir ajustes en otros escritorios, distribuciones o sesiones Wayland.
