/**
 * KanonOCABundleResolver
 *
 * Extends DefaultOCABundleResolver to fetch OCA overlays from Kanon ledger
 * via the backend API. Falls back to static bundles when ledger data is unavailable.
 */
import { DefaultOCABundleResolver, OCABundle, BrandingOverlayType, } from '@bifold/oca/build/legacy';
import { OverlayBundle, OverlayType } from '@bifold/oca/build/types';
export class KanonOCABundleResolver extends DefaultOCABundleResolver {
    apiBaseUrl;
    cacheTTL;
    apiCache = new Map();
    constructor(bundlesData = {}, options) {
        super(bundlesData, options);
        this.apiBaseUrl = options?.apiBaseUrl;
        this.cacheTTL = options?.cacheTTL ?? 5 * 60 * 1000; // 5 minutes default
    }
    /**
     * Check if a credential definition ID is a Kanon DID
     */
    isKanonCredDef(credDefId) {
        return !!credDefId?.includes('did:kanon');
    }
    /**
     * Fetch overlay from the Kanon backend API
     */
    async fetchOverlayFromApi(credDefId) {
        if (!this.apiBaseUrl) {
            this.log?.info('No API base URL configured, skipping Kanon overlay fetch');
            return undefined;
        }
        // Check cache first
        const cached = this.apiCache.get(credDefId);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            this.log?.info(`Using cached overlay for ${credDefId}`);
            return cached.overlay;
        }
        try {
            // Encode the credDefId for URL (it contains special characters like :, /)
            const encodedCredDefId = encodeURIComponent(credDefId);
            const url = `${this.apiBaseUrl}/credential-definitions/${encodedCredDefId}/overlay`;
            this.log?.info(`Fetching overlay from Kanon API: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    this.log?.info(`No overlay found for ${credDefId} on Kanon ledger`);
                    return undefined;
                }
                throw new Error(`API request failed with status ${response.status}`);
            }
            const data = await response.json();
            if (!data.success || !data.overlay) {
                this.log?.info(`No overlay data in API response for ${credDefId}`);
                return undefined;
            }
            // Convert API response to OCABundle format
            const overlayBundle = this.convertApiOverlayToBundle(credDefId, data.overlay);
            // Cache the result
            if (overlayBundle) {
                this.apiCache.set(credDefId, {
                    overlay: overlayBundle,
                    timestamp: Date.now(),
                });
            }
            return overlayBundle;
        }
        catch (error) {
            this.log?.error(`Failed to fetch overlay from Kanon API: ${error}`);
            return undefined;
        }
    }
    /**
     * Convert API overlay response to OCABundle format
     */
    convertApiOverlayToBundle(credDefId, overlay) {
        try {
            const overlays = [];
            // Add meta overlay if present
            if (overlay.meta) {
                const metaOverlay = {
                    capture_base: '',
                    type: OverlayType.Meta10,
                    name: overlay.meta.name || '',
                    description: overlay.meta.description || '',
                    issuer: overlay.meta.issuer || '',
                    issuer_url: overlay.meta.issuer_url || '',
                    issuer_description: overlay.meta.issuer_description || '',
                    language: 'en',
                    credential_help_text: '',
                    credential_support_url: '',
                };
                overlays.push(metaOverlay);
            }
            // Add branding overlay if present
            if (overlay.branding) {
                const brandingOverlay = {
                    capture_base: '',
                    type: this.getBrandingOverlayType() === BrandingOverlayType.Branding01
                        ? OverlayType.Branding01
                        : OverlayType.Branding10,
                    primary_background_color: overlay.branding.primary_background_color,
                    secondary_background_color: overlay.branding.secondary_background_color,
                    primary_attribute: overlay.branding.primary_attribute,
                    secondary_attribute: overlay.branding.secondary_attribute,
                    logo: overlay.branding.logo,
                    background_image: overlay.branding.background_image,
                };
                overlays.push(brandingOverlay);
            }
            if (overlays.length === 0) {
                return undefined;
            }
            const bundleData = {
                capture_base: {
                    attributes: {},
                    classification: '',
                    type: OverlayType.CaptureBase10,
                    flagged_attributes: [],
                },
                overlays,
            };
            return new OverlayBundle(credDefId, bundleData);
        }
        catch (error) {
            this.log?.error(`Failed to convert API overlay to bundle: ${error}`);
            return undefined;
        }
    }
    /**
     * Override resolve to first try static bundles, then Kanon API
     */
    async resolve(params) {
        // First try to resolve from static bundles
        const staticBundle = await super.resolve(params);
        if (staticBundle) {
            this.log?.info(`Resolved overlay from static bundle for ${params.identifiers.credentialDefinitionId}`);
            return staticBundle;
        }
        // If not found and it's a Kanon credential definition, try the API
        const credDefId = params.identifiers.credentialDefinitionId;
        if (this.isKanonCredDef(credDefId) && credDefId) {
            this.log?.info(`Attempting to fetch overlay from Kanon API for ${credDefId}`);
            const apiBundle = await this.fetchOverlayFromApi(credDefId);
            if (apiBundle) {
                // Store in bundles for future lookups within this session
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.bundles[credDefId] = apiBundle;
                return new OCABundle(apiBundle, {
                    brandingOverlayType: this.getBrandingOverlayType(),
                    language: params.language,
                });
            }
        }
        return undefined;
    }
    /**
     * Clear the API cache
     */
    clearCache() {
        this.apiCache.clear();
    }
    /**
     * Set the API base URL dynamically
     */
    setApiBaseUrl(url) {
        this.apiBaseUrl = url;
        this.clearCache();
    }
}
/**
 * Factory function to create a KanonOCABundleResolver
 */
export function createKanonOCABundleResolver(bundlesData = {}, options) {
    return new KanonOCABundleResolver(bundlesData, options);
}
