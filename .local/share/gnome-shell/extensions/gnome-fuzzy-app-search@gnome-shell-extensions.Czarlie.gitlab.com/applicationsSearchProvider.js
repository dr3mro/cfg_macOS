/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// strict mode
"use strict";

// import modules
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.applicationsUtils;

const Translation = Me.imports.translation;
const _ = Translation.translate;

let MessageTray, notificationSource;
try {
    const Main = imports.ui.main;
    MessageTray = imports.ui.messageTray;

    notificationSource = new MessageTray.Source(
        Me.metadata.name,
        "search-symbolic"
    );
    Main.messageTray.add(notificationSource);
} catch {
    // imports.ui is not accessible from prefs.js
}

/**
 * Application search provider instance in
 * registered providers
 *
 * @type {AppSearchProvider}
 */
let provider = Utils.provider();

/**
 * Search instance:
 * null on fuzzy search disabled,
 * AppUtilsSearch on enabled
 *
 * @type {Mixed}
 */
let search = null;

// getInitialResultSet method in AppSearchProvider
let getInitialResultSet, fuzzyGetInitialResultSet;
if (provider) {
    /**
     * Original getInitialResultSet method
     *
     * @type {Function}
     */
    getInitialResultSet = provider.__proto__.getInitialResultSet;

    // getInitialResultSet.length is the amount of parameters getInitialResultSet takes
    if (getInitialResultSet.length > 2) {
        // GNOME <43 uses a callback for reporting when results are available

        /**
         * New getInitialResultSet method:
         * return fuzzy results if indexed, otherwise default ones
         *
         * @param  {Array}           terms
         * @param  {Function}        callback
         * @param  {Gio.Cancellable} cancellable
         * @return {Void}
         */
        fuzzyGetInitialResultSet = (terms, callback, cancellable) => {
            if (search.isReady()) {
                search
                    .find(terms)
                    .then(callback)
                    .catch((error) => {
                        logError(
                            error,
                            `${Me.metadata.uuid}: search failed due to error:`
                        );

                        getInitialResultSet.call(
                            provider,
                            terms,
                            callback,
                            cancellable
                        );
                    });
            } else getInitialResultSet.call(provider, terms, callback, cancellable);
        };
    } else {
        // GNOME >=43 uses promises to report when results are available

        /**
         * New getInitialResultSet method:
         * return fuzzy results if indexed, otherwise default ones
         *
         * @param  {Array}           terms
         * @param  {Gio.Cancellable} cancellable
         * 
         * @return {Promise<string[]>} A promise that resolves to an array of appInfo IDs
         */
        fuzzyGetInitialResultSet = (terms, cancellable) => {
            if (search.isReady()) {
                return search
                    .find(terms)
                    .catch((error) => {
                        logError(
                            error,
                            `${Me.metadata.uuid}: search failed due to error:`
                        );

                        return getInitialResultSet.call(
                            provider,
                            terms,
                            cancellable
                        );
                    });
            } else return getInitialResultSet.call(provider, terms, cancellable);
        };
    }
}

/**
 * Provider description
 * (label displayed in settings)
 *
 * @return {String}
 */
var description = () => {
    return "Applications";
};

/**
 * Can fuzzy search be added to
 * this provider
 *
 * @return {Boolean}
 */
var enabled = () => {
    return true;
};

/**
 * Get search state
 * (is fuzzy search enabled)
 *
 * @return {Boolean}
 */
var getState = () => {
    if (provider)
        return (
            provider.__proto__.getInitialResultSet === fuzzyGetInitialResultSet
        );

    return false;
};

/**
 * Set search state
 *
 * @param  {Boolean} state
 * @return {Void}
 */
var setState = (state) => {
    if (!provider) return;

    if (state) {
        search = new Utils.Search();
        provider.__proto__.getInitialResultSet = fuzzyGetInitialResultSet;
    } else {
        provider.__proto__.getInitialResultSet = getInitialResultSet;
        if (search) search.destroy();
        search = null;
    }
};
