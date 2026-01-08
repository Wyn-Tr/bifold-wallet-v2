import { useCallback } from 'react';
import { TOKENS, useServices } from '../../../container-api';
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider';
import { credentialRegistry, selectOldIdByReplacementId } from '../refresh/registry';
import { OpenIDCredentialType } from '../types';
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
/**
 * A hook that provides functions to accept newly issued credentials, handling replacements if applicable.
 */
export function useAcceptReplacement() {
    const { storeCredential, removeCredential, getW3CCredentialById, getSdJwtCredentialById } = useOpenIDCredentials();
    const [logger] = useServices([TOKENS.UTIL_LOGGER]);
    /**
     * Accept a newly issued credential:
     * 1) store it
     * 2) if it replaces an old one (per registry), fetch old via provider & delete it
     * 3) update the registry (acceptReplacement)
     */
    const acceptNewCredential = useCallback(async (newCred) => {
        logger.info(`🟢 [useAcceptReplacement] accepting new credential → ${newCred.id}`);
        // 1) persist new
        await storeCredential(newCred);
        // 2) check if it replaces an old credential
        const oldId = selectOldIdByReplacementId(newCred.id);
        if (!oldId) {
            logger.info(`ℹ️ [useAcceptReplacement] no replacement mapping for ${newCred.id} — done`);
            return;
        }
        // 3) fetch old via provider (always)
        const oldRecord = await getSdJwtCredentialById(oldId);
        if (!oldRecord) {
            logger.warn(`⚠️ [useAcceptReplacement] old record ${oldId} not found — skipping delete`);
            // still accept swap in registry to avoid stuck state
            credentialRegistry.getState().acceptReplacement(oldId);
            return;
        }
        await sleep(200);
        // 4) delete old
        await removeCredential(oldRecord, OpenIDCredentialType.SdJwtVc);
        // 5) finalize the swap in registry
        credentialRegistry.getState().acceptReplacement(oldId);
        logger.info(`✅ [useAcceptReplacement] replacement complete: old=${oldId} → new=${newCred.id}`);
    }, [storeCredential, removeCredential, getSdJwtCredentialById, logger]);
    /**
     * Convenience: accept by new credential id (fetch via provider first).
     * Useful if your screen only carries the new id.
     */
    const acceptById = useCallback(async (newId) => {
        // try W3C first, then Sd-JWT
        const newW3c = await getW3CCredentialById(newId);
        const newSd = newW3c ? undefined : await getSdJwtCredentialById(newId);
        const rec = (newW3c ?? newSd);
        if (!rec)
            throw new Error(`New credential not found for id=${newId}`);
        await acceptNewCredential(rec);
    }, [getW3CCredentialById, getSdJwtCredentialById, acceptNewCredential]);
    return { acceptNewCredential, acceptById };
}
