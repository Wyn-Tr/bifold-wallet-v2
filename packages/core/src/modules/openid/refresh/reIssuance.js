import { JwaSignatureAlgorithm, Mdoc, MdocRecord, SdJwtVcRecord, W3cCredentialRecord, } from '@credo-ts/core';
import { customCredentialBindingResolver } from '../offerResolve';
import { extractOpenId4VcCredentialMetadata, getRefreshCredentialMetadata, setOpenId4VcCredentialMetadata, setRefreshCredentialMetadata, } from '../metadata';
import { RefreshStatus } from './types';
export async function reissueCredentialWithAccessToken({ agent, logger, record, tokenResponse, clientId, pidSchemes, }) {
    if (!record) {
        throw new Error('No credential record provided for re-issuance.');
    }
    const refreshMetaData = getRefreshCredentialMetadata(record);
    if (!refreshMetaData) {
        throw new Error('No refresh metadata found on the record for re-issuance.');
    }
    const { credentialConfigurationId, resolvedCredentialOffer } = refreshMetaData;
    if (!resolvedCredentialOffer) {
        throw new Error('No resolved credential offer found in the refresh metadata for re-issuance.');
    }
    if (!tokenResponse.access_token) {
        throw new Error('No access token found in the token response for re-issuance.');
    }
    logger.info('*** Starting to get new credential via re-issuance flow ***');
    // Request a **new** credential using the *existing* configuration id
    const creds = await agent.modules.openId4VcHolder.requestCredentials({
        resolvedCredentialOffer,
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type || 'Bearer',
        cNonce: tokenResponse.c_nonce,
        clientId,
        credentialsToRequest: [credentialConfigurationId],
        verifyCredentialStatus: false, // you’ll check after storing
        allowedProofOfPossessionSignatureAlgorithms: [JwaSignatureAlgorithm.EdDSA, JwaSignatureAlgorithm.ES256],
        credentialBindingResolver: async (opts) => customCredentialBindingResolver({
            agent,
            supportedDidMethods: opts.supportedDidMethods,
            keyType: opts.keyType,
            supportsAllDidMethods: opts.supportsAllDidMethods,
            supportsJwk: opts.supportsJwk,
            credentialFormat: opts.credentialFormat,
            supportedCredentialId: opts.supportedCredentialId,
            resolvedCredentialOffer: resolvedCredentialOffer,
            pidSchemes,
        }),
    });
    logger.info('*** New credential received via re-issuance flow ***.');
    // Normalize to your local record types
    const [firstCredential] = creds;
    if (!firstCredential || typeof firstCredential === 'string') {
        throw new Error('Issuer returned empty or malformed credential on re-issuance.');
    }
    let newRecord;
    if ('compact' in firstCredential.credential) {
        newRecord = new SdJwtVcRecord({ compactSdJwtVc: firstCredential.credential.compact });
    }
    else if (firstCredential?.credential instanceof Mdoc) {
        newRecord = new MdocRecord({ mdoc: firstCredential.credential });
    }
    else {
        newRecord = new W3cCredentialRecord({
            credential: firstCredential.credential,
            tags: {},
        });
    }
    const openId4VcMetadata = extractOpenId4VcCredentialMetadata(resolvedCredentialOffer.offeredCredentials[0], {
        id: resolvedCredentialOffer.metadata.issuer,
        display: resolvedCredentialOffer.metadata.credentialIssuerMetadata.display,
    });
    setOpenId4VcCredentialMetadata(newRecord, openId4VcMetadata);
    setRefreshCredentialMetadata(newRecord, {
        ...refreshMetaData,
        refreshToken: tokenResponse.refresh_token || refreshMetaData.refreshToken,
        lastCheckedAt: Date.now(),
        lastCheckResult: RefreshStatus.Valid,
    });
    return newRecord;
}
