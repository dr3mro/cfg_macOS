/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
"use strict";

// import modules
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

let systemActions;

try {
    const SystemActions = imports.misc.systemActions;
    systemActions = SystemActions.getDefault();
} catch (e) {
    // imports.misc.systemActions is not accessible from prefs.js
}

const IndexUtils = Me.imports.indexUtils;
const Scorer = Me.imports.scorer;
const Tokenizer = Me.imports.tokenizer;

const Lang = imports.lang;
const Gio = imports.gi.Gio;

const NAME_WEIGHT = 8;
const KEYWORD_WEIGHT = 3;
const DESCRIPTION_WEIGHT = 1;
const EXEC_WEIGHT = 3;

const N_GRAM_MAX_LENGTH = 6;
const UNSWAPPED_NGRAM_WEIGHT = 4;

let refreshingIndex = false;

/**
 * Get AppSearchProvider from registered
 * providers. There is try/catch block
 * here because imports.ui.main is part
 * of gnome-shell and can not be used
 * in prefs.js.
 *
 * @return {Mixed}
 */
var provider = () => {
    try {
        const Main = imports.ui.main;
        const AppDisplay = imports.ui.appDisplay;

        let result = null;

        let searchController;

        // GNOME 3.xx
        if (Main.overview.viewSelector !== undefined)
            searchController = Main.overview.viewSelector;
        // GNOME >= 40
        else
            searchController =
                Main.overview._overview.controls._searchController;

        searchController._searchResults._providers.forEach((item) => {
            if (!result && item instanceof AppDisplay.AppSearchProvider)
                result = item;
        });

        return result;
    } catch (e) {
        return null;
    }
};

var Search = new Lang.Class({
    Name: "AppUtilsSearch",

    /**
     * Constructor
     *
     * @return {Void}
     */
    _init: function () {
        const stringTokenizer = Tokenizer.getStringNgramTokenizer(
            N_GRAM_MAX_LENGTH,
            UNSWAPPED_NGRAM_WEIGHT
        );
        const stringAcronymTokenizer = Tokenizer.getStringNgramTokenizer(
            N_GRAM_MAX_LENGTH,
            UNSWAPPED_NGRAM_WEIGHT,
            true // Generate acronyms
        );
        const keywordsTokenizer = Tokenizer.getKeywordArrayNgramTokenizer(
            N_GRAM_MAX_LENGTH,
            UNSWAPPED_NGRAM_WEIGHT
        );

        this.index = new IndexUtils.Index(
            "applications",
            ["id", "name", "display_name", "description", "keywords", "exec"],
            Scorer.getTokenizedScorer([
                {
                    keys: ["name", "display_name"],
                    weight: NAME_WEIGHT,
                    tokenizer: stringAcronymTokenizer,
                },
                {
                    key: "keywords",
                    weight: KEYWORD_WEIGHT,
                    tokenizer: keywordsTokenizer,
                },
                {
                    key: "description",
                    weight: DESCRIPTION_WEIGHT,
                    tokenizer: stringTokenizer,
                },
                {
                    key: "exec",
                    weight: EXEC_WEIGHT,
                    tokenizer: stringTokenizer,
                },
            ]),
            keywordsTokenizer
        );

        this._appInfoMonitorHandlerId = Gio.AppInfoMonitor.get().connect(
            "changed",
            Lang.bind(this, this._handleMonitorChanged)
        );

        this.refreshAgain = false;

        this.refresh();
    },

    /**
     * Destructor
     *
     * @return {Void}
     */
    destroy: function () {
        Gio.AppInfoMonitor.get().disconnect(this._appInfoMonitorHandlerId);
    },

    /**
     * Refresh data
     *
     * @return {Void}
     */
    refresh: function () {
        // Prevent multiple calls of refresh() from happening at the same time,
        // since writing index operations aren't thread-safe (for now, at least)

        // refreshingIndex is not an attribute because the Search object may be
        // discarded and swapped for a new instance during runtime (e.g. when
        // disabling and re-enabling the provider in the extension settings)
        if (refreshingIndex) {
            this.refreshAgain = true;
            return;
        }

        this.refreshAgain = false;
        refreshingIndex = true;

        const systemActionObjects = [];
        systemActions._actions.forEach((systemAction, id) => {
            if (systemAction.name) {
                systemActionObjects.push(
                    this._systemActionToObj(id, systemAction)
                );
            }
        });

        this.index
            .updateIndex([
                ...Gio.AppInfo.get_all()
                    .filter((appInfo) => appInfo.should_show())
                    .map(this._appInfoToObj),
                ...systemActionObjects,
            ])
            .then(() => {
                // If refresh() was called while another refresh was in progress, refresh again.
                refreshingIndex = false;
                if (this.refreshAgain) {
                    this.refresh();
                }
            })
            .catch((error) =>
                logError(
                    error,
                    `${Me.metadata.uuid}: applications: refresh failed with error:`
                )
            );
    },

    /**
     * Get whether the Search object is fully initialized yet
     *
     * @return {boolean} Whether the Search object is ready to be used.
     */
    isReady: function () {
        return this.index.isReady();
    },

    /**
     * Get list of application ids by string query, split into terms
     *
     * @async
     *
     * @param  {string[]} query - An array of search terms (split at whitespace)
     *
     * @return {string[]} - A promise resolving to an array of appinfo ID's
     */
    find: async function (query) {
        // GNOME only shows six results for application search, so we need to get
        // 6 plus the number of system actions results in case all system actions
        // match best (unlikely) but aren't available (equally unlikely) if order
        // to definitely perfectly fill the six results in all cases.
        // Even if it is unlikely that there is a system where this could happen,
        // querying for more results isn't fatal. There are also other extensions
        // using GNOME's built-in search providers that may display more than six
        // results.
        const appInfos = await this.index.find(
            query,
            6 + systemActions._actions.size,
            0.15 // Cut off at 15% score
        );

        return appInfos
            .map((appInfo) => appInfo.id)
            .filter((id) => {
                if (!this._isSystemAction(id)) return true;
                return this._isSystemActionAvailable(id);
            });
    },

    /**
     * Function to be called once the Search is ready
     * @callback readyCallback
     */

    /**
     * Call a function when the Search is ready to be used.
     *
     * Overwrites any previous functions passed to this method.
     *
     * @param {readyCallback} callback - The function to call once the search is up and running
     * @return {Void}
     */
    setReadyCallback: function (callback = () => {}) {
        this.index.setReadyCallback(callback);
    },

    /**
     * A vanilla Object with the properties of a Gio.AppInfo object.
     * Conveniently JSON-stringifiable.
     *
     * This doesn't use the conventional camelCase,
     * but snake_case to at least be consistent with Gio.AppInfo.
     *
     * @typedef {Object} AppInfoObject
     * @property {string} id - The ID of the appinfo (usually, filename of desktop file)
     * @property {string} name - The name of the application
     * @property {?string} display_name - The display name of the application
     * @property {?string} description - A description of the application
     * @property {string[]} keywords - Some keywords that can also be used to find the application
     */

    /**
     * Extract all relevant data from an Gio.AppInfo and turn it into a vanilla Object.
     *
     * @param  {Gio.AppInfo} appInfo - The Gio.AppInfo to convert
     * @return {AppInfoObject} A vanilla JS Object with all search-relevant keys
     */
    _appInfoToObj: function (appInfo) {
        return {
            id: appInfo.get_id(),
            name: appInfo.get_name(),
            display_name: appInfo.get_display_name(),
            description: appInfo.get_description(),
            keywords: appInfo.get_keywords ? appInfo.get_keywords() : [],
            exec: appInfo.get_executable(),
        };
    },

    /**
     * Extract all relevant data from an Gio.AppInfo and turn it into a vanilla Object.
     *
     * @param  {string} id           - The ID of a GNOME system action, as found in
     *                                 imports.misc.systemActions.getDefault()._actions (keys)
     * @param  {Object} systemAction - An object describing a GNOME system action, as found in
     *                                 imports.misc.systemActions.getDefault()._actions (values)
     *
     * @return {AppInfoObject} A vanilla JS Object with all search-relevant keys
     */
    _systemActionToObj: function (id, systemAction) {
        return {
            id: id,
            name: systemAction.name,
            display_name: systemAction.name,
            description: systemAction.name,
            keywords: systemAction.keywords,
        };
    },

    /**
     * Return whether an entry ID belongs to a system action.
     *
     * If this is false, the ID belongs to an actual application instead.
     *
     * @param  {string} id - The ID of an index entry, potentially of a system action
     *
     * @return {boolean} Whether the ID belongs to a system action
     */
    _isSystemAction: function (id) {
        // GNOME shell (currently) does this to check if a result is a system action, see:
        // https://gitlab.gnome.org/GNOME/gnome-shell/blob/81029c7d6cf473e30eacc1f0b6fac6daa25d328f/js/ui/appDisplay.js#L1826
        if (id.endsWith(".desktop")) return false;

        return systemActions._actions.has(id);
    },

    /**
     * Return whether the system action an entry ID belongs to is available.
     *
     * If this is false, the system action should not be displayed.
     *
     * Passing a non-system-action ID throws an error.
     *
     * @param  {string} id - The ID of an index entry, a system action
     *
     * @return {boolean} Whether system action is available
     */
    _isSystemActionAvailable: function (id) {
        return systemActions._actions.get(id).available;
    },

    /**
     * File monitor changed event handler
     *
     * @return {Void}
     */
    _handleMonitorChanged: function () {
        this.refresh();
    },
});
