import { NativeModules, Platform } from 'react-native';
import { Buffer } from 'buffer';
import NativeAttestationSpec from './NativeAttestation';
const LINKING_ERROR = `The package 'react-native-attestation' doesn't seem to be linked. Make sure: \n\n` +
    Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
    '- You rebuilt the app after installing the package\n' +
    '- You are not using Expo Go\n';
// @ts-expect-error global.__turboModuleProxy is a global variable injected by TurboModuleProxy
const isTurboModuleEnabled = global.__turboModuleProxy != null;
const AttestationModule = isTurboModuleEnabled
    ? NativeAttestationSpec
    : NativeModules.Attestation;
const Attestation = AttestationModule
    ? AttestationModule
    : new Proxy({}, {
        get() {
            throw new Error(LINKING_ERROR);
        },
    });
// TODO: Make available from Android.
export const sha256 = async (stringToHash) => {
    if (Platform.OS !== 'ios') {
        throw new Error('sha256 is only available on iOS');
    }
    const bytes = await Attestation.sha256(stringToHash);
    return Buffer.from(bytes);
};
export const generateKey = async (cache = false) => {
    if (Platform.OS !== 'ios') {
        throw new Error('generateKey is only available on iOS');
    }
    return Attestation.generateKey(cache);
};
export const appleKeyAttestation = async (keyId, challenge) => {
    if (Platform.OS !== 'ios') {
        throw new Error('appleKeyAttestation is only available on iOS');
    }
    const bytes = await Attestation.appleKeyAttestation(keyId, challenge);
    return Buffer.from(bytes);
};
export const appleAttestation = async (keyId, challenge) => {
    if (Platform.OS !== 'ios') {
        throw new Error('appleAttestation is only available on iOS');
    }
    const bytes = await Attestation.appleAttestation(keyId, challenge);
    return Buffer.from(bytes);
};
export const googleAttestation = async (nonce) => {
    if (Platform.OS !== 'android') {
        throw new Error('googleAttestation is only available on Android');
    }
    const token = await Attestation.googleAttestation(nonce);
    return token;
};
export const isPlayIntegrityAvailable = async () => {
    if (Platform.OS !== 'android') {
        throw new Error('isPlayIntegrityAvailable is only available on Android');
    }
    return Attestation.isPlayIntegrityAvailable();
};
export const getAppStoreReceipt = async () => {
    if (Platform.OS !== 'ios') {
        throw new Error('getAppStoreReceipt is only available on iOS');
    }
    return await Attestation.getAppStoreReceipt();
};
