import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAgent } from '@credo-ts/react-hooks';
import { WebRTCEvents } from '@ajna-inc/webrtc';
import { Screens } from '../types/navigators';
/**
 * Global hook to handle incoming WebRTC calls.
 * Should be used in a top-level component (e.g., App or TabStack) to ensure
 * incoming calls are handled regardless of which screen the user is on.
 *
 * @example
 * ```tsx
 * // In your main App or TabStack component:
 * function MainApp() {
 *   useIncomingCallHandler({
 *     enabled: true,
 *     onIncomingCall: (event) => {
 *       // Handle incoming call notification
 *     },
 *   })
 *
 *   return <Navigator />
 * }
 * ```
 */
export function useIncomingCallHandler(options = {}) {
    const { enabled = true, onIncomingCall } = options;
    const { agent } = useAgent();
    const navigation = useNavigation();
    const handledThreadIds = useRef(new Set());
    useEffect(() => {
        if (!agent || !enabled)
            return;
        // Check if WebRTC module is available
        const agentModules = agent?.modules;
        if (!agentModules?.webrtc) {
            return;
        }
        let subscription;
        try {
            // NOTE: Events are emitted with { type, payload: { thid, sdp, context, ... } } structure
            subscription = agent.events.on(WebRTCEvents.IncomingOffer, ((event) => {
                const payload = event.payload || event; // Support both payload-wrapped and direct access
                const connectionId = payload?.context?.connection?.id;
                if (!connectionId) {
                    return;
                }
                // Prevent handling the same offer multiple times
                if (handledThreadIds.current.has(payload.thid)) {
                    return;
                }
                handledThreadIds.current.add(payload.thid);
                // Clean up old thread IDs after 30 seconds
                setTimeout(() => {
                    handledThreadIds.current.delete(payload.thid);
                }, 30000);
                // Call the optional callback with the unwrapped payload
                onIncomingCall?.(payload);
                // Navigate to incoming call screen
                navigation.navigate(Screens.IncomingCall, {
                    connectionId,
                    threadId: payload.thid,
                    sdp: payload.sdp,
                    callerLabel: payload.context?.connection?.theirLabel,
                    iceServers: payload.iceServers,
                });
            }));
        }
        catch {
            return;
        }
        return () => {
            try {
                subscription?.off?.();
            }
            catch { /* cleanup error */ }
        };
    }, [agent, enabled, navigation, onIncomingCall]);
}
