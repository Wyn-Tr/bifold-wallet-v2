import { Platform } from 'react-native';
import Keychain, { getSupportedBiometryType } from 'react-native-keychain';
import uuid from 'react-native-uuid';
import { walletId, KeychainServices } from '../constants';
import { hashPIN } from '../utils/crypto';
const keyFauxUserName = 'WalletFauxPINUserName';
const saltFauxUserName = 'WalletFauxSaltUserName';
const loginAttemptFauxUserName = 'WalletFauxLoginAttemptUserName';
export const optionsForKeychainAccess = (service, useBiometrics = false) => {
    const opts = {
        accessible: useBiometrics ? Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY : Keychain.ACCESSIBLE.ALWAYS,
        service,
    };
    if (useBiometrics) {
        opts.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_ANY;
    }
    if (Platform.OS === 'android') {
        opts.securityLevel = Keychain.SECURITY_LEVEL.ANY;
        if (!useBiometrics) {
            opts.storage = Keychain.STORAGE_TYPE.AES;
        }
        else {
            opts.storage = Keychain.STORAGE_TYPE.RSA;
        }
    }
    return opts;
};
export const secretForPIN = async (PIN, salt) => {
    const mySalt = salt ?? uuid.v4().toString();
    const myKey = await hashPIN(PIN, mySalt);
    const secret = {
        id: walletId,
        key: myKey,
        salt: mySalt,
    };
    return secret;
};
export const wipeWalletKey = async (useBiometrics) => {
    const opts = optionsForKeychainAccess(KeychainServices.Key, useBiometrics);
    await Keychain.resetGenericPassword(opts);
};
export const storeWalletKey = async (secret, useBiometrics = false) => {
    const opts = optionsForKeychainAccess(KeychainServices.Key, useBiometrics);
    const secretAsString = JSON.stringify(secret);
    await wipeWalletKey(useBiometrics);
    const result = await Keychain.setGenericPassword(keyFauxUserName, secretAsString, opts);
    return Boolean(result);
};
export const storeWalletSalt = async (secret) => {
    const opts = optionsForKeychainAccess(KeychainServices.Salt, false);
    const secretAsString = JSON.stringify(secret);
    const result = await Keychain.setGenericPassword(saltFauxUserName, secretAsString, opts);
    return Boolean(result);
};
export const storeLoginAttempt = async (loginAttempt) => {
    const opts = optionsForKeychainAccess(KeychainServices.LoginAttempt, false);
    const loginAttemptAsString = JSON.stringify(loginAttempt);
    const result = await Keychain.setGenericPassword(loginAttemptFauxUserName, loginAttemptAsString, opts);
    return Boolean(result);
};
export const storeWalletSecret = async (secret, useBiometrics = false) => {
    let keyResult = false;
    if (secret.key) {
        keyResult = await storeWalletKey({ key: secret.key }, useBiometrics);
    }
    const saltResult = await storeWalletSalt({ id: secret.id, salt: secret.salt });
    return keyResult && saltResult;
};
export const loadWalletSalt = async () => {
    let salt = undefined;
    const opts = {
        service: KeychainServices.Salt,
    };
    const result = await Keychain.getGenericPassword(opts);
    if (!result) {
        return;
    }
    // salt data is stored and returned as a string and needs to be parsed
    const parsedSalt = JSON.parse(result.password);
    if (!parsedSalt.id || !parsedSalt.salt) {
        throw new Error('Wallet salt failed to load');
    }
    salt = {
        id: parsedSalt.id,
        salt: parsedSalt.salt,
    };
    return salt;
};
export const loadLoginAttempt = async () => {
    const opts = {
        service: KeychainServices.LoginAttempt,
    };
    const result = await Keychain.getGenericPassword(opts);
    if (!result) {
        return;
    }
    return JSON.parse(result.password);
};
export const loadWalletKey = async (title, description) => {
    let opts = {
        service: KeychainServices.Key,
    };
    if (title && description) {
        opts = {
            ...opts,
            authenticationPrompt: {
                title,
                description,
            },
        };
    }
    const result = await Keychain.getGenericPassword(opts);
    if (!result) {
        return;
    }
    return JSON.parse(result.password);
};
export const loadWalletSecret = async (title, description) => {
    let salt;
    let key;
    let secret = undefined;
    try {
        salt = await loadWalletSalt();
        key = await loadWalletKey(title, description);
    }
    catch (e) {
        throw new Error(e?.message ?? e);
    }
    if (!salt?.id || !salt?.salt || !key) {
        throw new Error('Wallet secret is missing key property');
    }
    secret = {
        id: salt.id,
        key: key.key,
        salt: salt.salt,
    };
    return secret;
};
// This function checks if the biometrics on a device have been configured
// If fingerprints or a face scan is setup, this will return true
// If the device supports biometrics but they have not been configured, it will return false
export const isBiometricsActive = async () => {
    const result = await getSupportedBiometryType();
    return Boolean(result);
};
