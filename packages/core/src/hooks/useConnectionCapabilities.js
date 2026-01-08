import { useState, useEffect, useCallback, useRef } from 'react';
import { useAgent } from '@credo-ts/react-hooks';
/**
 * Known protocol URIs for capability checking
 */
export const ProtocolURIs = {
    WebRTC: 'https://didcomm.org/webrtc/1.0',
    Workflow: 'https://didcomm.org/workflow/1.0',
    BasicMessage: 'https://didcomm.org/basicmessage/2.0',
    Credentials: 'https://didcomm.org/issue-credential/2.0',
    Proofs: 'https://didcomm.org/present-proof/2.0',
};
/**
 * Cache for connection capabilities to avoid repeated queries
 */
const capabilityCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Hook to discover and check capabilities of a connection.
 * Uses DIDComm Discover Features protocol (RFC 0557) to query supported protocols.
 *
 * @param connectionId - The connection ID to check capabilities for
 * @param options - Configuration options
 * @returns Connection capabilities and refresh function
 *
 * @example
 * ```tsx
 * const { capabilities, refresh } = useConnectionCapabilities(connectionId)
 *
 * // Only show call button if WebRTC is supported
 * {capabilities.supportsWebRTC && (
 *   <TouchableOpacity onPress={startCall}>
 *     <Icon name="video" />
 *   </TouchableOpacity>
 * )}
 * ```
 */
export function useConnectionCapabilities(connectionId, options = {}) {
    const { autoFetch = true, timeoutMs = 5000, useCache = true } = options;
    const { agent } = useAgent();
    const fetchedRef = useRef(false);
    const [capabilities, setCapabilities] = useState({
        supportsWebRTC: false,
        supportsWorkflow: false,
        supportsBasicMessage: false,
        protocols: [],
        isLoaded: false,
        isLoading: false,
        error: null,
    });
    /**
     * Query the connection for supported protocols
     */
    const discoverCapabilities = useCallback(async (skipCache = false) => {
        if (!agent || !connectionId) {
            return;
        }
        // Check cache first
        if (useCache && !skipCache) {
            const cached = capabilityCache.get(connectionId);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
                setCapabilities(cached.capabilities);
                return;
            }
        }
        setCapabilities((prev) => ({ ...prev, isLoading: true, error: null }));
        try {
            // Use V2 Discover Features protocol to query all protocols
            const result = await agent.discovery.queryFeatures({
                connectionId,
                protocolVersion: 'v2',
                queries: [
                    { featureType: 'protocol', match: '*' }, // Query all protocols
                ],
                awaitDisclosures: true,
                awaitDisclosuresTimeoutMs: timeoutMs,
            });
            const features = result.features || [];
            const protocols = features.filter((f) => f.type === 'protocol').map((f) => f.id);
            const newCapabilities = {
                supportsWebRTC: protocols.some((p) => p.startsWith('https://didcomm.org/webrtc/')),
                supportsWorkflow: protocols.some((p) => p.startsWith('https://didcomm.org/workflow/')),
                supportsBasicMessage: protocols.some((p) => p.includes('basicmessage')),
                protocols,
                isLoaded: true,
                isLoading: false,
                error: null,
            };
            setCapabilities(newCapabilities);
            // Update cache
            capabilityCache.set(connectionId, {
                capabilities: newCapabilities,
                timestamp: Date.now(),
            });
        }
        catch (err) {
            // On error, assume basic capabilities (fallback for older agents)
            const fallbackCapabilities = {
                supportsWebRTC: false, // Conservative default
                supportsWorkflow: false,
                supportsBasicMessage: true, // Most agents support this
                protocols: [],
                isLoaded: true,
                isLoading: false,
                error: err,
            };
            setCapabilities(fallbackCapabilities);
        }
    }, [agent, connectionId, timeoutMs, useCache]);
    /**
     * Refresh capabilities (bypasses cache)
     */
    const refresh = useCallback(async () => {
        await discoverCapabilities(true);
    }, [discoverCapabilities]);
    /**
     * Check if a specific protocol is supported
     */
    const checkProtocol = useCallback((protocolUri) => {
        return capabilities.protocols.some((p) => p === protocolUri || p.startsWith(protocolUri.replace(/\/\d+\.\d+$/, '/')));
    }, [capabilities.protocols]);
    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && connectionId && !fetchedRef.current) {
            fetchedRef.current = true;
            discoverCapabilities();
        }
    }, [autoFetch, connectionId, discoverCapabilities]);
    // Reset when connection changes
    useEffect(() => {
        fetchedRef.current = false;
        setCapabilities({
            supportsWebRTC: false,
            supportsWorkflow: false,
            supportsBasicMessage: false,
            protocols: [],
            isLoaded: false,
            isLoading: false,
            error: null,
        });
    }, [connectionId]);
    return {
        capabilities,
        refresh,
        checkProtocol,
    };
}
/**
 * Utility function to check WebRTC support for a connection (non-hook version)
 * Useful for one-time checks or in non-React contexts
 */
export async function checkWebRTCSupport(agent, connectionId, timeoutMs = 5000) {
    // Check cache first
    const cached = capabilityCache.get(connectionId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.capabilities.supportsWebRTC;
    }
    try {
        const result = await agent.discovery.queryFeatures({
            connectionId,
            protocolVersion: 'v2',
            queries: [{ featureType: 'protocol', match: 'https://didcomm.org/webrtc/*' }],
            awaitDisclosures: true,
            awaitDisclosuresTimeoutMs: timeoutMs,
        });
        const hasWebRTC = (result.features || []).some((f) => f.type === 'protocol' && f.id.startsWith('https://didcomm.org/webrtc/'));
        return hasWebRTC;
    }
    catch {
        return false;
    }
}
/**
 * Clear the capability cache for a specific connection or all connections
 */
export function clearCapabilityCache(connectionId) {
    if (connectionId) {
        capabilityCache.delete(connectionId);
    }
    else {
        capabilityCache.clear();
    }
}
