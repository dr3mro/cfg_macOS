/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// import modules
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
//const GdkPixbuf = imports.gi.GdkPixbuf;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
//const Icons = Me.imports.icons;
const Settings = Me.imports.settings;
const Translation = Me.imports.translation;
const Providers = Me.imports.providers;
const _ = Translation.translate;

/**
 * Extension preferences initialization
 *
 * @return {Void}
 */
function init() {
    Translation.init();
}

/**
 * Extension preferences build widget
 *
 * @return {Void}
 */
function buildPrefsWidget() {
    return new Widget();
}

/**
 * Widget constructor
 * extends Gtk.Box
 *
 * @param  {Object}
 * @return {Object}
 */
const Widget = new GObject.Class({

    Name: 'GnomeFuzzyAppSearch.Prefs.Widget',
    GTypeName: 'GnomeFuzzyAppSearchPrefsWidget',
    Extends: Gtk.Box,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL
        });

        this.settings = Settings.settings();
        //this.settings.connect('changed', this._handleSettings.bind(this));

        let css = new Gtk.CssProvider();
        css.load_from_path(Me.path + '/prefs.css');
        if (Gtk.StyleContext.add_provider_for_screen !== undefined) {
            // GNOME 3.xx (GTK 3)
            Gtk.StyleContext.add_provider_for_screen(
                Gdk.Screen.get_default(),
                css,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        } else {
            // GNOME >= 40 (GTK 4)
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                css,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        }

        let notebook = new Gtk.Notebook();
        notebook.append_page(this._pageProviders(), new Label({
            label: _("Providers"),
        }));
        notebook.append_page(this._pageAbout(), new Label({
            label: _("About"),
        }));

        if (this.add !== undefined)
            this.add(notebook); // GNOME 3.xx (GTK 3)
        else
            this.append(notebook); // GNOME >= 40 (GTK 4)

        try {
            this.show_all(); // GNOME 3.xx (GTK 3)
        } catch (err) {
            // GNOME >= 40 (GTK 4)
        }
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function() {
        this.settings.run_dispose();
        this.parent();
    },

    /**
     * Create new page
     *
     * @return {Object}
     */
    _page: function() {
        let page = new Box();
        page.expand = true;
        page.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page');

        return page;
    },

    /**
     * Create new settings page
     *
     * @return {Object}
     */
    _pageProviders: function() {
        let page = this._page();
        page.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-providers');

        Providers.ALL.forEach(function(item) {
            let key = item[0],
                name = item[1],
                provider = Me.imports[name],
                value = this.settings.get_boolean(key),
                desc = _(provider.description()),
                sensitive = provider.enabled(),
                input = new InputSwitch(key, value, desc, desc);

            input.set_sensitive(sensitive);
            input.connect('changed', this._handleInputChange.bind(this));

            page._append(input);
        }.bind(this));

        return page;
    },

    /**
     * Create new about page
     *
     * @return {Object}
     */
    _pageAbout: function() {
        let page = this._page();
        page.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about');

        let item, ico;
        item = new Label({
            label: Me.metadata.name,
        });
        item.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about-title');
        page._append(item);

        item = new Label({
            label: Me.metadata['description-html'] || Me.metadata.description,
        });
        item.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about-description');
        page._append(item);

        item = new Label({
            label: _("Version") + ': ' + Me.metadata.version,
        });
        item.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about-version');
        page._append(item);

        item = new Label({
            label: Me.metadata['author-html'] || Me.metadata['author'],
        });
        item.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about-author');
        page._append(item);

        item = new Label({
            label: Me.metadata['original-author-html'] || Me.metadata['original-author'],
        });
        item.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about-original-author');
        page._append(item);

        item = new Label({
            label: '<a href="' + Me.metadata.url + '">' + Me.metadata.url + '</a>',
        });
        item.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about-webpage');
        page._append(item);

        item = new Label({
            label: Me.metadata['license-html'] || Me.metadata.license,
        });
        item.get_style_context().add_class('gnome-fuzzy-app-search-prefs-page-about-license');
        page._append(item);

        return page;
    },

    /**
     * Input widget change event handler
     *
     * @param  {Object} actor
     * @param  {Object} event
     * @return {Void}
     */
    _handleInputChange: function(actor, event) {
        let old = this.settings['get_' + event.type](event.key);
        if (old != event.value)
            this.settings['set_' + event.type](event.key, event.value);
    },

});

/**
 * Box constructor
 * extends Gtk.Frame
 *
 * used so we can use padding
 * property in css
 *
 * to add widget to Box use
 * actor
 *
 * @param  {Object}
 * @return {Object}
 */
const Box = new GObject.Class({

    Name: 'GnomeFuzzyAppSearch.Prefs.Box',
    GTypeName: 'GnomeFuzzyAppSearchPrefsBox',
    Extends: Gtk.Frame,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function() {
        this.parent();

        this.actor = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });

        if (this.add !== undefined)
            this.add(this.actor); // GNOME 3.xx (GTK 3)
        else
            this.set_child(this.actor); // GNOME >= 40 (GTK 4)

        this.get_style_context().add_class('gnome-fuzzy-app-search-prefs-box');
    },


    /**
     * Add a widget to the end of the box, with Gtk.Box.add() if using GTK 3,
     * or Gtk.Box.append() if using GTK 4
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _append: function(widget) {
        if (this.actor.add !== undefined)
            this.actor.add(widget); // GNOME 3.xx (GTK 3)
        else
            this.actor.append(widget); // GNOME >= 40 (GTK 4)
    }

    /* --- */

});

/**
 * Label constructor
 * extends Gtk.Label
 *
 * just a common Gtk.Label object
 * with markup and line wrap
 *
 * @param  {Object}
 * @return {Object}
 */
const Label = new GObject.Class({

    Name: 'GnomeFuzzyAppSearch.Prefs.Label',
    GTypeName: 'GnomeFuzzyAppSearchPrefsLabel',
    Extends: Gtk.Label,

    /**
     * Constructor
     *
     * @param  {Object} options (optional)
     * @return {Void}
     */
    _init: function(options) {
        let o = options || {};
        if (!('label' in options))
            o.label = 'undefined';

        this.parent(o);
        this.set_markup(this.get_text());

        if (this.set_line_wrap !== undefined)
            this.set_line_wrap(true); // GNOME 3.xx (GTK 3)
        else
            this.set_wrap(true); // GNOME >= 40 (GTK 4)

        this.set_justify(Gtk.Justification.CENTER);

        this.get_style_context().add_class('gnome-fuzzy-app-search-prefs-label');
    },

    /* --- */

});

/**
 * Input constructor
 * extends Box
 *
 * horizontal Gtk.Box object with label
 * and widget for editing settings
 *
 * @param  {Object}
 * @return {Object}
 */
const Input = new GObject.Class({

    Name: 'Prefs.Input',
    GTypeName: 'GnomeFuzzyAppSearchPrefsInput',
    Extends: Box,
    Signals: {
        changed: {
            param_types: [GObject.TYPE_OBJECT],
        },
    },

    /**
     * Constructor
     *
     * @param  {String} key
     * @param  {String} text
     * @param  {String} tooltip
     * @return {Void}
     */
    _init: function(key, text, tooltip) {
        this.parent();
        this.actor.set_orientation(Gtk.Orientation.HORIZONTAL);

        this._key = key;
        this._label = new Gtk.Label({
            label: text,
            xalign: 0,
            tooltip_text: tooltip || '',
            vexpand: true,
            valign: Gtk.Align.FILL,
            hexpand: true
        });
        this._widget = null;

        if (this.actor.pack_start !== undefined)
            this.actor.pack_start(this._label, true, true, 0); // GNOME 3.xx (GTK 3)
        else
            this.actor.append(this._label); // GNOME >= 40 (GTK 4)

        this.get_style_context().add_class('gnome-fuzzy-app-search-prefs-input');
    },

    /**
     * Input change event handler
     *
     * @param  {Object} widget
     * @return {Void}
     */
    _handleChange: function(widget) {
        let emit = new GObject.Object();
        emit.key = this.key;
        emit.value = this.value;
        emit.type = this.type;

        this.emit('changed', emit);
    },

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'variant';
    },

    /**
     * Key getter
     *
     * @return {String}
     */
    get key() {
        return this._key;
    },

    /**
     * Enabled getter
     *
     * @return {Boolean}
     */
    get enabled() {
        return this._widget.is_sensitive();
    },

    /**
     * Enabled setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set enabled(value) {
        this._widget.set_sensitive(value);
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.value;
    },

    /**
     * Value setter
     *
     * @param  {Mixed} value
     * @return {Void}
     */
    set value(value) {
        this._widget.value = value;
    },

    /* --- */

});

/**
 * InputSwitch constructor
 * extends Input
 *
 * @param  {Object}
 * @return {Object}
 */
const InputSwitch = new GObject.Class({

    Name: 'Prefs.InputSwitch',
    GTypeName: 'GnomeFuzzyAppSearchPrefsInputSwitch',
    Extends: Input,

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function(key, value, text, tooltip) {
        this.parent(key, text, tooltip);

        this.set_valign(Gtk.Align.START);

        this._widget = new Gtk.Switch({
            active: value
        });
        this._widget.connect('notify::active', this._handleChange.bind(this));
        this._append(this._widget);

        this.get_style_context().add_class('gnome-fuzzy-app-search-prefs-input-switch');
    },

    /**
     * Type getter
     *
     * @return {String}
     */
    get type() {
        return 'boolean';
    },

    /**
     * Value getter
     *
     * @return {Boolean}
     */
    get value() {
        return this._widget.active;
    },

    /**
     * Value setter
     *
     * @param  {Boolean} value
     * @return {Void}
     */
    set value(value) {
        this._widget.active = value;
    },

    /* --- */

});