import { useState, useCallback, useRef, useEffect } from 'react';
import { useAgent } from '@credo-ts/react-hooks';
import { CallService } from '../services/CallService';
/**
 * React hook for managing WebRTC video/audio calls.
 *
 * @example
 * ```tsx
 * const {
 *   callState,
 *   localStream,
 *   remoteStream,
 *   startCall,
 *   endCall,
 *   toggleMute,
 * } = useCallService()
 *
 * // Start a video call
 * const threadId = await startCall(connectionId, true)
 *
 * // Display streams
 * <RTCView streamURL={localStream?.toURL()} />
 * <RTCView streamURL={remoteStream?.toURL()} />
 *
 * // End call
 * await endCall()
 * ```
 */
export function useCallService() {
    const { agent } = useAgent();
    const [callState, setCallState] = useState('idle');
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const serviceRef = useRef(null);
    useEffect(() => {
        if (agent && !serviceRef.current) {
            // Check if WebRTC module is available
            const bifoldAgent = agent;
            if (!bifoldAgent?.modules?.webrtc) {
                return;
            }
            try {
                serviceRef.current = new CallService({
                    agent: bifoldAgent,
                    onStateChange: (state) => {
                        setCallState(state);
                        // Reset mute/camera states when call ends
                        if (state === 'idle') {
                            setIsMuted(false);
                            setIsCameraOff(false);
                            setLocalStream(null);
                            setRemoteStream(null);
                        }
                    },
                    onLocalStream: (stream) => {
                        setLocalStream(stream);
                    },
                    onRemoteStream: (stream) => {
                        setRemoteStream(stream);
                    },
                    onError: () => {
                        // Error handled via state change
                    },
                });
            }
            catch {
                // Failed to create CallService - agent may not be ready
            }
        }
        return () => {
            if (serviceRef.current) {
                try {
                    serviceRef.current.destroy();
                }
                catch { /* cleanup error */ }
                serviceRef.current = null;
            }
        };
    }, [agent]);
    const startCall = useCallback(async (connectionId, video = true) => {
        if (!serviceRef.current) {
            throw new Error('CallService not initialized - agent may not be ready');
        }
        return serviceRef.current.startCall(connectionId, video);
    }, []);
    const acceptCall = useCallback(async (connectionId, threadId, sdp, video = true, iceServers) => {
        if (!serviceRef.current) {
            throw new Error('CallService not initialized - agent may not be ready');
        }
        return serviceRef.current.acceptCall(connectionId, threadId, sdp, video, iceServers);
    }, []);
    const endCall = useCallback(async () => {
        if (!serviceRef.current)
            return;
        await serviceRef.current.endCall();
    }, []);
    const toggleMute = useCallback(() => {
        if (!serviceRef.current)
            return;
        const muted = serviceRef.current.toggleMute();
        setIsMuted(muted);
    }, []);
    const toggleCamera = useCallback(() => {
        if (!serviceRef.current)
            return;
        const off = serviceRef.current.toggleCamera();
        setIsCameraOff(off);
    }, []);
    const switchCamera = useCallback(async () => {
        if (!serviceRef.current)
            return;
        await serviceRef.current.switchCamera();
    }, []);
    const isInCall = callState === 'calling' || callState === 'ringing' || callState === 'connected';
    return {
        callState,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        startCall,
        acceptCall,
        endCall,
        toggleMute,
        toggleCamera,
        switchCamera,
        isInCall,
    };
}
