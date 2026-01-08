import { W3cCredentialRecord, SdJwtVcRecord, MdocRecord, W3cCredentialRepository, SdJwtVcRepository, MdocRepository, } from '@credo-ts/core';
export const openId4VcCredentialMetadataKey = '_bifold/openId4VcCredentialMetadata';
export const refreshCredentialMetadataKey = '_bifold/refreshCredentialMetadata';
export function extractOpenId4VcCredentialMetadata(credentialMetadata, serverMetadata) {
    return {
        credential: {
            display: credentialMetadata.display,
            order: credentialMetadata.order,
            credential_subject: credentialMetadata.credential_subject,
        },
        issuer: {
            display: serverMetadata.display,
            id: serverMetadata.id,
        },
    };
}
/**
 * Gets the OpenId4Vc credential metadata from the given W3C credential record.
 */
export function getOpenId4VcCredentialMetadata(credentialRecord) {
    return credentialRecord.metadata.get(openId4VcCredentialMetadataKey);
}
/**
 * Sets the OpenId4Vc credential metadata on the given W3cCredentialRecord or SdJwtVcRecord.
 *
 * NOTE: this does not save the record.
 */
export function setOpenId4VcCredentialMetadata(credentialRecord, metadata) {
    credentialRecord.metadata.set(openId4VcCredentialMetadataKey, metadata);
}
/**
 * Gets the refresh credential metadata from the given credential record.
 */
export function getRefreshCredentialMetadata(credentialRecord) {
    return credentialRecord.metadata.get(refreshCredentialMetadataKey);
}
/**
 * Sets the refresh credential metadata on the given credential record
 *
 * NOTE: this does not save the record.
 */
export function setRefreshCredentialMetadata(credentialRecord, metadata) {
    credentialRecord.metadata.set(refreshCredentialMetadataKey, metadata);
}
export function deleteRefreshCredentialMetadata(credentialRecord) {
    credentialRecord.metadata.delete(refreshCredentialMetadataKey);
}
export async function persistCredentialRecord(agentContext, record) {
    if (record instanceof W3cCredentialRecord) {
        await agentContext.dependencyManager.resolve(W3cCredentialRepository).update(agentContext, record);
    }
    else if (record instanceof SdJwtVcRecord) {
        await agentContext.dependencyManager.resolve(SdJwtVcRepository).update(agentContext, record);
    }
    else if (record instanceof MdocRecord) {
        await agentContext.dependencyManager.resolve(MdocRepository).update(agentContext, record);
    }
    else {
        throw new Error('Unsupported credential record type for persistence');
    }
}
export async function markOpenIDCredentialStatus({ credential, status, agentContext, }) {
    const refreshMetadata = getRefreshCredentialMetadata(credential);
    if (!refreshMetadata) {
        throw new Error('No refresh metadata found on the credential record.');
    }
    refreshMetadata.lastCheckResult = status;
    setRefreshCredentialMetadata(credential, refreshMetadata);
    // Persist the updated credential record
    await persistCredentialRecord(agentContext, credential);
}
export const temporaryMetaVanillaObject = {
    notificationMetadata: undefined,
    tokenResponse: undefined,
};
