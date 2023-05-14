/**
 * Credits: https://github.com/aunetx/blur-my-shell/blob/master/src/preferences/menu.js
 */
'use strict';

const { Gdk, Gtk, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();

function addMenu(window) {
    const builder = new Gtk.Builder();

    // add a dummy page and remove it immediately, to access headerbar
    builder.add_from_file(`${Me.path}/ui/menu.ui`);
    let menu_util = builder.get_object('menu_util');
    window.add(menu_util);
    addMenuToHeader(window, builder);
    window.remove(menu_util);
}

function addMenuToHeader(window, builder) {
    // a little hack to get to the headerbar
    const page = builder.get_object('menu_util');
    const pages_stack = page.get_parent(); // AdwViewStack
    const content_stack = pages_stack.get_parent().get_parent(); // GtkStack
    const preferences = content_stack.get_parent(); // GtkBox
    const headerbar = preferences.get_first_child(); // AdwHeaderBar
    headerbar.pack_start(builder.get_object('info_menu'));

    // setup menu actions
    const actionGroup = new Gio.SimpleActionGroup();
    window.insert_action_group('prefs', actionGroup);

    // a list of actions with their associated link
    const actions = [
        {
            name: 'open-bug-report',
            link: 'https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/issues'
        },
        {
            name: 'open-readme',
            link: 'https://extensions.gnome.org/extension/4798/thinkpad-battery-threshold'
        },
        {
            name: 'open-license',
            link: 'https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/blob/main/LICENSE'
        },
        {
            name: 'open-changelog',
            link: 'https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/blob/main/CHANGELOG.md'
        },
    ];

    actions.forEach(action => {
        let act = new Gio.SimpleAction({ name: action.name });
        act.connect(
            'activate',
            _ => Gtk.show_uri(window, action.link, Gdk.CURRENT_TIME)
        );
        actionGroup.add_action(act);
    });
}