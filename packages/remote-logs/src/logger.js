import { AbstractBifoldLogger } from '@bifold/core';
import { LogLevel } from '@credo-ts/core';
import { DeviceEventEmitter } from 'react-native';
import { logger } from 'react-native-logs';
import { lokiTransport, consoleTransport } from './transports';
export var RemoteLoggerEventTypes;
(function (RemoteLoggerEventTypes) {
    RemoteLoggerEventTypes["ENABLE_REMOTE_LOGGING"] = "RemoteLogging.Enable";
})(RemoteLoggerEventTypes || (RemoteLoggerEventTypes = {}));
/**
 * Session ID generation constants
 */
const SESSION_ID_RANGE = {
    MIN: 100000,
    MAX: 999999,
};
export class RemoteLogger extends AbstractBifoldLogger {
    _remoteLoggingEnabled = false;
    _sessionId;
    _autoDisableRemoteLoggingIntervalInMinutes = 0;
    lokiUrl;
    lokiLabels;
    remoteLoggingAutoDisableTimer;
    eventListener;
    _baseLogLevel = LogLevel.debug;
    constructor(options) {
        super();
        this.lokiUrl = options.lokiUrl ?? undefined;
        this.lokiLabels = options.lokiLabels ?? {};
        this._autoDisableRemoteLoggingIntervalInMinutes = options.autoDisableRemoteLoggingIntervalInMinutes ?? 0;
        if (options.logLevel !== undefined) {
            this.logLevel = options.logLevel;
        }
        this._baseLogLevel = this.logLevel;
        this.configureLogger();
    }
    get sessionId() {
        // When remote logging is disabled this will be 0; enabled path guarantees initialization
        return this._sessionId ?? 0;
    }
    set sessionId(value) {
        this._sessionId = value;
        this.configureLogger();
    }
    get autoDisableRemoteLoggingIntervalInMinutes() {
        return this._autoDisableRemoteLoggingIntervalInMinutes;
    }
    get remoteLoggingEnabled() {
        return this._remoteLoggingEnabled;
    }
    set remoteLoggingEnabled(value) {
        this._remoteLoggingEnabled = value;
        if (value) {
            // Generate a new session id on first enable
            if (!this._sessionId) {
                this._sessionId = Math.floor(SESSION_ID_RANGE.MIN + Math.random() * (SESSION_ID_RANGE.MAX - SESSION_ID_RANGE.MIN + 1));
            }
            // Override to most verbose when remote logging active
            this.logLevel = LogLevel.debug;
        }
        else {
            this._sessionId = undefined;
            if (this.remoteLoggingAutoDisableTimer) {
                clearTimeout(this.remoteLoggingAutoDisableTimer);
                this.remoteLoggingAutoDisableTimer = undefined;
            }
            // Restore base level after deactivation
            this.logLevel = this._baseLogLevel;
        }
        this.configureLogger();
    }
    configureLogger() {
        const transportOptions = {};
        const transport = [consoleTransport];
        // We rely on per-method isEnabled() gating and keep transport severity at lowest (debug)
        // so react-native-logs does not perform an additional filter layer.
        const severity = 'debug';
        const config = {
            ...this._config,
            transport,
            transportOptions,
            severity,
        };
        if (this.remoteLoggingEnabled && this.lokiUrl) {
            transport.push(lokiTransport);
            config['transportOptions'] = {
                lokiUrl: this.lokiUrl,
                lokiLabels: {
                    ...this.lokiLabels,
                    session_id: `${this.sessionId}`,
                },
            };
            if (this.autoDisableRemoteLoggingIntervalInMinutes && this.autoDisableRemoteLoggingIntervalInMinutes > 0) {
                this.remoteLoggingAutoDisableTimer = setTimeout(() => {
                    this.remoteLoggingEnabled = false;
                }, this.autoDisableRemoteLoggingIntervalInMinutes * 60000);
            }
        }
        this._log = logger.createLogger(config);
    }
    /** Update minimum log level and reconfigure underlying transport */
    setLogLevel(level) {
        this._baseLogLevel = level;
        // Only apply immediately if remote logging isn't forcing
        // debug
        if (!this._remoteLoggingEnabled) {
            this.logLevel = level;
        }
        this.configureLogger();
    }
    startEventListeners() {
        this.eventListener = DeviceEventEmitter.addListener(RemoteLoggerEventTypes.ENABLE_REMOTE_LOGGING, (value) => {
            this.remoteLoggingEnabled = value;
        });
    }
    stopEventListeners() {
        this.eventListener?.remove();
        this.eventListener = undefined;
    }
    overrideCurrentAutoDisableExpiration(expirationInMinutes) {
        if (expirationInMinutes <= 0) {
            return;
        }
        if (this.remoteLoggingAutoDisableTimer) {
            clearTimeout(this.remoteLoggingAutoDisableTimer);
        }
        this.remoteLoggingAutoDisableTimer = setTimeout(() => {
            this.remoteLoggingEnabled = false;
        }, expirationInMinutes * 60000);
    }
    report(bifoldError) {
        this._log?.info?.({ message: 'Sending Loki report' });
        const { title, description, code, message } = bifoldError;
        lokiTransport({
            msg: title,
            rawMsg: [{ message: title, data: { title, description, code, message } }],
            level: { severity: 3, text: 'error' },
            options: {
                lokiUrl: this.lokiUrl,
                lokiLabels: this.lokiLabels,
                job: 'incident-report',
            },
        });
    }
    // Standardized logging methods with consistent overloads
    test = (message, dataOrError, error) => {
        if (!this.isEnabled(LogLevel.debug))
            return;
        const { data, actualError } = this.parseLogArguments(dataOrError, error);
        this._log?.test?.({ message, data, error: actualError });
    };
    trace = (message, dataOrError, error) => {
        if (!this.isEnabled(LogLevel.debug))
            return;
        const { data, actualError } = this.parseLogArguments(dataOrError, error);
        this._log?.trace?.({ message, data, error: actualError });
    };
    debug = (message, dataOrError, error) => {
        if (!this.isEnabled(LogLevel.debug))
            return;
        const { data, actualError } = this.parseLogArguments(dataOrError, error);
        this._log?.debug?.({ message, data, error: actualError });
    };
    info = (message, dataOrError, error) => {
        if (!this.isEnabled(LogLevel.info))
            return;
        const { data, actualError } = this.parseLogArguments(dataOrError, error);
        this._log?.info?.({ message, data, error: actualError });
    };
    warn = (message, dataOrError, error) => {
        if (!this.isEnabled(LogLevel.warn))
            return;
        const { data, actualError } = this.parseLogArguments(dataOrError, error);
        this._log?.warn?.({ message, data, error: actualError });
    };
    error = (message, dataOrError, error) => {
        if (!this.isEnabled(LogLevel.error))
            return;
        const { data, actualError } = this.parseLogArguments(dataOrError, error);
        this._log?.error?.({ message, data, error: actualError });
    };
    fatal = (message, dataOrError, error) => {
        if (!this.isEnabled(LogLevel.fatal))
            return;
        const { data, actualError } = this.parseLogArguments(dataOrError, error);
        this._log?.fatal?.({ message, data, error: actualError });
    };
    /**
     * Helper method to parse logging arguments consistently across all log levels
     * @param dataOrError - Either data object or Error instance
     * @param error - Optional Error instance when first param is data
     * @returns Parsed data and error objects
     */
    parseLogArguments(dataOrError, error) {
        let data;
        let actualError;
        if (dataOrError instanceof Error) {
            // Second parameter is an Error, so no data
            actualError = dataOrError;
        }
        else {
            // Second parameter is data (or undefined)
            data = dataOrError;
            actualError = error;
        }
        return { data, actualError };
    }
    /** Dispose of timers and listeners, disable remote logging */
    dispose() {
        this.stopEventListeners();
        this.remoteLoggingEnabled = false;
        if (this.remoteLoggingAutoDisableTimer) {
            clearTimeout(this.remoteLoggingAutoDisableTimer);
            this.remoteLoggingAutoDisableTimer = undefined;
        }
    }
}
