import { useAgent } from '@credo-ts/react-hooks';
import { useServices, TOKENS } from '../../container-api';
export var NotificationEventType;
(function (NotificationEventType) {
    NotificationEventType["CREDENTIAL_ACCEPTED"] = "credential_accepted";
    NotificationEventType["CREDENTIAL_DELETED"] = "credential_deleted";
    NotificationEventType["CREDENTIAL_FAILURE"] = "credential_failure";
})(NotificationEventType || (NotificationEventType = {}));
export const useOpenId4VciNotifications = () => {
    const { agent } = useAgent();
    const [logger] = useServices([TOKENS.UTIL_LOGGER, TOKENS.UTIL_OCA_RESOLVER]);
    /**
     * Sends notification to issuer with credential status.
     * @param options
     */
    const sendOpenId4VciNotification = async (options) => {
        if (!agent) {
            const error = 'Agent undefined!';
            logger.error(`[OpenIDCredentialNotification] ${error}`);
            throw new Error(error);
        }
        await agent.modules.openId4VcHolder.sendNotification({
            notificationMetadata: options?.notificationMetadata,
            accessToken: options?.accessToken,
            notificationEvent: options?.notificationEvent,
        });
    };
    return {
        sendOpenId4VciNotification,
    };
};
