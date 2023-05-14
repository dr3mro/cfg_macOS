/**  
 * Driver for handling thresholds in Lenovo ThinkPad series for models since 2011
 * 
 * Based on information from https://linrunner.de/tlp/faq/battery.html
 * 
 * Original sources: https://github.com/linrunner/TLP/blob/main/bat.d/05-thinkpad
 */
'use strict';

const {GLib, Gio, GObject} = imports.gi;

// Driver constants
const BASE_PATH = '/sys/class/power_supply';
const START_FILE_OLD = 'charge_start_threshold'; // kernel 4.17 and newer
const END_FILE_OLD = 'charge_stop_threshold'; // kernel 4.17 and newer
const START_FILE_NEW = 'charge_control_start_threshold'; // kernel 5.9 and newer
const END_FILE_NEW = 'charge_control_end_threshold'; // kernel 5.9 and newer

var debugMode = false; // Debug mode flag

/**
 * Print debug messages
 * 
 * @param {string} msg Debug message
 */
const debug = function(msg) {
    if (debugMode) {
        log(msg);
    }
}

/**
 * Read file contents
 * 
 * @param {string} path Path of file
 * @returns {string} File contents
 */
const readFile = function(path) {
    try {
        const f = Gio.File.new_for_path(path);
        const [, contents,] = f.load_contents(null);
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(contents);
    } catch (e) {
        return null;
    }
}

/**
 * Read integer value from file
 * 
 * @param {string} path Path of file
 * @returns {number|null} Return a integer or null
 */
const readFileInt = function(path) {
    try {
        const v = readFile(path);
        if (v) {
            return parseInt(v);
        } else {
            return null;
        }
    } catch (e) {
        return null;
    }
} 

/**
 * Test file/direcory exists
 * 
 * @param {string} path File/directory path
 * @returns {boolean}
 */
const fileExists = function(path) {
    try {
        const f = Gio.File.new_for_path(path);
        return f.query_exists(null);
    } catch (e) {
        return false;
    }
}

/**
 * Environment object
 */
const Environment = GObject.registerClass({
    GTypeName: 'Environment',
}, class Environment extends GObject.Object {

    get productVersion() {
        if (this._productVersion === undefined) {
            const tmp = readFile('/sys/class/dmi/id/product_version');
            if (tmp) { 
                // Remove non-alphanumeric characters
                const sanitize = /([^ A-Za-z0-9])+/g;
                this._productVersion = tmp.replace(sanitize, '');
            } else {
                this._productVersion = null;
            }
        }
        return this._productVersion;
    }

    get kernelRelease() {
        if (this._kernelRelease === undefined) {
            try {
                let proc = Gio.Subprocess.new(
                    ['uname', '-r'],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
                const [ok, stdout, stderr] = proc.communicate_utf8(null, null);
                proc = null;
                this._kernelRelease = stdout.trim();
            } catch (e) {
                logError(e);
            }
        }
        return this._kernelRelease;
    }

    get kernelMajorVersion() {
        if (this._kernelMajorVersion === undefined) {
            [this._kernelMajorVersion , this._kernelMinorVersion] = this.kernelRelease.split('.', 2);
        }
        return this._kernelMajorVersion;
    }

    get kernelMinorVersion() {
        if (this._kernelMinorVersion === undefined) {
            [this._kernelMajorVersion , this._kernelMinorVersion] = this.kernelRelease.split('.', 2);
        }
        return this._kernelMinorVersion;
    }

    checkMinKernelVersion(major, minor) {
        return (
                this.kernelMajorVersion > major || 
                (this,this.kernelMajorVersion === major && this.kernelMinorVersion >= minor)
            );
    }

});

/**
 * Execute a command and generate events based on its result
 * 
 * @param {string} command Command to execute
 * @param {boolean} asRoot True to run with elevated permissions
 */
const Runnable = GObject.registerClass({
    GTypeName: 'Runnable',
    Signals: {
        'command-completed': {
            param_types: [GObject.TYPE_JSOBJECT /* erro */]
        }
    }
}, class Runnable extends GObject.Object {
    constructor(command, asRoot = false) {
        super();
        if (!command) {
            throw Error('The command cannot be an empty string');
        }
        this._command = command;
        this._asRoot = asRoot;
    }

    run() {
        const argv = ['sh', '-c', this._command];

        if (this._asRoot) {
            argv.unshift('pkexec');
        }

        try {
            const [, pid] = GLib.spawn_async(null, argv, null, GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);

            GLib.child_watch_add(GLib.PRIORITY_DEFAULT_IDLE, pid, (pid, status) => {
                try {
                    GLib.spawn_check_exit_status(status);
                    debug(`Running command args "${argv}": OK`);
                    this.emit('command-completed', null);
                } catch(e) {
                    if (e.code == 126) { 
                        // Cancelled
                    } else {
                        debug(`Running command args "${argv}": FAIL`);
                        logError(e);
                        this.emit('command-completed', e);
                    }
                }
                GLib.spawn_close_pid(pid);
            });
        } catch (e) {
            debug(`Running command args "${argv}": FAIL`);
            logError(e);
            this.emit('command-completed', e);
        }
    }
});

/**
 * ThinkPad battery object
 */
var ThinkPadBattery = GObject.registerClass({
    GTypeName: 'ThinkPadBattery',
    Properties: {
        'environment': GObject.ParamSpec.object(
            'environment',
            'Environment',
            'Environment',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Environment.$gtype
        ),
        'name': GObject.ParamSpec.string(
            'name',
            'Name',
            'Battery name',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            null
        ),
        'auth-required': GObject.ParamSpec.boolean(
            'auth-required',
            'Auth required',
            'Authorization is required to write the values',
            GObject.ParamFlags.READABLE,
            false
        ),
        'is-active': GObject.ParamSpec.boolean(
            'is-active',
            'Is active',
            'Indicates if the thresholds are active or not',
            GObject.ParamFlags.READABLE,
            false
        ),
        'is-available': GObject.ParamSpec.boolean(
            'is-available',
            'Is available',
            'Indicates if the battery are available or not',
            GObject.ParamFlags.READABLE,
            false
        ),
        'pending-changes': GObject.ParamSpec.boolean(
            'pending-changes',
            'Pending changes',
            'Indicates if the current values do not match the configured values',
            GObject.ParamFlags.READABLE,
            false
        ),
        'start-value': GObject.ParamSpec.int(
            'start-value',
            'Start value',
            'Current start value',
            GObject.ParamFlags.READABLE,
            0, 100,
            0
        ),
        'end-value': GObject.ParamSpec.int(
            'end-value',
            'End value',
            'Current end value',
            GObject.ParamFlags.READABLE,
            0, 100,
            100
        ),
        'settings': GObject.ParamSpec.object(
            'settings',
            'Settings',
            'Settings',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gio.Settings.$gtype
        ),
    },
    Signals: {
        'enable-completed': {
            param_types: [GObject.TYPE_JSOBJECT /* error */]
        },
        'disable-completed': {
            param_types: [GObject.TYPE_JSOBJECT /* error */]
        },
    },
}, class ThinkPadBattery extends GObject.Object {
    constructor(constructProperties = {}) {
        super(constructProperties);

        if (!this.name) {
            throw Error('Battery name not defined');
        }

        // Signals handlers IDs
        this._monitorId = null;
        this._settingStartId = null;
        this._settingEndId = null;
        this._startId = null;
        this._endId = null;

        // Battery directory
        this._baseDirectoryPath = `${BASE_PATH}/${this.name}`;
        this._baseDirectory = Gio.File.new_for_path(this._baseDirectoryPath);

        // Set paths
        if (this.environment.checkMinKernelVersion(5, 9)) { // kernel 5.9 and newer
            this._startFilePath = `${BASE_PATH}/${this.name}/${START_FILE_NEW}`;
            this._endFilePath = `${BASE_PATH}/${this.name}/${END_FILE_NEW}`;
        } else if (this.environment.checkMinKernelVersion(4, 17)) { // kernel 4.17 and newer
            this._startFilePath = `${BASE_PATH}/${this.name}/${START_FILE_OLD}`;
            this._endFilePath = `${BASE_PATH}/${this.name}/${END_FILE_OLD}`;
        } else { // Unsupported kernel
            throw Error(`Unsupported kernel version (${this.environment.kernelRelease}). A kernel version greater than or equal to 4.17 is required.`);
        }

        // Activate the directory monitor
        try {
            this._baseMonitor = this._baseDirectory.monitor_directory(Gio.FileMonitorFlags.NONE, null);
            this._monitorId = this._baseMonitor.connect(
                'changed', (obj, file, otherFile, eventType) => {
                    const filePath = file.get_path();
                    switch (eventType) {
                        case Gio.FileMonitorEvent.CHANGES_DONE_HINT:
                        case Gio.FileMonitorEvent.CREATED:
                        case Gio.FileMonitorEvent.DELETED:
                            switch (filePath) {
                                case this._startFilePath:
                                    this.startValue = readFileInt(this._startFilePath);
                                    break;
                                case this._endFilePath:
                                    this.endValue = readFileInt(this._endFilePath);
                                    break;
                                case this._baseDirectoryPath:
                                    this.startValue = readFileInt(this._startFilePath);
                                    this.endValue = readFileInt(this._endFilePath);
                                    break;
                                default:
                                    break;
                            }
                            break;
                        case Gio.FileMonitorEvent.ATTRIBUTE_CHANGED:
                            this.authRequired = this._checkAuthRequired();
                            break;
                        default:
                            break;
                    }
                }
            );
        } catch (e) {
            logError(e, this.name);
        }

        // Update flags on changes in threshold values
        this._startId = this.connect(
            'notify::start-value', () => {
                this.isActive = this._checkActive();
                this.isAvailable = this.startValue !== null || this.endValue !== null;
                this.pendingChanges = this._checkPendingChanges();
            }
        );
        this._endId = this.connect(
            'notify::end-value', () => {
                this.isActive = this._checkActive();
                this.isAvailable = this.startValue !== null || this.endValue !== null;
                this.pendingChanges = this._checkPendingChanges();
            }
        );

        // Update pending changes flag on changes to setting values
        this._settingStartId = this.settings.connect(
            `changed::start-${this.name.toLowerCase()}`, () => {
                this.pendingChanges = this._checkPendingChanges();
            }
        );
        this._settingEndId = this.settings.connect(
            `changed::end-${this.name.toLowerCase()}`, () => {
                this.pendingChanges = this._checkPendingChanges();
            }
        );

        // Load initial values
        this.startValue = readFileInt(this._startFilePath);
        this.endValue = readFileInt(this._endFilePath);
        this.authRequired = this._checkAuthRequired();
    }

    /**
     * Check if thresholds is active
     * 
     * @returns {boolean} Returns true if the battery has active thresholds
     */
    _checkActive() {
        // RegExs
        /* On some models the start threshold 0 is not allowed, instead 95 is used (Ex: E14 Gen 3) 
         * See issue #8: https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/issues/8
         */
        const disableStart95 = /(Think[pP]ad) (E14 Gen 3)/;

        if (this.environment.productVersion.search(disableStart95) >= 0) {
            return (this.startValue !== 95 && this.startValue !== null) || (this.endValue !== 100 && this.endValue !== null);
        } else {
            return (this.startValue !== 0 && this.startValue !== null) || (this.endValue !== 100 && this.endValue !== null);
        }
    }

    /**
     * Check if there are changes to the settings that need to be applied
     * 
     * @returns {boolean} Returns true if there are changes to the settings that need to be applied
     */
    _checkPendingChanges() {
        const startSetting = this.settings.get_int(`start-${this.name.toLowerCase()}`);
        const endSetting = this.settings.get_int(`end-${this.name.toLowerCase()}`);
        return ((this.startValue != null && this.startValue !== startSetting) || (this.endValue != null && this.endValue !== endSetting));
    }

    /**
     * Check if authentication is required to apply the changes
     * 
     * @returns {boolean} Returns true if authentication is required to apply the changes
     */
    _checkAuthRequired() {
        try {
            const f = Gio.File.new_for_path(this._startFilePath);
            const info = f.query_info('access::*', Gio.FileQueryInfoFlags.NONE, null);
            if (!info.get_attribute_boolean('access::can-write')) {
                return true;
            }
        } catch (e) {
            // Ignored
        }

        try {
            const f = Gio.File.new_for_path(this._endFilePath);
            const info = f.query_info('access::*', Gio.FileQueryInfoFlags.NONE, null);
            if (!info.get_attribute_boolean('access::can-write')) {
                return true;
            }
        } catch (e) {
            // Ignored
        } 
        return false;
    }

    get authRequired() {
        return this._authRequired;
    }

    set authRequired(value) {
        if (this.authRequired !== value) {
            this._authRequired = value;
            this.notify('auth-required');
        }
    }

    get isActive() {
        return this._isActive;
    }

    set isActive(value) {
        if (this.isActive !== value) {
            this._isActive = value;
            this.notify('is-active');
        }
    }

    get isAvailable() {
        return this._isAvaialble;
    }

    set isAvailable(value) {
        if (this.isAvailable !== value) {
            this._isAvaialble = value;
            this.notify('is-available');
        }
    }

    get startValue() {
        return this._startValue;
    }

    set startValue(value) {
        if (this.startValue !== value) {
            this._startValue = value;
            this.notify('start-value');
        }
    }

    get endValue() {
        return this._endValue;
    }

    set endValue(value) {
        if (this.endValue !== value) {
            this._endValue = value;
            this.notify('end-value');
        }
    }

    get pendingChanges() {
        return this._pendingChanges;
    }

    set pendingChanges(value) {
        if (this.pendingChanges !== value) {
            this._pendingChanges = value;
            this.notify('pending-changes');
        }
    }

    /** 
     * Returns the command to set the thresholds.
     * This function does not run the command, it just returns the string corresponding to the command.
     * Passed values are not validated by the function, it is your responsibility to validate them first.
     * 
     * @param {number} start Start value
     * @param {number} end End value
     * @returns {string|null} Command to modify the thresholds
    */
    _getSetterCommand(start, end) {
        if (!this.isAvailable) {
            debug(`Battery (${this.name}) is not available`);
            return null;
        }

        if (!Number.isInteger(start) || !Number.isInteger(end)) {
            throw TypeError(`Thresholds (${start}/${end}) on battery (${this.name}) are not integer`);
        }

        if (start < 0 || end > 100 || start >= end) {
            throw RangeError(`Thresholds (${start}/${end}) on battery (${this.name}) out of range`);
        }

        // Commands
        const setStart = `echo ${start.toString()} > ${this._startFilePath}`;
        const setEnd = `echo ${end.toString()} > ${this._endFilePath}`;

        let oldStart = this.startValue;
        let oldEnd = this.endValue;

        if ((oldStart === start || oldStart === null) && (oldEnd === end || oldEnd === null)) {
            // Same thresholds
            debug(`Thresholds (${start}/${end}) on battery (${this.name}) are already applied, nothing to do`);
            return null;
        }

        if (oldStart >= oldEnd) {
            // Invalid threshold reading, happens on ThinkPad E/L series
            oldStart = null;
            oldEnd = null;
        }

        let command = null;

        if (fileExists(this._startFilePath) && fileExists(this._endFilePath)) {
            if (oldStart === start) { // Same start, apply only stop
                command = setEnd;
            } else if (oldEnd === end) { // Same stop, apply only start
                command = setStart;
            } else {
                // Determine sequence
                let startStopSequence = true;
                if (oldEnd != null && start > oldEnd) {
                    startStopSequence = false;
                }
                if (startStopSequence) {
                    command = setStart + ' && ' + setEnd;
                } else {
                    command = setEnd + ' && ' + setStart;
                }
            }
        } else if (fileExists(this._startFilePath)) { // Only start available
            command = setStart;
        } else if (fileExists(this._endFilePath)) { // Only stop available
            command = setEnd;
        }

        debug(`The command to apply the thresholds (${start}/${end}) on the battery (${this.name}) is '${command}'`);
        return command;
    }

    /**
     * Get the command string to enable the configured thresholds
     * 
     * @returns {string|null} Enable thresholds command string
     */
    get enableCommand() {
        const startSetting = this.settings.get_int(`start-${this.name.toLowerCase()}`);
        const endSetting = this.settings.get_int(`end-${this.name.toLowerCase()}`);
        return this._getSetterCommand(startSetting, endSetting);
    }

    /**
     * Get the command string to disable the thresholds
     * 
     * @returns {string|null} Enable thresholds command string
     */
    get disableCommand() {
        return this._getSetterCommand(0, 100);
    }

    /**
     * Enable the configured thresholds
     */
    enable() {
        const command = this.enableCommand;
        if (!command) {
            debug('The command is null, it will not be executed');
            return;
        }
        const runnable = new Runnable(command, this.authRequired);
        runnable.connect('command-completed', (obj, error) => {
            this.emit('enable-completed', error);
        })
        runnable.run();
    }

    /**
     * Disable thresholds
     */
    disable() {
        const command = this.disableCommand;
        if (!command) {
            debug('The command is null, it will not be executed');
            return;
        }
        const runnable = new Runnable(command, this.authRequired);
        runnable.connect('command-completed', (obj, error) => {
            this.emit('disable-completed', error);
        })
        runnable.run();
    }

    /**
     * Toggle thresholds status
     */
    toggle() {
        this.isActive ? this.disable() : this.enable();
    }

    destroy() {
        if (this._startId) {
            this.disconnect(this._startId);
        }
        if (this._endId) {
            this.disconnect(this._endId);
        }
        if (this._settingStartId) {
            this.settings.disconnect(this._settingStartId);
        }
        if (this._settingEndId) {
            this.settings.disconnect(this._settingEndId);
        }
        if (this._monitorId) {
            this._baseMonitor.disconnect(this._monitorId);
        }
        this._baseMonitor.cancel();
        this._baseMonitor.run_dispose();
        this._baseMonitor = null;
        this._baseDirectory.run_dispose()
        this._baseDirectory = null;
    }
});

var ThinkPad = GObject.registerClass({
    GTypeName: 'ThinkPad',
    Properties: {
        'environment': GObject.ParamSpec.object(
            'environment',
            'Environment',
            'Environment',
            GObject.ParamFlags.READABLE,
            Environment.$gtype
        ),
        'is-supported': GObject.ParamSpec.boolean(
            'is-supported',
            'Is supported',
            'Driver matches the platform',
            GObject.ParamFlags.READABLE,
            false
        ),
        'is-active': GObject.ParamSpec.boolean(
            'is-active',
            'Is active',
            'Indicates if the thresholds are active or not',
            GObject.ParamFlags.READABLE,
            false
        ),
        'is-available': GObject.ParamSpec.boolean(
            'is-available',
            'Is available',
            'Indicates if the battery are available or not',
            GObject.ParamFlags.READABLE,
            false
        ),
        'batteries': GObject.ParamSpec.jsobject(
            'batteries',
            'Batteries',
            'Batteries object',
            GObject.ParamFlags.READWRITE,
            []
        ),
        'settings': GObject.ParamSpec.object(
            'settings',
            'Settings',
            'Settings',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gio.Settings.$gtype
        ),
    },
    Signals: {
        'enable-battery-completed': {
            param_types: [GObject.TYPE_OBJECT /* battery */, GObject.TYPE_JSOBJECT /* error */]
        },
        'disable-battery-completed': {
            param_types: [GObject.TYPE_OBJECT /* battery */, GObject.TYPE_JSOBJECT /* error */]
        },
        'enable-all-completed': {
            param_types: [GObject.TYPE_JSOBJECT /* error */]
        },
        'disable-all-completed': {
            param_types: [GObject.TYPE_JSOBJECT /* error */]
        },
    },
}, class ThinkPad extends GObject.Object {
    constructor(constructProperties = {}) {
        super(constructProperties);

        debugMode = this.settings.get_boolean('debug-mode');

        // Check compatibility
        if (!this.isSupported) {
            this.batteries = [];
            return;
        }

        // Signals handlers IDs
        this._batteriesId = {};

        // Define batteries
        this.batteries = [
            new ThinkPadBattery({
                'environment': this.environment,
                'name': 'BAT0', 
                'settings': this.settings
            }),
            new ThinkPadBattery({
                'environment': this.environment,
                'name': 'BAT1', 
                'settings': this.settings
            }),
        ];

        // Connect the signals from the batteries to update the flags and notify commands
        this.batteries.forEach(battery => {
            const isAvailableId = battery.connect(
                'notify::is-available', (bat) => {
                    this.isAvailable = this._checkAvailable();
                }
            );
            const isActiveId = battery.connect(
                'notify::is-active', (bat) => {
                    this.isActive = this._checkActive();
                }
            );
            const enableCompletedId = battery.connect(
                'enable-completed', (bat, error) => {
                    this.emit('enable-battery-completed', bat, error);
                }
            );
            const disableCompletedId = battery.connect(
                'disable-completed', (bat, error) => {
                    this.emit('disable-battery-completed', bat, error);
                }
            );
            this._batteriesId[battery.name] = [isAvailableId, isActiveId, enableCompletedId, disableCompletedId];
        });

        this._debugHandlerId = this.settings.connect('changed::debug-mode', () => {
            debugMode = this.settings.get_boolean('debug-mode');
        });

        // Load initial values
        this.isAvailable = this._checkAvailable();
        this.isActive = this._checkActive();
    }

    get environment() {
        if (this._environment === undefined) {
            this._environment = new Environment();
        }
        return this._environment;
    }

    get isSupported() {
        // RegExs
        const thinkpad = /Think[pP]ad/;
        const unsupported = /^(L[45]20|L512|SL[345]00|X121e)$/;

        if (this._isSupported === undefined) {

            if (this.environment.checkMinKernelVersion(4, 17)) {
                debug(`Kernel version: ${this.environment.kernelRelease}`);
            } else {
                debug(`Kernel ${this.environment.kernelRelease} not supported`);
                this._isSupported = false
                return this._isSupported;
            }

            const disableModelVerificationCheck = this.settings.get_boolean('disable-model-verification-check');
            if (disableModelVerificationCheck) {
                this._isSupported = true;
            } else if (!this.environment.productVersion) { 
                this._isSupported = false 
            } else if (this.environment.productVersion.search(thinkpad) >= 0) {
                // Is ThinkPad

                // Unsupported models
                const model = this.environment.productVersion.replace(thinkpad, '').trim();
                if (model.search(unsupported) >= 0) {
                    this._isSupported = false;
                } else {
                    this._isSupported = true;
                }
            } else {
                this._isSupported = false;
            }

            if (this._isSupported) {
                debug(`Product version: ${this.environment.productVersion}${disableModelVerificationCheck ? ' - WARNING: Model verification disabled!!!' : ''}`);
            } else {
                debug(`Platform ${this.environment.productVersion} not supported`);
            }
        }

        return this._isSupported;
    }

    get isAvailable() {
        return this._isAvaialble;
    }

    set isAvailable(value) {
        if (this.isAvailable !== value) {
            this._isAvaialble = value;
            this.notify('is-available');
        }
    }

    get isActive() {
        return this._isActive;
    }

    set isActive(value) {
        if (this.isActive !== value) {
            this._isActive = value;
            this.notify('is-active');
        }
    }

    /**
     * Check if at least one battery has the thresholds active
     * 
     * @returns {boolean} Returns true if at least one battery has the thresholds active
     */
    _checkActive() {
        return this.batteries.some(bat => {
            return bat.isActive && bat.isAvailable;
        });
    }

    /**
     * Check if at least one battery is available to apply the thresholds
     * 
     * @returns {boolean} Returns true if at least one battery is available to apply the thresholds
     */
    _checkAvailable() {
        return this.batteries.some(bat => {
            return bat.isAvailable;
        });
    }

    /**
     * Enable all configured thresholds
     */
    enableAll() {
        let command = '';
        let authRequired = false;
        this.batteries.forEach(battery => {
            const batteryCommand = battery.enableCommand;
            if (batteryCommand) {
                command = `${command}${command ? ' && ' : ''}${batteryCommand}`;
                authRequired = authRequired || battery.authRequired;
            }
        });
        if (!command) {
            debug('The command is null, it will not be executed');
            return;
        }
        const runnable = new Runnable(command, authRequired);
        runnable.connect('command-completed', (obj, error) => {
            this.emit('enable-all-completed', error);
        })
        runnable.run(); 
    }

    /**
     * Disable all thresholds
     */
    disableAll() {
        let command = '';
        let authRequired = false;
        this.batteries.forEach(battery => {
            const batteryCommand = battery.disableCommand;
            if (batteryCommand) {
                command = `${command}${command ? ' && ' : ''}${batteryCommand}`;
                authRequired = authRequired || battery.authRequired;
            }
        });
        if (!command) {
            debug('The command is null, it will not be executed');
            return;
        }
        const runnable = new Runnable(command, authRequired);
        runnable.connect('command-completed', (obj, error) => {
            this.emit('disable-all-completed', error);
        })
        runnable.run(); 
    }

    destroy() {
        if (this._batteriesId) {
            this.batteries.forEach(battery => {
                const ids = this._batteriesId[battery.name];
                ids.forEach(id => {
                    battery.disconnect(id);
                });
                battery.destroy()
            });
        }

        if (this._debugHandlerId) {
            this.settings.disconnect(this._debugHandlerId);
        }
    }
});