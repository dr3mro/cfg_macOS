'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { addMenu } = Me.imports.preferences.menu;
const { General } = Me.imports.preferences.general;
const { Thinkpad } = Me.imports.preferences.thinkpad;
const { Experimental } = Me.imports.preferences.experimental;

const Driver = Me.imports.libs.driver;


/**
 * prefs initiation
 *
 * @returns {void}
 */
function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
}

/**
 * fill prefs window
 *
 * @returns {void}
 */
function fillPreferencesWindow(window) {

    const settings = ExtensionUtils.getSettings();
    const driver = new Driver.ThinkPad({'settings': settings});

    addMenu(window);

    window.add(new General(settings));
    if (driver.isSupported) {
        window.add(new Thinkpad(settings, driver));
    }
    window.add(new Experimental(settings, driver));

    window.search_enabled = true;
}