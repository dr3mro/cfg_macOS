/* Desktop Icons GNOME Shell extension
 *
 * Copyright (C) 2023 Sundeep Mediratta (smedius@gmail.com)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { Gtk, Gdk, GLib, Gio, GObject, Adw } = imports.gi;
const Gettext = imports.gettext;
var _ = Gettext.domain('gtk4-ding').gettext;

const ListObject = GObject.registerClass({
    GTypeName: 'peferences-list',
    Properties: {
        'indexkey': GObject.ParamSpec.string(
            'indexkey',
            'Indexkey',
            'A read-write string property',
            GObject.ParamFlags.READWRITE,
            ''
        ),
        'description': GObject.ParamSpec.string(
            'description',
            'Description',
            'A read-write string property',
            GObject.ParamFlags.READWRITE,
            ''
        ),
    },
}, class listObject extends GObject.Object {
    constructor(constructProperties = {}) {
        super(constructProperties);
    }

    get indexkey() {
        if (this._indexkey === undefined)
            this._indexkey = '';

        return this._indexkey;
    }

    set indexkey(value) {
        if (this.indexkey === value)
            return;

        this._indexkey = value;
        this.notify('indexkey');
    }

    get description() {
        if (this._description === undefined)
            this._description = '';

        return this._description;
    }

    set description(value) {
        if (this.description === value)
            return;

        this._description = value;
        this.notify('description');
    }
});

const ComboRowWithKey = GObject.registerClass({
    GTypeName: 'ComboRowWithKey',
    Properties: {
        'indexkey': GObject.ParamSpec.string(
            'indexkey',
            'Indexkey',
            'A read-write string property',
            GObject.ParamFlags.READWRITE,
            ''
        ),
    },
}, class ComboRowWithKey extends Adw.ComboRow {
    constructor(constructProperties = {}) {
        super(constructProperties);
        this._indexKey = '';
        this.connect('notify::selected-item', () => {
            let item = this.get_selected_item();
            this.indexkey = item.indexkey;
        });
    }

    makeEnumn(enumexpression) {
        const listStore = new Gio.ListStore(ListObject._$gtype);
        this.enumExpression = {};
        let i = 0;
        for (let key in enumexpression) {
            this.enumExpression[key] = parseInt(i);
            let listObject = new ListObject();
            listObject.indexkey = key;
            listObject.description = enumexpression[key];
            listStore.append(listObject);
            i += 1;
        }

        this.set_model(listStore);

        const listFactory = new Gtk.SignalListItemFactory();
        listFactory.connect('setup', (actor, listitem) => {
            let label = new Gtk.Label();
            listitem.set_child(label);
        });
        listFactory.connect('bind', (actor, listitem) => {
            let label = listitem.get_child();
            let item = listitem.get_item();
            label.set_text(item.description);
        });
        this.set_factory(listFactory);

        const expression = new Gtk.PropertyExpression(ListObject, null, 'description');
        this.set_expression(expression);
    }

    get indexkey() {
        if (this._indexkey === undefined)
            this._indexkey = '';

        return this._indexkey;
    }

    set indexkey(value) {
        if (this.indexkey === value)
            return;

        this._indexkey = value;
        if (this.get_selected !== this.enumExpression[value])
            this.set_selected(this.enumExpression[value]);

        this.notify('indexkey');
    }
});


var AdwPreferencesWindow = class {
    constructor(desktopSettings, nautilusSettings, gtkSettings, extensionPath) {
        this.desktopSettings = desktopSettings;
        this.nautilusSettings = nautilusSettings;
        this.gtkSettings = gtkSettings;
        this.iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        this.iconPath = GLib.build_filenamev([extensionPath, 'icons']);
        this.iconTheme.add_search_path(this.iconPath);
    }

    getAdwPreferencesWindow(window = null) {
        var prefsWindow;
        if (window)
            prefsWindow = window;
        else
            prefsWindow = new Adw.PreferencesWindow();
        prefsWindow.set_can_navigate_back(true);
        prefsWindow.set_search_enabled(true);

        const prefsFrame = new Adw.PreferencesPage();
        prefsFrame.set_name(_('Desktop'));
        prefsFrame.set_title(_('Desktop'));
        prefsFrame.set_icon_name('prefs-desktop-symbolic');

        const filesPrefsFrame = new Adw.PreferencesPage();
        filesPrefsFrame.set_name(_('Files'));
        filesPrefsFrame.set_title(_('Files'));
        filesPrefsFrame.set_icon_name('prefs-files-symbolic');

        const tweaksFrame = new Adw.PreferencesPage();
        tweaksFrame.set_name(_('Tweaks'));
        tweaksFrame.set_title(_('Tweaks'));
        tweaksFrame.set_icon_name('prefs-more-symbolic');

        prefsWindow.add(prefsFrame);
        prefsWindow.add(filesPrefsFrame);
        prefsWindow.add(tweaksFrame);
        prefsWindow.set_visible(prefsFrame);

        const desktopGroup = new Adw.PreferencesGroup();
        desktopGroup.set_title(_('Desktop Settings'));
        desktopGroup.set_description(_('Settings for the Desktop Program'));
        prefsFrame.add(desktopGroup);

        const volumesGroup = new Adw.PreferencesGroup();
        volumesGroup.set_title(_('Volumes'));
        volumesGroup.set_description(_('Desktop volumes display'));
        prefsFrame.add(volumesGroup);

        const filesGroup = new Adw.PreferencesGroup();
        filesGroup.set_title(_('Files Settings'));
        filesGroup.set_description(_('Settings shared with Gnome Files'));
        filesPrefsFrame.add(filesGroup);

        const tweaksGroup = new Adw.PreferencesGroup();
        tweaksGroup.set_title(_('Tweaks'));
        tweaksGroup.set_description(_('Miscellaneous Tweaks'));
        tweaksFrame.add(tweaksGroup);

        desktopGroup.add(this.addActionRowSelector(this.desktopSettings,
            'icon-size',
            _('Size for the desktop icons'),
            {
                'tiny': _('Tiny'),
                'small': _('Small'),
                'standard': _('Standard'),
                'large': _('Large'),
            }
        ));
        desktopGroup.add(this.addActionRowSelector(this.desktopSettings,
            'start-corner',
            _('New icons alignment'),
            {
                'top-left': _('Top left corner'),
                'top-right': _('Top right corner'),
                'bottom-left': _('Bottom left corner'),
                'bottom-right': _('Bottom right corner'),
            }
        ));
        desktopGroup.add(this.addActionRowSwitch(this.desktopSettings, 'show-second-monitor', _('Add new icons to Secondary Monitors first, if available')));

        volumesGroup.add(this.addActionRowSwitch(this.desktopSettings, 'show-home', _('Show the personal folder on the desktop')));
        volumesGroup.add(this.addActionRowSwitch(this.desktopSettings, 'show-trash', _('Show the trash icon on the desktop')));
        volumesGroup.add(this.addActionRowSwitch(this.desktopSettings, 'show-volumes', _('Show external drives on the desktop')));
        volumesGroup.add(this.addActionRowSwitch(this.desktopSettings, 'show-network-volumes', _('Show network drives on the desktop')));
        volumesGroup.add(this.addActionRowSwitch(this.desktopSettings, 'add-volumes-opposite', _('Add new drives to the opposite side of the desktop')));

        tweaksGroup.add(this.addActionRowSwitch(this.desktopSettings, 'show-drop-place', _('Highlight the drop grid during Drag and Drop')));
        tweaksGroup.add(this.addActionRowSwitch(this.desktopSettings, 'use-nemo', _('Use Nemo to open folders')));
        tweaksGroup.add(this.addActionRowSwitch(this.desktopSettings, 'show-link-emblem', _('Add an emblem to soft links')));
        tweaksGroup.add(this.addActionRowSwitch(this.desktopSettings, 'dark-text-in-labels', _('Use dark text in icon labels')));

        filesGroup.add(this.addActionRowSelector(this.nautilusSettings,
            'click-policy',
            _('Action to Open Items'),
            {
                'single': _('Single click'),
                'double': _('Double click'),
            }));
        filesGroup.add(this.addActionRowSelector(this.nautilusSettings,
            'show-image-thumbnails',
            _('Show image thumbnails'),
            {
                'always': _('Always'),
                'local-only': _('On this computer only'),
                'never': _('Never'),
            }));
        filesGroup.add(this.addActionRowSwitch(this.nautilusSettings, 'show-delete-permanently', _('Show a context menu item to delete permanently')));
        filesGroup.add(this.addActionRowSwitch(this.gtkSettings, 'show-hidden', _('Show hidden files')));

        if (!window)
            return prefsWindow;
    }

    addActionRowSwitch(settings, key, labelText) {
        const actionRow = Adw.ActionRow.new();
        const switcher = new Gtk.Switch({ active: settings.get_boolean(key) });
        switcher.set_halign(Gtk.Align.END);
        switcher.set_valign(Gtk.Align.CENTER);
        switcher.set_hexpand(false);
        switcher.set_vexpand(false);
        actionRow.set_title(labelText);
        actionRow.add_suffix(switcher);
        settings.bind(key, switcher, 'active', Gio.SettingsBindFlags.DEFAULT);
        actionRow.set_activatable_widget(switcher);

        return actionRow;
    }

    addActionRowSelector(settings, key, labelText, elements) {
        const actionRow = new ComboRowWithKey();
        actionRow.set_title(labelText);
        actionRow.set_use_subtitle(false);
        actionRow.makeEnumn(elements);
        actionRow.set_selected(settings.get_enum(key));
        settings.bind(key, actionRow, 'indexkey', Gio.SettingsBindFlags.DEFAULT);

        return actionRow;
    }
};

