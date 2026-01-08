import { useEffect, useRef } from 'react';
import { useAgent } from '@credo-ts/react-hooks';
import { WebRTCEvents } from '@ajna-inc/webrtc';
/**
 * Hook to subscribe to WebRTC signaling events from the agent.
 *
 * @example
 * ```tsx
 * useWebRTCEvents({
 *   onIncomingOffer: (event) => {
 *     // Show incoming call UI
 *     navigation.navigate('IncomingCall', {
 *       connectionId: event.context.connection?.id,
 *       threadId: event.thid,
 *       sdp: event.sdp,
 *     })
 *   },
 *   onCallEnded: (event) => {
 *     // Handle call ended
 *   },
 * })
 * ```
 */
export function useWebRTCEvents(options) {
    const { agent } = useAgent();
    const optionsRef = useRef(options);
    optionsRef.current = options;
    useEffect(() => {
        if (!agent)
            return;
        const subscriptions = [];
        // Incoming propose (call request before offer)
        if (optionsRef.current.onIncomingPropose) {
            const sub = agent.events.on(WebRTCEvents.IncomingPropose, ((event) => {
                if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId)
                    return;
                optionsRef.current.onIncomingPropose?.(event);
            }));
            subscriptions.push(sub);
        }
        // Incoming offer (SDP offer)
        if (optionsRef.current.onIncomingOffer) {
            const sub = agent.events.on(WebRTCEvents.IncomingOffer, ((event) => {
                if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId)
                    return;
                optionsRef.current.onIncomingOffer?.(event);
            }));
            subscriptions.push(sub);
        }
        // Incoming answer (SDP answer)
        if (optionsRef.current.onIncomingAnswer) {
            const sub = agent.events.on(WebRTCEvents.IncomingAnswer, ((event) => {
                if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId)
                    return;
                optionsRef.current.onIncomingAnswer?.(event);
            }));
            subscriptions.push(sub);
        }
        // Incoming ICE candidate
        if (optionsRef.current.onIncomingIce) {
            const sub = agent.events.on(WebRTCEvents.IncomingIce, ((event) => {
                if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId)
                    return;
                optionsRef.current.onIncomingIce?.(event);
            }));
            subscriptions.push(sub);
        }
        // Renegotiation requested
        if (optionsRef.current.onRenegotiateRequested) {
            const sub = agent.events.on(WebRTCEvents.RenegotiateRequested, ((event) => {
                if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId)
                    return;
                optionsRef.current.onRenegotiateRequested?.(event);
            }));
            subscriptions.push(sub);
        }
        // Call ended
        if (optionsRef.current.onCallEnded) {
            const sub = agent.events.on(WebRTCEvents.CallEnded, ((event) => {
                if (optionsRef.current.threadId && event.thid !== optionsRef.current.threadId)
                    return;
                optionsRef.current.onCallEnded?.(event);
            }));
            subscriptions.push(sub);
        }
        return () => {
            subscriptions.forEach((sub) => { try {
                sub?.off?.();
            }
            catch { /* cleanup error */ } });
        };
    }, [agent]);
}
