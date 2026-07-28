import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Variable from "resource:///com/github/Aylur/ags/variable.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";

const run = cmd => Utils.execAsync(["bash", "-lc", cmd]).catch(err => print(err));
const shq = str => "'" + String(str).replace(/'/g, "'\\''") + "'";

const volume = Variable(0, {
    poll: [1000, ["bash", "-lc", "pamixer --get-volume 2>/dev/null || echo 0"], out => Number(out.trim()) || 0],
});

const brightness = Variable(0, {
    poll: [1000, ["bash", "-lc", "brightnessctl -m 2>/dev/null | awk -F, '{gsub(/%/,\"\",$4); print $4}' || echo 0"], out => Number(out.trim()) || 0],
});

const wifi = Variable("?", {
    poll: [1500, ["bash", "-lc", "nmcli radio wifi 2>/dev/null || echo unknown"], out => out.trim()],
});

const bluetooth = Variable("?", {
    poll: [1500, ["bash", "-lc", "bluetoothctl show 2>/dev/null | awk -F': ' '/Powered/ {print $2}' || echo no"], out => out.trim()],
});

const battery = Variable(0, {
    poll: [5000, ["bash", "-lc", "cat /sys/class/power_supply/BAT*/capacity 2>/dev/null | head -n1 || echo 0"], out => Number(out.trim()) || 0],
});

const networks = Variable("", {
    poll: [8000, ["bash", "-lc", "nmcli -t --escape no -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan yes 2>/dev/null | awk -F: '$2 != \"\" && !seen[$2]++ {print $1 \"|\" $2 \"|\" $3 \"|\" $4}' | head -n 8"]],
});

const bluetoothListCommand = `
bluetoothctl devices | while read -r _ mac name; do
    [ -z "$mac" ] && continue
    info=$(bluetoothctl info "$mac" 2>/dev/null)
    paired=$(echo "$info" | awk -F': ' '/Paired/ {print $2}')
    connected=$(echo "$info" | awk -F': ' '/Connected/ {print $2}')
    trusted=$(echo "$info" | awk -F': ' '/Trusted/ {print $2}')
    printf "%s|%s|%s|%s|%s\\n" "$mac" "$name" "$paired" "$connected" "$trusted"
done | head -n 8
`;

const bluetoothDevices = Variable("", {
    poll: [10000, ["bash", "-lc", bluetoothListCommand]],
});

const audioListCommand = "$HOME/.local/bin/ags-audio-apps";

const showWifiList = Variable(false);
const showBluetoothList = Variable(false);

const showAudioList = Variable(false);
const showPowerModes = Variable(false);

const audioApps = Variable("");

const powerProfile = Variable("unknown", {
    poll: [5000, ["bash", "-lc", "powerprofilesctl get 2>/dev/null || echo unsupported"], out => out.trim()],
});

const shrinkPanel = () => {
    const duration = 320;
    const interval = 16;
    const start = Date.now();

    const tick = () => {
        const win = App.getWindow("quickpanel");

        if (win) {
            win.queue_resize();
            win.resize(1, 1);
        }

        if (Date.now() - start < duration) {
            Utils.timeout(interval, tick);
        }
    };

    tick();
};

const closeQuickPanel = () => {
    App.closeWindow("quickpanel");
    App.closeWindow("quickpanel-backdrop");
};

const refreshAudioApps = () => {
    Utils.execAsync(["bash", "-lc", audioListCommand])
        .then(out => audioApps.value = out)
        .catch(err => print(err));
};

const toggleAudioList = () => {
    showAudioList.value = !showAudioList.value;

    if (showAudioList.value) {
        showWifiList.value = false;
        showBluetoothList.value = false;
        showPowerModes.value = false;
        refreshAudioApps();
    } else {
        shrinkPanel();
    }
};

const togglePowerModes = () => {
    showPowerModes.value = !showPowerModes.value;

    if (showPowerModes.value) {
        showWifiList.value = false;
        showBluetoothList.value = false;
        showAudioList.value = false;
    } else {
        shrinkPanel();
    }
};

const setPowerProfile = profile => {
    run(`powerprofilesctl set ${profile}`);

    Utils.timeout(500, () => {
        Utils.execAsync(["bash", "-lc", "powerprofilesctl get 2>/dev/null || echo unsupported"])
            .then(out => powerProfile.value = out.trim())
            .catch(err => print(err));
    });

};

const refreshNetworks = () => {
    run("nmcli dev wifi rescan");

    Utils.timeout(1200, () => {
        Utils.execAsync(["bash", "-lc", "nmcli -t --escape no -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan yes 2>/dev/null | awk -F: '$2 != \"\" && !seen[$2]++ {print $1 \"|\" $2 \"|\" $3 \"|\" $4}' | head -n 8"])
            .then(out => networks.value = out)
            .catch(err => print(err));
    });
};

const toggleWifiPower = () => {
    Utils.execAsync(["bash", "-lc", "nmcli radio wifi 2>/dev/null || echo unknown"])
        .then(out => {
            const state = out.trim();

            if (state === "enabled") {
                networks.value = "";
                run("nmcli radio wifi off");
            } else {
                run("nmcli radio wifi on");
                Utils.timeout(1500, refreshNetworks);
            }

            Utils.timeout(700, () => {
                Utils.execAsync(["bash", "-lc", "nmcli radio wifi 2>/dev/null || echo unknown"])
                    .then(out => wifi.value = out.trim())
                    .catch(err => print(err));
            });
        })
        .catch(err => print(err));
};

const refreshBluetoothDevices = () => {
    run("rfkill unblock bluetooth 2>/dev/null; bluetoothctl power on; timeout 5s bluetoothctl scan on >/dev/null 2>&1 || true");

    Utils.timeout(5200, () => {
        Utils.execAsync(["bash", "-lc", bluetoothListCommand])
            .then(out => bluetoothDevices.value = out)
            .catch(err => print(err));
    });
};

const toggleWifiList = () => {
    showWifiList.value = !showWifiList.value;

    if (showWifiList.value) {
        showBluetoothList.value = false;
        refreshNetworks();
    } else {
        shrinkPanel();
    }
};

const toggleBluetoothList = () => {
    showBluetoothList.value = !showBluetoothList.value;

    if (showBluetoothList.value) {
        showWifiList.value = false;
        refreshBluetoothDevices();
    } else {
        shrinkPanel();
    }
};

const connectWifi = (ssid, security) => {
    if (!ssid)
        return;

    if (security && security !== "--") {
        const cmd = `
ssid=${shq(ssid)}
pass=$(zenity --entry --title="Wi-Fi" --text="Contraseña para ${ssid.replace(/"/g, '\\"')}" --hide-text 2>/dev/null)
if [ -n "$pass" ]; then
    nmcli dev wifi connect "$ssid" password "$pass"
fi
`;
        run(cmd);
    } else {
        run(`nmcli dev wifi connect ${shq(ssid)}`);
    }
};

const connectBluetooth = (mac, connected) => {
    if (!mac)
        return;

    if (connected === "yes") {
        run(`bluetoothctl disconnect ${shq(mac)}`);
    } else {
        run(`rfkill unblock bluetooth 2>/dev/null; bluetoothctl power on; bluetoothctl trust ${shq(mac)}; timeout 10s bluetoothctl pair ${shq(mac)} || true; bluetoothctl connect ${shq(mac)}`);
    }

    Utils.timeout(1500, refreshBluetoothDevices);
};

const QuickButton = (label, action) => Widget.Button({
    class_name: "quick-button",
    onClicked: () => {
        if (typeof action === "function")
            action();
        else
            run(action);
    },
    child: Widget.Label({
        label,
        xalign: 0,
    }),
});

const PowerButton = (label, action) => Widget.Button({
    class_name: "quick-button power-button",
    hexpand: true,

    onClicked: () => {
        if (typeof action === "function")
            action();
        else
            run(action);
    },

    child: Widget.Label({
        label,
        xalign: 0.5,
        hexpand: true,
    }),
});

const ToggleButton = (label, action, variable, activeValue) => Widget.Button({
    class_name: variable.bind().as(v => {
        return v === activeValue ? "quick-button quick-button-on" : "quick-button";
    }),

    onClicked: () => {
        if (typeof action === "function")
            action();
        else
            run(action);
    },

    child: Widget.Label({
        label,
        xalign: 0.5,
        hexpand: true,
    }),
});


const SliderRow = (icon, title, variable, command, minValue = 0) => Widget.Box({
    class_name: "slider-row",
    vertical: true,
    spacing: 7,
    children: [
        Widget.Box({
            children: [
                Widget.Label({
                    class_name: "slider-title",
                    label: `${icon}  ${title}`,
                    xalign: 0,
                    hexpand: true,
                }),
                Widget.Label({
                    class_name: "slider-value",
                    label: variable.bind().as(v => `${Math.round(Number(v) || 0)}%`),
                    xalign: 1,
                }),
            ],
        }),

        Widget.Slider({
            class_name: "slider",
            min: minValue,
            max: 100,
            value: variable.bind(),
            hexpand: true,
            onChange: ({ value }) => {
                const v = Math.max(minValue, Math.round(value));
                run(command(v));
            },
        }),
    ],
});

const AudioAppRow = line => {
    const [id, name, vol] = line.split("|");
    const volumeValue = Math.min(100, Math.max(0, Number(vol) || 0));

    return Widget.Box({
        class_name: "audio-row",
        vertical: true,
        spacing: 6,
        children: [
            Widget.Box({
                children: [
                    Widget.Label({
                        label: name || `Audio ${id}`,
                        xalign: 0,
                        hexpand: true,
                        truncate: "end",
                    }),
                    Widget.Label({
                        label: `${volumeValue}%`,
                        xalign: 1,
                    }),
                ],
            }),

            Widget.Slider({
                class_name: "slider",
                min: 0,
                max: 100,
                value: volumeValue,
                hexpand: true,
                onChange: ({ value }) => {
                    const v = Math.round(value);
                    run(`pactl set-sink-input-volume ${id} ${v}%`);
                },
            }),
        ],
    });
};

const AudioAppList = () => Widget.Box({
    class_name: "audio-list",
    vertical: true,
    spacing: 7,
    children: audioApps.bind().as(out => {
        const lines = out.trim().split("\n").filter(Boolean);

        if (lines.length === 0) {
            return [
                Widget.Label({
                    class_name: "audio-empty",
                    label: "No hay aplicaciones reproduciendo audio",
                    xalign: 0,
                }),
            ];
        }

        return lines.map(AudioAppRow);
    }),
});

const AudioSliderRow = () => Widget.Box({
    vertical: true,
    spacing: 8,
    children: [
        Widget.Box({
            class_name: "slider-row",
            vertical: true,
            spacing: 7,
            children: [
                Widget.Box({
                    children: [
Widget.Box({
    hexpand: true,
    spacing: 6,
    children: [
        Widget.Label({
            class_name: "slider-title",
            label: " Volumen",
            xalign: 0,
        }),
        Widget.Button({
            class_name: "expand-arrow-button",
            onClicked: toggleAudioList,
            child: Widget.Label({
                class_name: "expand-arrow-label",
                label: showAudioList.bind().as(v => v ? "▴" : "▾"),
            }),
        }),
    ],
}),
Widget.Label({
    class_name: "slider-value",
    label: volume.bind().as(v => `${Math.round(Number(v) || 0)}%`),
}),

                    ],
                }),

                Widget.Slider({
                    class_name: "slider",
                    min: 0,
                    max: 100,
                    value: volume.bind(),
                    hexpand: true,
                    onChange: ({ value }) => {
                        const v = Math.round(value);
                        run(`pamixer --set-volume ${v}`);
                    },
                }),
            ],
        }),

        Widget.Revealer({
            revealChild: showAudioList.bind(),
            transition: "slide_down",
            transitionDuration: 320,
            child: Widget.Box({
                class_name: "audio-section",
                vertical: true,
                spacing: 8,
                children: [
                    Widget.Box({
                        children: [
                            Widget.Label({
                                class_name: "section-title",
                                label: "Aplicaciones con audio",
                                xalign: 0,
                                hexpand: true,
                            }),
                            Widget.Button({
                                class_name: "small-button",
                                onClicked: refreshAudioApps,
                                child: Widget.Label({
                                    label: "Actualizar",
                                }),
                            }),
                        ],
                    }),

                    AudioAppList(),
                ],
            }),
        }),
    ],
});

const PowerModeButton = (label, profile) => Widget.Button({
    class_name: powerProfile.bind().as(v => {
        return v === profile ? "mode-button mode-active" : "mode-button";
    }),

    onClicked: () => setPowerProfile(profile),

    child: Widget.Label({
        label,
        xalign: 0.5,
        hexpand: true,
    }),
});

const BrightnessPowerRow = () => Widget.Box({
    vertical: true,
    spacing: 8,
    children: [
        Widget.Box({
            class_name: "slider-row",
            vertical: true,
            spacing: 7,
            children: [
                Widget.Box({
                    children: [
 Widget.Box({
    hexpand: true,
    children: [
        Widget.Label({
            class_name: "slider-title",
            label: "☀ Brillo",
            xalign: 0,
        }),
        Widget.Button({
            class_name: "expand-arrow-button",
            onClicked: togglePowerModes,
            child: Widget.Label({
                class_name: "expand-arrow-label",
                label: showPowerModes.bind().as(v => v ? "▴" : "▾"),
            }),
        }),
    ],
}),
Widget.Label({
    class_name: "slider-value",
    label: brightness.bind().as(v => `${Math.round(Number(v) || 0)}%`),
}),

                    ],
                }),

                Widget.Slider({
                    class_name: "slider",
                    min: 10,
                    max: 100,
                    value: brightness.bind(),
                    hexpand: true,
                    onChange: ({ value }) => {
                        const v = Math.max(10, Math.round(value));
                        run(`brightnessctl set ${v}%`);
                    },
                }),
            ],
        }),

        Widget.Revealer({
            revealChild: showPowerModes.bind(),
            transition: "slide_down",
            transitionDuration: 320,
            child: Widget.Box({
                class_name: "mode-section",
                vertical: true,
                spacing: 8,
                children: [
                    Widget.Box({
                        children: [
                            Widget.Label({
                                class_name: "section-title",
                                label: "Modo de energía",
                                xalign: 0,
                                hexpand: true,
                            }),
                        ],
                    }),

                    Widget.Box({
                        class_name: "mode-grid",
                        homogeneous: true,
                        spacing: 8,
                        children: [
                            PowerModeButton("  Ahorro", "power-saver"),
                            PowerModeButton("  Balanceado", "balanced"),
                        ],
                    }),

                    Widget.Box({
                        class_name: "mode-grid",
                        homogeneous: true,
                        spacing: 8,
                        children: [
                            PowerModeButton("  Rendimiento", "performance"),
                        ],
                    }),
                ],
            }),
        }),
    ],
});

const InfoRow = (title, value) => Widget.Box({
    class_name: "info-row",
    children: [
        Widget.Label({
            class_name: "info-title",
            label: title,
            xalign: 0,
            hexpand: true,
        }),
        Widget.Label({
            class_name: "info-value",
            label: value,
            xalign: 1,
        }),
    ],
});

const WifiRow = line => {
    const [inuse, ssid, signal, security] = line.split("|");

    return Widget.Button({
        class_name: inuse === "*" ? "wifi-row wifi-active" : "wifi-row",
        onClicked: () => connectWifi(ssid, security),
        child: Widget.Box({
            children: [
                Widget.Label({
                    label: `${inuse === "*" ? "●" : "○"}  ${ssid}`,
                    xalign: 0,
                    hexpand: true,
                    truncate: "end",
                }),
                Widget.Label({
                    label: `${signal || "?"}%`,
                    xalign: 1,
                }),
            ],
        }),
    });
};

const WifiList = () => Widget.Box({
    class_name: "wifi-list",
    vertical: true,
    spacing: 6,
    children: networks.bind().as(out => {
        const lines = out.trim().split("\n").filter(Boolean);

        if (lines.length === 0) {
            return [
                Widget.Label({
                    class_name: "wifi-empty",
                    label: "No se encontraron redes Wi-Fi",
                    xalign: 0,
                }),
            ];
        }

        return lines.map(WifiRow);
    }),
});

const BluetoothRow = line => {
    const [mac, name, paired, connected, trusted] = line.split("|");

    const statusIcon = connected === "yes" ? "●" : paired === "yes" ? "◐" : "○";
    const statusText = connected === "yes" ? "Conectado" : paired === "yes" ? "Emparejado" : "Nuevo";

    return Widget.Button({
        class_name: connected === "yes" ? "bt-row bt-active" : "bt-row",
        onClicked: () => connectBluetooth(mac, connected),
        child: Widget.Box({
            children: [
                Widget.Label({
                    label: `${statusIcon}  ${name || mac}`,
                    xalign: 0,
                    hexpand: true,
                    truncate: "end",
                }),
                Widget.Label({
                    label: statusText,
                    xalign: 1,
                }),
            ],
        }),
    });
};

const BluetoothList = () => Widget.Box({
    class_name: "bt-list",
    vertical: true,
    spacing: 6,
    children: bluetoothDevices.bind().as(out => {
        const lines = out.trim().split("\n").filter(Boolean);

        if (lines.length === 0) {
            return [
                Widget.Label({
                    class_name: "bt-empty",
                    label: "No se encontraron dispositivos Bluetooth",
                    xalign: 0,
                }),
            ];
        }

        return lines.map(BluetoothRow);
    }),
});

const QuickPanelBackdrop = Widget.Window({
    name: "quickpanel-backdrop",
    class_name: "quickpanel-backdrop",
    visible: false,
    decorated: false,

    anchor: ["top", "bottom", "left", "right"],

    setup: self => {
        self.set_app_paintable(true);

        const screen = self.get_screen();
        const visual = screen.get_rgba_visual();
        if (visual)
            self.set_visual(visual);

        self.set_keep_above(true);
        self.set_skip_taskbar_hint(true);
        self.stick();
    },

    child: Widget.EventBox({
        hexpand: true,
        vexpand: true,
        onPrimaryClick: closeQuickPanel,
        onSecondaryClick: closeQuickPanel,

        child: Widget.Box({
            hexpand: true,
            vexpand: true,
        }),
    }),
});

const QuickPanel = Widget.Window({
    name: "quickpanel",
    class_name: "quickpanel-window",
    visible: false,
    decorated: false,

 
setup: self => {
    self.set_app_paintable(true);

    const screen = self.get_screen();
    const visual = screen.get_rgba_visual();
    if (visual)
        self.set_visual(visual);

    self.set_keep_above(true);
    self.set_skip_taskbar_hint(true);
    self.stick();

    const PANEL_WIDTH = 470;
    const RIGHT_MARGIN = 12;
    const TOP_MARGIN = 45;

    self.set_default_size(PANEL_WIDTH, -1);

    const moveToTopRight = () => {
        const screen = self.get_screen();
        const monitor = screen.get_monitor_geometry(screen.get_primary_monitor());

        const x = monitor.x + monitor.width - PANEL_WIDTH - RIGHT_MARGIN;
        const y = monitor.y + TOP_MARGIN;

        self.move(x, y);
    };

    moveToTopRight();

    self.connect("realize", moveToTopRight);
    self.connect("map", moveToTopRight);
},

    anchor: ["top", "right"],
    margins: [45, 20, 0, 0],

    child: Widget.Box({
        class_name: "quickpanel",
        vertical: true,
        spacing: 12,
        css: "min-width: 420px; max-width: 420px;",

        children: [
            Widget.Label({
                class_name: "title",
                label: "Ajustes rápidos",
                xalign: 0,
            }),

            Widget.Box({
                class_name: "grid",
                spacing: 8,
                children: [
                    ToggleButton("  Wi-Fi", toggleWifiList, wifi, "enabled"),
                    ToggleButton("  Bluetooth", toggleBluetoothList, bluetooth, "yes"),
                ],
            }),

            Widget.Revealer({
                revealChild: showWifiList.bind(),
                transition: "slide_down",
                transitionDuration: 320,
                child: Widget.Box({
                    class_name: "wifi-section",
                    vertical: true,
                    spacing: 8,
                    children: [
                        Widget.Box({
                            spacing: 6,
                            children: [
                                Widget.Label({
                                    class_name: "section-title",
                                    label: "Redes disponibles",
                                    xalign: 0,
                                    hexpand: true,
                                }),
                                Widget.Button({
                                    class_name: "small-button",
                                    onClicked: toggleWifiPower,
                                    child: Widget.Label({
                                        label: wifi.bind().as(v => v === "enabled" ? "Apagar" : "Encender"),
                                    }),
                                }),
                                Widget.Button({
                                    class_name: "small-button",
                                    onClicked: refreshNetworks,
                                    child: Widget.Label({
                                        label: "Actualizar",
                                    }),
                                }),
                            ],
                        }),
                        WifiList(),
                    ],
                }),
            }),

            Widget.Revealer({
                revealChild: showBluetoothList.bind(),
                transition: "slide_down",
                transitionDuration: 320,
                child: Widget.Box({
                    class_name: "bt-section",
                    vertical: true,
                    spacing: 8,
                    children: [
                        Widget.Box({
                            children: [
                                Widget.Label({
                                    class_name: "section-title",
                                    label: "Dispositivos Bluetooth",
                                    xalign: 0,
                                    hexpand: true,
                                }),
                                Widget.Button({
                                    class_name: "small-button",
                                    onClicked: refreshBluetoothDevices,
                                    child: Widget.Label({
                                        label: "Buscar",
                                    }),
                                }),
                            ],
                        }),

                        BluetoothList(),

                        Widget.Box({
                            spacing: 8,
                            children: [
                                QuickButton("  Bluetooth ON/OFF", "bluetoothctl power $( [ \"$(bluetoothctl show | awk -F': ' '/Powered/ {print $2}')\" = yes ] && echo off || echo on )"),
                                QuickButton("⚙  Blueman", "blueman-manager"),
                            ],
                        }),
                    ],
                }),
            }),

            AudioSliderRow(),

            BrightnessPowerRow(),

            Widget.Box({
                class_name: "info-box",
                vertical: true,
                spacing: 5,
                children: [
                    InfoRow("Batería", battery.bind().as(v => `${v}%`)),
                ],
            }),

Widget.Box({
    class_name: "power-grid",
    vertical: true,
    spacing: 8,
    children: [
        Widget.Box({
            class_name: "power-row",
            homogeneous: true,
            spacing: 8,
            children: [
                PowerButton("  Cerrar sesión", "cinnamon-session-quit --logout"),
                PowerButton("  Ajustes", "cinnamon-settings"),
            ],
        }),

        Widget.Box({
            class_name: "power-row",
            homogeneous: true,
            spacing: 8,
            children: [
                PowerButton("  Suspender", "systemctl suspend"),
                PowerButton("  Reiniciar", "systemctl reboot"),
            ],
        }),

        Widget.Box({
            class_name: "power-row power-row-full",
            homogeneous: true,
            spacing: 8,
            children: [
                PowerButton("⏻  Apagar", "systemctl poweroff"),
            ],
        }),
    ],
}),


        ],
    }),
});

App.config({
    style: "__HOME__/.config/ags/style.css",
    windows: [
        QuickPanelBackdrop,
        QuickPanel,
    ],
});
