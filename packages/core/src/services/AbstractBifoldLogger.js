import { BaseLogger, LogLevel } from '@credo-ts/core';
export class AbstractBifoldLogger extends BaseLogger {
    logLevel = LogLevel.debug;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _log;
    _config = {
        levels: {
            test: 0,
            trace: 0,
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            fatal: 4,
        },
        severity: 'debug',
        async: true,
        dateFormat: 'time',
        printDate: false,
    };
    isEnabled(logLevel) {
        return logLevel >= this.logLevel;
    }
    test(message, data) {
        this._log?.test({ message, data });
    }
    trace(message, data) {
        this._log?.trace({ message, data });
    }
    debug(message, data) {
        this._log?.debug({ message, data });
    }
    info(message, data) {
        this._log?.info({ message, data });
    }
    warn(message, data) {
        this._log?.warn({ message, data });
    }
    error(message, dataOrError, error) {
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
        this._log?.error({ message, data, error: actualError });
    }
    fatal(message, dataOrError, error) {
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
        this._log?.fatal({ message, data, error: actualError });
    }
}
