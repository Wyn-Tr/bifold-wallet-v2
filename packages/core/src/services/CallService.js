import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream, } from 'react-native-webrtc';
import { WebRTCEvents } from '@ajna-inc/webrtc';
export class CallService {
    agent;
    // Using 'any' because react-native-webrtc types don't include all WebRTC event handlers
    pc = null;
    localStream = null;
    remoteStream = null;
    connectionId = null;
    threadId = null;
    state = 'idle';
    eventSubscriptions = [];
    pendingIceCandidates = [];
    hasRemoteDescription = false;
    onStateChange;
    onLocalStream;
    onRemoteStream;
    onError;
    constructor(options) {
        this.agent = options.agent;
        this.onStateChange = options.onStateChange;
        this.onLocalStream = options.onLocalStream;
        this.onRemoteStream = options.onRemoteStream;
        this.onError = options.onError;
        // Validate agent has webrtc module
        if (!this.agent?.modules?.webrtc) {
            throw new Error('WebRTC module not configured in agent');
        }
        this.subscribeToEvents();
    }
    subscribeToEvents() {
        try {
            // Subscribe to WebRTC events from agent
            // NOTE: Events are emitted with { type, payload: { thid, sdp, ... } } structure
            const answerSub = this.agent.events.on(WebRTCEvents.IncomingAnswer, async (event) => {
                const payload = event.payload || event; // Support both payload-wrapped and direct access
                if (payload?.thid === this.threadId && this.pc) {
                    try {
                        await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }));
                        this.hasRemoteDescription = true;
                        await this.processPendingIceCandidates();
                        this.setState('connected');
                    }
                    catch (err) {
                        this.onError?.(err);
                    }
                }
            });
            const iceSub = this.agent.events.on(WebRTCEvents.IncomingIce, async (event) => {
                const payload = event.payload || event; // Support both payload-wrapped and direct access
                if (payload?.thid === this.threadId && this.pc) {
                    try {
                        if (payload.candidate && !payload.endOfCandidates) {
                            const candidate = new RTCIceCandidate(payload.candidate);
                            if (this.hasRemoteDescription) {
                                await this.pc.addIceCandidate(candidate);
                            }
                            else {
                                this.pendingIceCandidates.push(candidate);
                            }
                        }
                    }
                    catch {
                        // ICE candidate error - ignored
                    }
                }
            });
            const endSub = this.agent.events.on(WebRTCEvents.CallEnded, (event) => {
                const payload = event.payload || event; // Support both payload-wrapped and direct access
                if (payload?.thid === this.threadId) {
                    this.cleanup();
                }
            });
            this.eventSubscriptions = [
                () => { try {
                    answerSub?.off?.();
                }
                catch { /* cleanup error */ } },
                () => { try {
                    iceSub?.off?.();
                }
                catch { /* cleanup error */ } },
                () => { try {
                    endSub?.off?.();
                }
                catch { /* cleanup error */ } },
            ];
        }
        catch (err) {
            this.onError?.(err);
        }
    }
    async processPendingIceCandidates() {
        if (this.pendingIceCandidates.length > 0 && this.pc) {
            for (const candidate of this.pendingIceCandidates) {
                try {
                    await this.pc.addIceCandidate(candidate);
                }
                catch {
                    // ICE candidate error - ignored
                }
            }
            this.pendingIceCandidates = [];
        }
    }
    setState(newState) {
        this.state = newState;
        this.onStateChange?.(newState);
    }
    getState() {
        return this.state;
    }
    async startCall(connectionId, video = true) {
        this.connectionId = connectionId;
        this.threadId = this.generateUUID();
        this.setState('calling');
        this.hasRemoteDescription = false;
        this.pendingIceCandidates = [];
        try {
            // Get local media
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: video ? { facingMode: 'user' } : false,
            });
            this.onLocalStream?.(this.localStream);
            // Create peer connection with ICE servers from module
            const iceServers = this.agent.modules.webrtc.getDefaultIceServers();
            this.pc = new RTCPeerConnection({ iceServers });
            // Add local tracks
            this.localStream.getTracks().forEach((track) => {
                this.pc.addTrack(track, this.localStream);
            });
            // Handle remote tracks (for startCall - we're the caller)
            this.pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    const stream = event.streams[0];
                    this.remoteStream = stream;
                    this.onRemoteStream?.(this.remoteStream);
                }
                else if (event.track) {
                    // Fallback: create stream from track if no stream provided
                    if (!this.remoteStream) {
                        this.remoteStream = new MediaStream();
                    }
                    this.remoteStream.addTrack(event.track);
                    this.onRemoteStream?.(this.remoteStream);
                }
            };
            // Handle ICE candidates
            this.pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    try {
                        await this.agent.modules.webrtc.sendIce({
                            connectionId: this.connectionId,
                            threadId: this.threadId,
                            candidate: event.candidate.toJSON(),
                        });
                    }
                    catch {
                        // ICE send error - ignored
                    }
                }
                else {
                    await this.agent.modules.webrtc.sendIce({
                        connectionId: this.connectionId,
                        threadId: this.threadId,
                        endOfCandidates: true,
                    });
                }
            };
            // Monitor ICE connection state
            this.pc.oniceconnectionstatechange = () => {
                if (this.pc?.iceConnectionState === 'connected' || this.pc?.iceConnectionState === 'completed') {
                    this.setState('connected');
                }
                else if (this.pc?.iceConnectionState === 'failed') {
                    this.onError?.(new Error('ICE connection failed'));
                }
            };
            // Monitor overall connection state
            this.pc.onconnectionstatechange = () => {
                if (this.pc?.connectionState === 'connected') {
                    this.setState('connected');
                }
                else if (this.pc?.connectionState === 'failed') {
                    this.cleanup();
                }
            };
            // Create and send offer
            const offer = await this.pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: video,
            });
            await this.pc.setLocalDescription(offer);
            await this.agent.modules.webrtc.startCall({
                connectionId,
                threadId: this.threadId,
                sdp: offer.sdp,
                iceServers: iceServers, // Send ICE servers so callee can use TURN
            });
            return this.threadId;
        }
        catch (err) {
            this.cleanup();
            throw err;
        }
    }
    async acceptCall(connectionId, threadId, remoteSdp, video = true, callerIceServers) {
        this.connectionId = connectionId;
        this.threadId = threadId;
        this.setState('ringing');
        this.hasRemoteDescription = false;
        this.pendingIceCandidates = [];
        try {
            // Get local media
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: video ? { facingMode: 'user' } : false,
            });
            this.onLocalStream?.(this.localStream);
            // Create peer connection - use caller's ICE servers if provided (includes TURN)
            const defaultIceServers = this.agent.modules.webrtc.getDefaultIceServers();
            const iceServers = callerIceServers && callerIceServers.length > 0 ? callerIceServers : defaultIceServers;
            this.pc = new RTCPeerConnection({ iceServers });
            // Add local tracks
            this.localStream.getTracks().forEach((track) => {
                this.pc.addTrack(track, this.localStream);
            });
            // Handle remote tracks (for acceptCall - we're the callee)
            this.pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    this.remoteStream = event.streams[0];
                    this.onRemoteStream?.(this.remoteStream);
                }
                else if (event.track) {
                    if (!this.remoteStream) {
                        this.remoteStream = new MediaStream();
                    }
                    this.remoteStream.addTrack(event.track);
                    this.onRemoteStream?.(this.remoteStream);
                }
            };
            // Handle ICE candidates
            this.pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    try {
                        await this.agent.modules.webrtc.sendIce({
                            connectionId: this.connectionId,
                            threadId: this.threadId,
                            candidate: event.candidate.toJSON(),
                        });
                    }
                    catch {
                        // ICE send error - ignored
                    }
                }
                else {
                    await this.agent.modules.webrtc.sendIce({
                        connectionId: this.connectionId,
                        threadId: this.threadId,
                        endOfCandidates: true,
                    });
                }
            };
            // Monitor connection state
            this.pc.oniceconnectionstatechange = () => {
                if (this.pc?.iceConnectionState === 'connected' || this.pc?.iceConnectionState === 'completed') {
                    this.setState('connected');
                }
                else if (this.pc?.iceConnectionState === 'failed') {
                    this.onError?.(new Error('ICE connection failed'));
                }
            };
            this.pc.onconnectionstatechange = () => {
                if (this.pc?.connectionState === 'failed') {
                    this.cleanup();
                }
            };
            // Set remote description (offer)
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: remoteSdp }));
            this.hasRemoteDescription = true;
            await this.processPendingIceCandidates();
            // Create and send answer
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await this.agent.modules.webrtc.acceptCall({
                connectionId,
                threadId,
                sdp: answer.sdp,
            });
        }
        catch (err) {
            this.cleanup();
            throw err;
        }
    }
    async endCall() {
        if (this.connectionId && this.threadId) {
            try {
                await this.agent.modules.webrtc.endCall({
                    connectionId: this.connectionId,
                    threadId: this.threadId,
                    reason: 'hangup',
                });
            }
            catch {
                // End call error - ignored
            }
        }
        this.cleanup();
    }
    toggleMute() {
        const audioTrack = this.localStream?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return !audioTrack.enabled;
        }
        return false;
    }
    toggleCamera() {
        const videoTrack = this.localStream?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            return !videoTrack.enabled;
        }
        return false;
    }
    async switchCamera() {
        const videoTrack = this.localStream?.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack._switchCamera === 'function') {
            await videoTrack._switchCamera();
        }
    }
    cleanup() {
        this.setState('ended');
        // Stop local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach((t) => {
                try {
                    t.stop();
                }
                catch { /* track stop error */ }
            });
            this.localStream = null;
        }
        // Close peer connection
        if (this.pc) {
            try {
                this.pc.close();
            }
            catch { /* pc close error */ }
            this.pc = null;
        }
        this.remoteStream = null;
        this.connectionId = null;
        this.threadId = null;
        this.hasRemoteDescription = false;
        this.pendingIceCandidates = [];
        // Reset to idle after cleanup
        setTimeout(() => this.setState('idle'), 100);
    }
    destroy() {
        this.eventSubscriptions.forEach((unsub) => unsub());
        this.eventSubscriptions = [];
        this.cleanup();
    }
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
