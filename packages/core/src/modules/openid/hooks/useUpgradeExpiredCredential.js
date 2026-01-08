// modules/openid/hooks/useUpgradeExpiredCredential.ts
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAgent } from '@credo-ts/react-hooks';
import { Screens, Stacks } from '../../../types/navigators';
import { refreshAccessToken } from '../refresh/refreshToken';
import { reissueCredentialWithAccessToken } from '../refresh/reIssuance';
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider';
import { credentialRegistry } from '../refresh/registry';
import { TOKENS, useServices } from '../../../container-api';
export const useUpgradeExpiredCredential = () => {
    const navigation = useNavigation();
    const { agent } = useAgent();
    const { getSdJwtCredentialById } = useOpenIDCredentials();
    const [logger] = useServices([TOKENS.UTIL_LOGGER]);
    const upgrade = useCallback(async (oldId) => {
        if (!agent) {
            logger?.warn('⚠️ [Upgrade] Agent not ready, cannot upgrade credential');
            return;
        }
        logger?.info(`🔁 [Upgrade] Starting upgrade flow for oldId=${oldId}`);
        // 1. Load the “old” record
        const byId = credentialRegistry.getState().byId[oldId];
        if (!byId) {
            logger?.warn(`⚠️ [Upgrade] No lite record for oldId=${oldId}`);
            return;
        }
        // We try all three repos – you can refine this using byId.format if you want
        const rec = await getSdJwtCredentialById(oldId);
        if (!rec) {
            logger?.warn(`⚠️ [Upgrade] No full record found for oldId=${oldId}`);
            return;
        }
        // 2. Use refresh token to get new access token
        const token = await refreshAccessToken({ logger, cred: rec, agentContext: agent.context });
        if (!token) {
            logger?.warn(`⚠️ [Upgrade] No refresh token available for oldId=${oldId}`);
            return;
        }
        // 3. Re-issue credential using access token
        const newRecord = await reissueCredentialWithAccessToken({
            agent,
            logger,
            record: rec,
            tokenResponse: token,
        });
        if (!newRecord) {
            logger?.warn(`⚠️ [Upgrade] Re-issue returned no record for oldId=${oldId}`);
            return;
        }
        logger?.info(`💾 [Upgrade] New credential issued ${newRecord.id} from oldId=${oldId}`);
        // 4. Update registry mapping old -> new (so offer screen can resolve)
        credentialRegistry.getState().markExpiredWithReplacement(oldId, {
            id: newRecord.id,
            format: byId.format,
            createdAt: newRecord.createdAt?.toISOString(),
            issuer: byId.issuer,
        });
        // 5. Navigate to the OpenID offer screen, passing the new record directly
        navigation.navigate(Stacks.ConnectionStack, {
            screen: Screens.OpenIDCredentialOffer,
            params: {
                credential: newRecord,
            },
        });
    }, [agent, logger, navigation, getSdJwtCredentialById]);
    return { upgrade };
};
