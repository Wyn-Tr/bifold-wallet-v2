// hooks/useOpenIdReplacementNavigation.ts
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { TOKENS, useServices } from '../../../container-api';
import { Screens, Stacks } from '../../../types/navigators';
/**
 * A hook that returns a function to open the OpenID Credential Offer screen for a replacement credential
 */
export function useOpenIdReplacementNavigation() {
    const navigation = useNavigation();
    const [orchestrator] = useServices([TOKENS.UTIL_REFRESH_ORCHESTRATOR]);
    const openReplacementOffer = useCallback((notif) => {
        const replacementId = notif?.metadata?.['replacementId'];
        //   const oldId = notif?.metadata?.['oldId'] as string | undefined
        if (!replacementId) {
            Toast.show({ type: 'error', text1: 'Missing replacement', text2: 'No replacementId in notification.' });
            return;
        }
        // Fetch the full record strictly from orchestrator’s in-memory cache
        const full = orchestrator.resolveFull(replacementId);
        if (!full) {
            // Keep it dead simple: no repo lookups here
            Toast.show({ type: 'info', text1: 'Preparing credential', text2: 'Please try again in a moment.' });
            return;
        }
        navigation.navigate(Stacks.ConnectionStack, {
            screen: Screens.OpenIDCredentialOffer,
            params: { credential: full },
        });
    }, [navigation, orchestrator]);
    return openReplacementOffer;
}
