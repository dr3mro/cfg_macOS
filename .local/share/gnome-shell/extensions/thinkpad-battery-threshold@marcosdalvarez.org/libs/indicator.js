 'use strict';

const {Gio, GObject, St, Clutter} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const [GNOME_VERSION_MAJOR, GNOME_VERSION_MINOR] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PopupMenu = imports.ui.popupMenu;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const gettextDomain = Me.metadata['gettext-domain'];
const Gettext = imports.gettext;
const Domain = Gettext.domain(gettextDomain);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

const Driver = Me.imports.libs.driver;

const ICONS_FOLDER = Me.dir.get_child('icons').get_path();

/**
 * Get icon
 * 
 * @param {string} iconName Icon name
 * @param {boolean} colorMode Color mode or symbolic
 * @returns {Gio.Icon}
 */
const getIcon = function (iconName, colorMode = false) {
    return Gio.icon_new_for_string(`${ICONS_FOLDER}/${iconName}${colorMode ? '' : '-symbolic'}.svg`);
}

const BatteryItem = GObject.registerClass({
    GTypeName: 'BatteryItem',
    Properties: {
        'battery': GObject.ParamSpec.object(
            'battery',
            'Battery',
            'Battery',
            GObject.ParamFlags.READWRITE || GObject.ParamFlags.CONSTRUCT_ONLY,
            Driver.ThinkPadBattery.$gtype,
        ),
        'settings': GObject.ParamSpec.object(
            'settings',
            'Settings',
            'Settings',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gio.Settings.$gtype
        ),
    },
}, class BatteryItem extends GObject.Object {
    constructor(constructorProperties = {}) {

        super(constructorProperties);

        this.menuItem = new PopupMenu.PopupImageMenuItem('', null);

        // Flag to prevent the PopupImageMenuItem from being activated when the reload icon is clicked
        this._reloading = false;

        // Menu item action
        this.menuItem.connectObject(
            'activate', () => {
                if (!this._reloading) {
                    this.battery.toggle();
                }
                this._reloading = false;
            },
            'destroy', () => {
                this.destroy();
            },
            this
        );
        
        const box = new St.BoxLayout({
            'opacity': 128,
            'x_expand': true,
            'x_align': Clutter.ActorAlign.END,
            'style': 'spacing: 5px;',
        });

        this.menuItem.add_child(box);

        // Reload icon
        this.reload = new St.Icon({
            'icon-size': 16,
            'reactive': true,
            'icon-name': 'view-refresh-symbolic',
        });
        this.reload.connectObject(
            'button-press-event', () => {
                this._reloading = true;
                this.battery.enable();
                return true; // Does not prevent event propagation???
            },
            this
        );
        box.add_child(this.reload);

        this.valuesLabel = new St.Label({
            'y_align': Clutter.ActorAlign.CENTER,
            'style': 'font-size: 0.75em;',
        });
        box.add_child(this.valuesLabel);

        // Battery signals
        this.battery.connectObject(
            'notify', () => {
                this._update();
            },
            this
        );

        // Settings changes
        this.settings.connectObject(
            'changed', () => {
                this._update();
            },
            this
        );

        this._update();
    }

    /**
     * Update UI
     */
    _update() {
        const colorMode = this.settings.get_boolean('color-mode');
        // Menu text and icon
        if (this.battery.isActive) {
            // TRANSLATORS: %s is the name of the battery.
            this.menuItem.label.text = _('Disable thresholds (%s)').format(this.battery.name);
            this.menuItem.setIcon(getIcon('threshold-active', colorMode));
            // Status text
            const showCurrentValues = this.settings.get_boolean('show-current-values');
            if (showCurrentValues) {
                // TRANSLATORS: %d/%d are the [start/end] threshold values. The string %% is the percent symbol (may need to be escaped depending on the language)
                this.valuesLabel.text = _('%d/%d %%').format(this.battery.startValue || 0, this.battery.endValue || 100);
                this.valuesLabel.visible = true;
            } else {
                this.valuesLabel.visible = false;
            }
        } else {
            // TRANSLATORS: %s is the name of the battery.
            this.menuItem.label.text = _('Enable thresholds (%s)').format(this.battery.name);
            this.menuItem.setIcon(getIcon('threshold-inactive', colorMode ));
            this.valuesLabel.visible = false;
        }
        // Reload 'button'
        this.reload.visible = this.battery.pendingChanges && this.battery.isActive;
        // Menu item visibility
        this.menuItem.visible = this.battery.isAvailable;
    }

    destroy() {
        this.settings.disconnectObject(this);
        this.battery.disconnectObject(this);
        this.reload.disconnectObject(this);
        this.menuItem.disconnectObject(this);
        this.valuesLabel.run_dispose();
        this.valuesLabel = null;
        this.reload.run_dispose();
        this.reload = null;
        this.menuItem.run_dispose();
        this.menuItem = null;
    }
});

const ThresholdToggle = GObject.registerClass({
    GTypeName: 'ThresholdToggle',
    Properties: {
        'driver': GObject.ParamSpec.object(
            'driver',
            'Driver',
            'Driver object',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Driver.ThinkPad.$gtype
        ),
        'settings': GObject.ParamSpec.object(
            'settings',
            'Settings',
            'Settings',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gio.Settings.$gtype
        ),
    }
}, class ThresholdToggle extends QuickSettings.QuickMenuToggle {
    constructor(constructorProperties = {}) {
        super(constructorProperties);

        if (GNOME_VERSION_MAJOR >= 44) {
            this.title = _('Thresholds');
            //this.subtitle = 'subtitle';
        } else {
            this.label = _('Thresholds');
        }
        this.gicon = getIcon('threshold-app');
        this.toggleMode = false;

        // Header
        this.menu.setHeader(
            getIcon('threshold-app'), // Icon
            _('Battery Threshold'), // Title
            this.driver.environment.productVersion // Subtitle
        );

        if (!this.driver.isSupported) {
            const unsupporteMenuItem = new PopupMenu.PopupImageMenuItem(_('Platform not supported'), getIcon('threshold-unknown'));
            unsupporteMenuItem.sensitive = false;
            this.menu.addMenuItem(unsupporteMenuItem);
            return;
        }

        // Unavailable
        this.unavailableMenuItem = new PopupMenu.PopupImageMenuItem(_('Thresholds not available'), getIcon('threshold-unknown'));
        this.unavailableMenuItem.sensitive = false;
        this.menu.addMenuItem(this.unavailableMenuItem);
        
        // Batteries
        this.driver.batteries.forEach(battery => {
            // Battery menu item
            const item = new BatteryItem({
                'battery': battery, 
                'settings': this.settings
            });            
            this.menu.addMenuItem(item.menuItem);
        });
       
        // Add an entry-point for more settings
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const settingsItem = this.menu.addAction(_('Thresholds settings'),
            () => ExtensionUtils.openPrefs());
            
        // Ensure the settings are unavailable when the screen is locked
        settingsItem.visible = Main.sessionMode.allowSettings;
        this.menu._settingsActions[Me.uuid] = settingsItem;

        // Unavailable status
        this.unavailableMenuItem.visible = !this.driver.isAvailable;

        // Checked status
        this.checked = this.driver.isActive;

        // Driver signals
        this.driver.connectObject(
            'notify::is-active', () => {
                this.checked = this.driver.isActive;
            },
            'notify::is-available', () => {
                this.unavailableMenuItem.visible = !this.driver.isAvailable;
            },
            this
        );

        // Signals
        this.connectObject(
            'clicked', () => {
                if (this.driver.isActive) {
                    this.driver.disableAll();
                } else {
                    this.driver.enableAll();
                }
            },
            this
        );
    }

    destroy() {
        this.disconnectObject(this);
        this.driver.disconnectObject(this);
        this.menu.removeAll();
        super.destroy();
    }
});

var ThresholdIndicator = GObject.registerClass({
    GTypeName: 'ThresholdIndicator',
}, class ThresholdIndicator extends QuickSettings.SystemIndicator {
    constructor() {
        super();
        this.settings = ExtensionUtils.getSettings();

        this._indicator = this._addIndicator();
        this._indicator.gicon = getIcon('threshold-unknown');

        this.driver = new Driver.ThinkPad({'settings': this.settings});

        this.toggle = new ThresholdToggle({
            'driver': this.driver,
            'settings': this.settings
        });
        this.quickSettingsItems.push(this.toggle);

        //QuickSettingsMenu._indicators.add_child(this); // Right
        QuickSettingsMenu._indicators.insert_child_at_index(this, 0); // Left
        QuickSettingsMenu._addItems(this.quickSettingsItems);

        if (GNOME_VERSION_MAJOR >= 44) {
            this.quickSettingsItems.forEach((item) => {
                QuickSettingsMenu.menu._grid.set_child_below_sibling(item,
                    QuickSettingsMenu._backgroundApps.quickSettingsItems[0]);
            });
        }

        this._updateIndicator();

        // Driver signals
        this.driver.connectObject(
            'notify::is-available', () => {
                this._updateIndicator();
            },
            'notify::is-active', () => {
                this._updateIndicator();
            },
            'enable-battery-completed', (driver, battery, error) => {
                if (!error) {
                    this._notifyEnabled(
                        // TRANSLATORS: %s is the name of the battery. %d/%d are the [start/end] threshold values. The string %% is the percent symbol (may need to be escaped depending on the language)
                        _('Battery (%s) charge thresholds enabled at %d/%d %%').format(
                            battery.name, battery.startValue || 0, battery.endValue || 100
                        )
                    );
                } else {
                    this._notifyError(
                        // TRANSLATORS: The first %s is the name of the battery. The second %s is the error message. \n is new line.
                        _('Failed to enable thresholds on battery %s. \nError: %s').format(
                            battery.name, error.message
                        )
                    );
                }
            },
            'disable-battery-completed', (driver, battery, error) => {
                if (!error) {
                    this._notifyDisabled(
                        // TRANSLATORS: %s is the name of the battery.
                        _('Battery (%s) charge thresholds disabled').format(
                            battery.name
                        )
                    );
                } else {
                    this._notifyError(
                        // TRANSLATORS: The first %s is the name of the battery. The second %s is the error message. \n is new line.
                        _('Failed to disable thresholds on battery %s. \nError: %s').format(
                            battery.name, error.message
                        )
                    );
                }
            },
            'enable-all-completed', (driver, error) => {
                if (!error) {
                    this._notifyEnabled(_('Thresholds enabled for all batteries'))
                } else {
                    this._notifyError(
                        // TRANSLATORS: %s is the error message. \n is new line.
                        _('Failed to enable thresholds for all batteries. \nError: %s').format(
                            error.message
                        )
                    );
                }
            },
            'disable-all-completed', (driver, error) => {
                if (!error) {
                    this._notifyDisabled(_('Thresholds disabled for all batteries'));
                } else {
                    this._notifyError(
                        // TRANSLATORS: %s is the error message. \n is new line.
                        _('Failed to disable thresholds for all batteries. \nError: %s').format(
                            error.message
                        )
                    );
                }
            },
            this
        );

        // Settings signals
        this.settings.connectObject(
            'changed::color-mode', () => {
                this._updateIndicator();
            },
            'changed::indicator-mode', () => {
                this._updateIndicator();
            },
            this
        );
    }

    /**
     * Update indicator (tray-icon)
     */
    _updateIndicator() {
        const colorMode = this.settings.get_boolean('color-mode');
        if (this.driver.isAvailable) {
            if (this.driver.isActive) {
                this._indicator.gicon = getIcon('threshold-active', colorMode);
            } else {
                this._indicator.gicon = getIcon('threshold-inactive', colorMode);
            }
        } else {
            this._indicator.gicon = getIcon('threshold-unknown', colorMode);
        }

        const indicatorMode = this.settings.get_enum('indicator-mode');
        switch (indicatorMode) {
            case 0: // Active
                this._indicator.visible = this.driver.isActive;
                break;
            case 1: // Inactive
                this._indicator.visible = !this.driver.isActive;
                break;
            case 2: // Always
                this._indicator.visible = true;
                break;
            case 3: // Never
                this._indicator.visible = false;
                break;
            default:
                this._indicator.visible = true;
                break;
        }
    }

    /**
     * Show notificaion.
     * 
     * @param {string} msg Title
     * @param {string} details Message
     * @param {string} iconName Icon name
     */
    _notify(msg, details, iconName) {
        if (!this.settings.get_boolean('show-notifications')) return;
        let source = new MessageTray.Source(Me.metadata.name);
        Main.messageTray.add(source);
        const colorMode = this.settings.get_boolean('color-mode');
        let notification = new MessageTray.Notification(source, msg, details, {gicon: getIcon(iconName, colorMode)});
        notification.setTransient(true);
        source.showNotification(notification);
    }

    /**
     * Show error notification
     * 
     * @param {string} message Message
     */
    _notifyError(message) {
        this._notify(_('Battery Threshold'), message, 'threshold-error');
    }

     /**
     * Show enabled notification
     * 
     * @param {string} message Message
     */
    _notifyEnabled(message) {
        this._notify(_('Battery Threshold'), message, 'threshold-active');
    }

     /**
     * Show disabled notification
     * 
     * @param {string} message Message
     */
    _notifyDisabled(message) {
        this._notify(_('Battery Threshold'), message, 'threshold-inactive');
    }

    destroy() {
        this.settings.disconnectObject(this);
        this.driver.disconnectObject(this);
        this.quickSettingsItems.forEach(item => item.destroy());
        this.settings = null;
        this.toggle = null;
        this.driver.destroy();
        this.driver = null;
        this.run_dispose();
    }
});