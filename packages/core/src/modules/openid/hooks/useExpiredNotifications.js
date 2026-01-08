// modules/openid/hooks/useExpiredNotifications.ts
import { useCallback, useEffect, useState } from 'react';
import { credentialRegistry } from '../refresh/registry';
import { OpenIDCustomNotificationType } from '../refresh/types';
import { TOKENS, useServices } from '../../../container-api';
import { useDeclineReplacement } from './useDeclineReplacement';
export const useExpiredNotifications = () => {
    const [items, setItems] = useState([]);
    const [logger] = useServices([TOKENS.UTIL_LOGGER]);
    const { declineByOldId } = useDeclineReplacement({ logger });
    const build = useCallback((s) => s.expired
        .filter((oldId) => s.checked.includes(oldId))
        .map((oldId) => {
        const lite = s.byId[oldId];
        const n = {
            type: OpenIDCustomNotificationType.CredentialExpired,
            title: 'Credential expired',
            pageTitle: 'Credential Expired',
            buttonTitle: 'Review',
            description: 'This credential is no longer valid. You can attempt to obtain an updated version.',
            createdAt: new Date(),
            onPressAction: () => { },
            onCloseAction: () => declineByOldId(oldId),
            component: () => null,
            metadata: {
                oldId,
                format: lite?.format,
            },
        };
        return n;
    }), [declineByOldId]);
    useEffect(() => {
        setItems(build(credentialRegistry.getState()));
        const unsub = credentialRegistry.subscribe((s) => setItems(build(s)));
        return unsub;
    }, [build]);
    return items;
};
