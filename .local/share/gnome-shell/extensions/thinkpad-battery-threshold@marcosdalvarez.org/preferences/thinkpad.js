'use strict'

const { Adw, GLib, GObject, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var Thinkpad = GObject.registerClass({
    GTypeName: 'ThinkpadPrefs',
    Template: `file://${GLib.build_filenamev([Me.path, 'ui', 'thinkpad.ui'])}`,
    InternalChildren: [
        'start_bat0',
        'end_bat0',
        'start_bat1',
        'end_bat1',
        'reset',
        'apply_bat0',
        'apply_bat1',
        'reset_thresholds_dialog',
    ],
}, class Thinkpad extends Adw.PreferencesPage {
    constructor(settings, driver) {
        super({});
        
        settings.bind(
            'start-bat0', 
            this._start_bat0, 
            'value', 
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'end-bat0', 
            this._end_bat0, 
            'value', 
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'start-bat1', 
            this._start_bat1, 
            'value', 
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'end-bat1', 
            this._end_bat1, 
            'value', 
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.connect('changed::start-bat0', () => {
            if (this._start_bat0.value >= this._end_bat0.value) {
                this._end_bat0.value = this._start_bat0.value + 1;
            }
        });
        settings.connect('changed::end-bat0', () => {
            if (this._start_bat0.value >= this._end_bat0.value) {
                this._start_bat0.value = this._end_bat0.value - 1;
            }
        });
        settings.connect('changed::start-bat1', () => {
            if (this._start_bat1.value >= this._end_bat1.value) {
                this._end_bat1.value = this._start_bat1.value + 1;
            }
        });
        settings.connect('changed::end-bat1', () => {
            if (this._start_bat1.value >= this._end_bat1.value) {
                this._start_bat1.value = this._end_bat1.value - 1;
            }
        });

        const bat0 = driver.batteries.find(battery => battery.name === 'BAT0');
        const bat1 = driver.batteries.find(battery => battery.name === 'BAT1');

        bat0.connect('notify::is-available', () => {
            this._apply_bat0.visible = bat0.isAvailable;
        });
        bat1.connect('notify::is-available', () => {
            this._apply_bat1.visible = bat1.isAvailable;
        });
        
        this._apply_bat0.visible = bat0.isAvailable;
        this._apply_bat1.visible = bat1.isAvailable;

        bat0.connect('notify::pending-changes', () => {
            this._apply_bat0.sensitive = bat0.pendingChanges;
        });
        bat1.connect('notify::pending-changes', () => {
            this._apply_bat1.sensitive = bat1.pendingChanges;
        });

        this._apply_bat0.sensitive = bat0.pendingChanges;
        this._apply_bat1.sensitive = bat1.pendingChanges;

        this._apply_bat0.connect('clicked', () => {
            bat0.enable();
        });
        this._apply_bat1.connect('clicked', () => {
            bat1.enable();
        });

        this._reset_thresholds_dialog.connect('response', (obj, response, data) => {
            if (response === 'reset') {
                const keys = [
                    'start-bat0',
                    'end-bat0',
                    'start-bat1',
                    'end-bat1'
                ];
                keys.forEach(key => {
                    settings.reset(key);
                });
                driver.enableAll();
            }
        });

        this._reset.connect('clicked', () => {
            this._reset_thresholds_dialog.transientFor = this.root;
            this._reset_thresholds_dialog.present();
        });
    }
});