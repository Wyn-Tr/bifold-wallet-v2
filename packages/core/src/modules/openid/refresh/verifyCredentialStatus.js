import { getListFromStatusListJWT, getStatusListFromJWT } from '@sd-jwt/jwt-status-list';
/**
 * Verifies credential status for Sd-JWT credentials using status lists.
 * Non–Sd-JWT credentials (W3C jwt_vc_json without status list, or mdoc) are treated as valid here.
 * Returns true if valid; false if revoked/invalid or on error.
 */
export async function verifyCredentialStatus(rec, logger) {
    try {
        // Only Sd-JWT creds have compactSdJwtVc in this codebase
        if (!('compactSdJwtVc' in rec))
            return true;
        logger?.info(`[Verifier] Verifying credential status for Sd-JWT credential: ${rec.id}`);
        const ref = getStatusListFromJWT(rec.compactSdJwtVc);
        const res = await fetch(ref.uri);
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const jwt = await res.text();
        const list = getListFromStatusListJWT(jwt);
        const ok = list.getStatus(ref.idx) === 0;
        logger?.info(`${ok ? '✅' : '❌'} [Verifier] ${rec.id} → ${ok ? 'valid' : 'revoked'}`);
        return ok;
    }
    catch (e) {
        logger?.error?.(`💥 [Verifier] ${'id' in rec ? rec.id : 'unknown'} verify failed: ${String(e)}`);
        return false;
    }
}
