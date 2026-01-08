import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds';
import { CredentialState } from '@credo-ts/core';
import { luminanceForHexColor } from './luminance';
export const isValidAnonCredsCredential = (credential) => {
    return (credential &&
        (credential.state === CredentialState.OfferReceived ||
            (Boolean(credential.metadata.get(AnonCredsCredentialMetadataKey)) &&
                credential.credentials.find((c) => c.credentialRecordType === 'anoncreds' || c.credentialRecordType === 'w3c'))));
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const credentialTextColor = (ColorPallet, hex) => {
    const midpoint = 255 / 2;
    if ((luminanceForHexColor(hex ?? '') ?? 0) >= midpoint) {
        return ColorPallet.grayscale.darkGrey;
    }
    return ColorPallet.grayscale.white;
};
export const toImageSource = (source) => {
    if (typeof source === 'string') {
        return { uri: source };
    }
    return source;
};
export const getCredentialIdentifiers = (credential) => {
    return {
        credentialDefinitionId: credential.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId,
        schemaId: credential.metadata.get(AnonCredsCredentialMetadataKey)?.schemaId,
    };
};
export const formatExpirationDate = (expValue) => {
    if (!expValue)
        return '';
    // Handle format: "20250101" (YYYYMMDD)
    if (expValue.length === 8) {
        const month = expValue.substring(4, 6);
        const day = expValue.substring(6, 8);
        const year = expValue.substring(0, 4);
        return `${month}/${day}/${year}`;
    }
    return expValue;
};
export const safeParse = (str) => {
    try {
        return JSON.parse(str);
    }
    catch {
        return null;
    }
};
