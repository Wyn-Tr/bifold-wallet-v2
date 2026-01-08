import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrandingOverlay } from '@bifold/oca';
import { BrandingOverlayType } from '@bifold/oca/build/legacy';
import { ClaimFormat, MdocRecord, MdocRepository, SdJwtVcRecord, SdJwtVcRepository, W3cCredentialRecord, W3cCredentialRepository, } from '@credo-ts/core';
import { useAgent } from '@credo-ts/react-hooks';
import { recordsAddedByType, recordsRemovedByType } from '@credo-ts/react-hooks/build/recordUtils';
import { useTranslation } from 'react-i18next';
import { TOKENS, useServices } from '../../../container-api';
import { buildFieldsFromW3cCredsCredential } from '../../../utils/oca';
import { getCredentialForDisplay } from '../display';
import { OpenIDCredentialType } from '../types';
const addW3cRecord = (record, state) => {
    const newRecordsState = [...state.w3cCredentialRecords];
    newRecordsState.unshift(record);
    return {
        ...state,
        w3cCredentialRecords: newRecordsState,
    };
};
const removeW3cRecord = (record, state) => {
    const newRecordsState = [...state.w3cCredentialRecords];
    const index = newRecordsState.findIndex((r) => r.id === record.id);
    if (index > -1) {
        newRecordsState.splice(index, 1);
    }
    return {
        ...state,
        w3cCredentialRecords: newRecordsState,
    };
};
const addSdJwtRecord = (record, state) => {
    const newRecordsState = [...state.sdJwtVcRecords];
    newRecordsState.unshift(record);
    return {
        ...state,
        sdJwtVcRecords: newRecordsState,
    };
};
const removeSdJwtRecord = (record, state) => {
    const newRecordsState = [...state.sdJwtVcRecords];
    const index = newRecordsState.findIndex((r) => r.id === record.id);
    if (index > -1) {
        newRecordsState.splice(index, 1);
    }
    return {
        ...state,
        sdJwtVcRecords: newRecordsState,
    };
};
const defaultState = {
    openIDCredentialRecords: [],
    w3cCredentialRecords: [],
    sdJwtVcRecords: [],
    mdocVcRecords: [],
    isLoading: true,
};
const OpenIDCredentialRecordContext = createContext(null);
const isW3CCredentialRecord = (record) => {
    return record.getTags()?.claimFormat === ClaimFormat.JwtVc;
};
const isSdJwtCredentialRecord = (record) => {
    return 'compactSdJwtVc' in record;
};
const filterW3CCredentialsOnly = (credentials) => {
    return credentials.filter((r) => isW3CCredentialRecord(r));
};
const filterSdJwtCredentialsOnly = (credentials) => {
    return credentials.filter((r) => isSdJwtCredentialRecord(r));
};
// eslint-disable-next-line react/prop-types
export const OpenIDCredentialRecordProvider = ({ children, }) => {
    const [state, setState] = useState(defaultState);
    const { agent } = useAgent();
    const [logger, bundleResolver] = useServices([TOKENS.UTIL_LOGGER, TOKENS.UTIL_OCA_RESOLVER]);
    const { i18n } = useTranslation();
    function checkAgent() {
        if (!agent) {
            const error = 'Agent undefined!';
            logger.error(`[OpenIDCredentialRecordProvider] ${error}`);
            throw new Error(error);
        }
    }
    async function getW3CCredentialById(id) {
        checkAgent();
        return await agent?.w3cCredentials.getCredentialRecordById(id);
    }
    async function getSdJwtCredentialById(id) {
        checkAgent();
        return await agent?.sdJwtVc.getById(id);
    }
    async function getMdocCredentialById(id) {
        checkAgent();
        return await agent?.mdoc.getById(id);
    }
    async function storeCredential(cred) {
        checkAgent();
        if (cred instanceof W3cCredentialRecord) {
            await agent?.dependencyManager.resolve(W3cCredentialRepository).save(agent.context, cred);
        }
        else if (cred instanceof SdJwtVcRecord) {
            await agent?.dependencyManager.resolve(SdJwtVcRepository).save(agent.context, cred);
        }
        else if (cred instanceof MdocRecord) {
            await agent?.dependencyManager.resolve(MdocRepository).save(agent.context, cred);
        }
    }
    async function deleteCredential(cred, type) {
        checkAgent();
        if (type === OpenIDCredentialType.W3cCredential) {
            await agent?.w3cCredentials.removeCredentialRecord(cred.id);
        }
        else if (type === OpenIDCredentialType.SdJwtVc) {
            await agent?.sdJwtVc.deleteById(cred.id);
        }
        else if (type === OpenIDCredentialType.Mdoc) {
            await agent?.mdoc.deleteById(cred.id);
        }
    }
    const resolveBundleForCredential = async (credential) => {
        const credentialDisplay = getCredentialForDisplay(credential);
        const params = {
            identifiers: {
                schemaId: '',
                credentialDefinitionId: credentialDisplay.id,
            },
            meta: {
                alias: credentialDisplay.display.issuer.name,
                credConnectionId: undefined,
                credName: credentialDisplay.display.name,
            },
            attributes: buildFieldsFromW3cCredsCredential(credentialDisplay),
            language: i18n.language,
        };
        const bundle = await bundleResolver.resolveAllBundles(params);
        const _bundle = bundle;
        const brandingOverlay = new BrandingOverlay('none', {
            capture_base: 'none',
            type: BrandingOverlayType.Branding10,
            primary_background_color: credentialDisplay.display.backgroundColor,
            background_image: credentialDisplay.display.backgroundImage?.url,
            logo: credentialDisplay.display.logo?.url,
        });
        const ocaBundle = {
            ..._bundle,
            presentationFields: bundle.presentationFields,
            brandingOverlay: brandingOverlay,
        };
        return ocaBundle;
    };
    useEffect(() => {
        if (!agent)
            return;
        agent.w3cCredentials?.getAllCredentialRecords().then((w3cCredentialRecords) => {
            setState((prev) => ({
                ...prev,
                w3cCredentialRecords: filterW3CCredentialsOnly(w3cCredentialRecords),
                isLoading: false,
            }));
        });
        agent.sdJwtVc?.getAll().then((creds) => {
            setState((prev) => ({
                ...prev,
                sdJwtVcRecords: filterSdJwtCredentialsOnly(creds),
                isLoading: false,
            }));
        });
    }, [agent]);
    useEffect(() => {
        if (state.isLoading)
            return;
        if (!agent?.events?.observable)
            return;
        const w3c_credentialAdded$ = recordsAddedByType(agent, W3cCredentialRecord).subscribe((record) => {
            //This handler will return ANY creds added to the wallet even DidComm
            //Sounds like a bug in the hooks package
            //This check will safe guard the flow untill a fix goes to the hooks
            if (isW3CCredentialRecord(record)) {
                setState(addW3cRecord(record, state));
            }
        });
        const w3c_credentialRemoved$ = recordsRemovedByType(agent, W3cCredentialRecord).subscribe((record) => {
            setState(removeW3cRecord(record, state));
        });
        const sdjwt_credentialAdded$ = recordsAddedByType(agent, SdJwtVcRecord).subscribe((record) => {
            //This handler will return ANY creds added to the wallet even DidComm
            //Sounds like a bug in the hooks package
            //This check will safe guard the flow untill a fix goes to the hooks
            setState(addSdJwtRecord(record, state));
            // if (isW3CCredentialRecord(record)) {
            //   setState(addW3cRecord(record, state))
            // }
        });
        const sdjwt_credentialRemoved$ = recordsRemovedByType(agent, SdJwtVcRecord).subscribe((record) => {
            setState(removeSdJwtRecord(record, state));
        });
        return () => {
            w3c_credentialAdded$.unsubscribe();
            w3c_credentialRemoved$.unsubscribe();
            sdjwt_credentialAdded$.unsubscribe();
            sdjwt_credentialRemoved$.unsubscribe();
        };
    }, [state, agent]);
    return (<OpenIDCredentialRecordContext.Provider value={{
            openIdState: state,
            storeCredential: storeCredential,
            removeCredential: deleteCredential,
            getW3CCredentialById: getW3CCredentialById,
            getSdJwtCredentialById: getSdJwtCredentialById,
            getMdocCredentialById: getMdocCredentialById,
            resolveBundleForCredential: resolveBundleForCredential,
        }}>
      {children}
    </OpenIDCredentialRecordContext.Provider>);
};
export const useOpenIDCredentials = () => useContext(OpenIDCredentialRecordContext);
