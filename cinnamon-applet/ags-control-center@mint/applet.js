const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;

function AgsControlApplet(orientation, panel_height, instance_id) {
    this._init(orientation, panel_height, instance_id);
}

AgsControlApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

        this.set_applet_icon_symbolic_name("preferences-system-symbolic");
        this.set_applet_tooltip("Ajustes rápidos");
    },

    on_applet_clicked: function(event) {
        GLib.spawn_command_line_async("__HOME__/.local/bin/ags-panel-control");
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new AgsControlApplet(orientation, panel_height, instance_id);
}

