'use strict'

const { Adw, GLib, GObject, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


var Experimental = GObject.registerClass({
    GTypeName: 'ExperimentalPrefs',
    Template: `file://${GLib.build_filenamev([Me.path, 'ui', 'experimental.ui'])}`,
    InternalChildren: [
        'debug_mode',
        'disable_model_verification_check',
        'reset_all',
        'reset_dialog',
    ],
}, class Experimental extends Adw.PreferencesPage {
    constructor(settings, driver) {
        super({});

        settings.bind(
            'debug-mode', 
            this._debug_mode, 
            'active', 
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'disable-model-verification-check', 
            this._disable_model_verification_check, 
            'active', 
            Gio.SettingsBindFlags.DEFAULT
        );

        this._reset_dialog.connect('response', (obj, response, data) => {
            if (response === 'reset') {
                this._resetSettings(settings);
                driver.enableAll();
            }
        });

        this._reset_all.connect('clicked', () => {
            this._reset_dialog.transientFor = this.root;
            this._reset_dialog.present();
        });
    }

    /**
     * Reset all (recursively) settings values to default
     * 
     * @param {Gio.Settings} settings Settings to reset
     */
    _resetSettings(settings) {
        const keys = settings.settings_schema.list_keys();
        keys.forEach(key => {
            settings.reset(key);
        });

        const childrens = settings.settings_schema.list_children();
        childrens.forEach(children => {
            const childrenSettings = settings.get_child(children);
            this._resetSettings(childrenSettings);
        });
    }
});