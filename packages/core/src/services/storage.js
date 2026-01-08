import AsyncStorage from '@react-native-async-storage/async-storage';
// Safety check for AsyncStorage availability
const isAsyncStorageAvailable = () => {
    try {
        return AsyncStorage !== undefined && AsyncStorage !== null && typeof AsyncStorage.getItem === 'function';
    }
    catch {
        return false;
    }
};
export class PersistentStorage {
    _state;
    log;
    constructor(logger) {
        // this._state = state
        this.log = logger;
    }
    static fetchValueForKey = async (key, log) => {
        if (!isAsyncStorageAvailable()) {
            log?.warn(`AsyncStorage not available when fetching key ${key}`);
            return undefined;
        }
        try {
            const value = await AsyncStorage.getItem(key);
            if (!value) {
                return;
            }
            return JSON.parse(value);
        }
        catch (error) {
            log?.error(`Error fetching state for key ${key}, ${error}`);
        }
    };
    static storeValueForKey = async (key, value, log) => {
        if (!isAsyncStorageAvailable()) {
            log?.warn(`AsyncStorage not available when storing key ${key}`);
            return;
        }
        try {
            const serializedState = JSON.stringify(value);
            return AsyncStorage.setItem(key, serializedState);
        }
        catch (error) {
            log?.error(`Error storing state for key ${key}, ${error}`);
            throw error;
        }
    };
    static removeValueForKey = async (key, log) => {
        if (!isAsyncStorageAvailable()) {
            log?.warn(`AsyncStorage not available when removing key ${key}`);
            return;
        }
        try {
            return AsyncStorage.removeItem(key);
        }
        catch (error) {
            log?.error(`Error removing state for key ${key}, ${error}`);
            throw error;
        }
    };
    async setValueForKey(key, value) {
        if (!this._state) {
            throw new Error("State hasn't been initialized");
        }
        // @ts-expect-error Fix complicated type error
        this._state[key] = value;
        if (!isAsyncStorageAvailable()) {
            this.log?.warn(`AsyncStorage not available when setting key ${key}`);
            return;
        }
        try {
            const serializedState = JSON.stringify(value);
            await AsyncStorage.setItem(key, serializedState);
        }
        catch (error) {
            this.log?.error(`Error saving state for key ${key}, ${error}`);
        }
    }
    async getValueForKey(key) {
        try {
            if (!this._state) {
                await this.load();
            }
            // If state isn't readdy leave early
            if (!this._state) {
                return undefined;
            }
            // @ts-expect-error Fix complicated type error.
            const data = this._state[key];
            // don't attempt to type cast this undefined value
            if (data === undefined || data === null) {
                return undefined;
            }
            return data;
        }
        catch (error) {
            this.log?.error(`Error loading state for key ${key}, ${error}`);
        }
    }
    async migrateStorageKey(oldKey, newKey) {
        if (!isAsyncStorageAvailable()) {
            this.log?.warn(`AsyncStorage not available when migrating key ${oldKey}`);
            return false;
        }
        try {
            const value = await AsyncStorage.getItem(oldKey);
            if (!value) {
                return false;
            }
            await AsyncStorage.setItem(newKey, value);
            await AsyncStorage.removeItem(oldKey);
            // @ts-expect-error Fix complicated type error
            delete this._state[oldKey];
            // @ts-expect-error Fix complicated type error
            this._state[newKey] = JSON.parse(value);
            return true;
        }
        catch (error) {
            this.log?.error(`Error migrating state for key ${oldKey}, ${error}`);
        }
        return false;
    }
    async flush() {
        if (!this._state) {
            return;
        }
        if (!isAsyncStorageAvailable()) {
            this.log?.warn('AsyncStorage not available when flushing state');
            return;
        }
        try {
            const keys = Object.keys(this._state);
            for (const key of keys) {
                // @ts-expect-error Fix complicated type error
                const value = this._state[key];
                const serializedState = JSON.stringify(value);
                await AsyncStorage.setItem(key, serializedState);
            }
        }
        catch (error) {
            this.log?.error('Error saving state', error);
        }
    }
    async load() {
        if (!isAsyncStorageAvailable()) {
            this.log?.warn('AsyncStorage not available when loading state');
            return;
        }
        try {
            const keys = await AsyncStorage.getAllKeys();
            const items = await AsyncStorage.multiGet(keys);
            items.forEach(([key, value]) => {
                if (value === null || value === undefined) {
                    return;
                }
                const parsedValue = JSON.parse(value);
                // @ts-expect-error Fix complicated type error
                this._state = { ...this._state, [key]: parsedValue };
            });
        }
        catch (error) {
            this.log?.error('Error loading state', error);
        }
    }
}
