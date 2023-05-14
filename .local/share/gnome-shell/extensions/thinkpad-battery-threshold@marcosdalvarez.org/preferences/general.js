'use strict'

const { Adw, GLib, GObject, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Utils = Me.imports.preferences.utils;


var General = GObject.registerClass({
    GTypeName: 'GeneralPrefs',
    Template: `file://${GLib.build_filenamev([Me.path, 'ui', 'general.ui'])}`,
    InternalChildren: [
        'indicator_mode',
        'color_mode',
        'show_values',
        'show_notifications'
    ],
}, class General extends Adw.PreferencesPage {
    constructor(settings) {
        super({});

        Utils.bindAdwComboRow(this._indicator_mode, settings, 'indicator-mode');
        settings.bind(
            'color-mode', 
            this._color_mode, 
            'active', 
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'show-current-values', 
            this._show_values, 
            'active', 
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'show-notifications', 
            this._show_notifications, 
            'active', 
            Gio.SettingsBindFlags.DEFAULT
        );
    }
});