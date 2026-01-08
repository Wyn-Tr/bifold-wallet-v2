/**
 * SendProofRequestAction
 *
 * Chat action for sending proof requests to a connection.
 */
import React from 'react';
import { Screens, Stacks } from '../../../types/navigators';
/**
 * Create the Send Proof Request action
 *
 * This action is only available when verifier capability is enabled.
 */
export function createSendProofRequestAction(context, useVerifierCapability, IconComponent) {
    if (!useVerifierCapability) {
        return undefined;
    }
    return {
        id: 'send-proof-request',
        text: context.t('Verifier.SendProofRequest'),
        icon: () => <IconComponent height={30} width={30}/>,
        onPress: () => {
            context.navigation.navigate(Stacks.ProofRequestsStack, {
                screen: Screens.ProofRequests,
                params: { connectionId: context.connectionId },
            });
        },
    };
}
/**
 * Factory function that returns an action factory for use with the registry
 */
export function sendProofRequestActionFactory(useVerifierCapability, IconComponent) {
    return (context) => createSendProofRequestAction(context, useVerifierCapability, IconComponent);
}
