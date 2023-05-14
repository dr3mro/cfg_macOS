'use strict'

/**
 * Bind AdwComboRow item
 * 
 * @param {Adw.comboRow} comboRow Adw combo row item
 * @param {Gio.Settings} settings Settings object
 * @param {string} key Key name
 */
function bindAdwComboRow(comboRow, settings, key) {
    comboRow.selected = settings.get_enum(key);
    settings.connect(
        `changed::${key}`, () => {
            comboRow.selected = settings.get_enum(key);
        }
    );
    comboRow.connect('notify::selected', () => {
        settings.set_enum(key, comboRow.selected);
    });
}