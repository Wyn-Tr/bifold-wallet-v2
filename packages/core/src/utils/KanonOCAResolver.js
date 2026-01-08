import { DefaultOCABundleResolver, } from '@bifold/oca/build/legacy';
/**
 * Custom OCA Bundle Resolver that extends DefaultOCABundleResolver
 * to support fetching OCA overlays from Kanon credential definitions.
 *
 * When a credential definition ID is not found in the local bundle,
 * it attempts to fetch the overlay from the credential definition metadata.
 */
export class KanonOCABundleResolver extends DefaultOCABundleResolver {
    agent = null;
    cachedOverlays = new Map();
    constructor(bundle, options) {
        super(bundle, options);
    }
    /**
     * Set the agent instance for fetching credential definitions
     */
    setAgent(agent) {
        this.agent = agent;
    }
    /**
     * Resolve OCA bundle - first tries local bundle, then fetches from Kanon if not found
     */
    async resolve(params) {
        const credDefId = params.identifiers.credentialDefinitionId;
        // First try the default resolver (local bundles)
        const localBundle = await super.resolve(params);
        if (localBundle) {
            return localBundle;
        }
        // Check cache
        if (credDefId && this.cachedOverlays.has(credDefId)) {
            return this.cachedOverlays.get(credDefId);
        }
        // Try to fetch from Kanon credential definition
        if (credDefId && this.agent) {
            try {
                const kanonBundle = await this.fetchKanonOCA(credDefId, params.language);
                if (kanonBundle) {
                    this.cachedOverlays.set(credDefId, kanonBundle);
                    return kanonBundle;
                }
            }
            catch (error) {
                // Silently fail - credential will use default overlay
            }
        }
        return undefined;
    }
    /**
     * Fetch OCA overlay from Kanon credential definition metadata
     */
    async fetchKanonOCA(credDefId, language) {
        if (!this.agent) {
            return undefined;
        }
        try {
            const result = await this.agent.modules.anoncreds.getCredentialDefinition(credDefId);
            // Check for overlay in metadata
            const overlay = result.credentialDefinitionMetadata?.overlay;
            if (!overlay) {
                return undefined;
            }
            // Convert Kanon overlay format to OCA bundle format
            return this.convertKanonOverlayToOCABundle(overlay, credDefId, language);
        }
        catch (error) {
            // Silently fail - credential will use default overlay
            return undefined;
        }
    }
    /**
     * Convert Kanon overlay format to OCA bundle format
     * Handles both snake_case (from server) and camelCase formats
     */
    convertKanonOverlayToOCABundle(overlay, credDefId, language) {
        const lang = language || 'en';
        const branding = overlay.branding;
        // Build capture base
        const captureBase = {
            type: 'spec/capture_base/1.0',
            digest: credDefId,
            classification: overlay.classification || '',
            attributes: overlay.attributes || {},
            flagged_attributes: overlay.flaggedAttributes || [],
        };
        // Build overlays array
        const overlays = [];
        // Meta overlay - handle both snake_case and camelCase
        if (overlay.meta) {
            const meta = overlay.meta;
            overlays.push({
                type: 'spec/overlays/meta/1.0',
                capture_base: credDefId,
                language: lang,
                name: meta.name || '',
                description: meta.description || '',
                issuer: meta.issuer || '',
                issuer_description: meta.issuer_description || meta.issuerDescription || '',
                issuer_url: meta.issuer_url || meta.issuerUrl || '',
                credential_help_text: meta.credential_help_text || meta.credentialHelpText || '',
                credential_support_url: meta.credential_support_url || meta.credentialSupportUrl || '',
            });
        }
        // Label overlay
        if (overlay.labels) {
            overlays.push({
                type: 'spec/overlays/label/1.0',
                capture_base: credDefId,
                language: lang,
                attribute_labels: overlay.labels,
            });
        }
        // Branding overlay - handle both snake_case and camelCase from server
        if (branding) {
            overlays.push({
                type: 'aries/overlays/branding/0.1',
                capture_base: credDefId,
                language: lang,
                logo: branding.logo || '',
                background_color: branding.background_color || branding.backgroundColor || '#FFFFFF',
                background_image: branding.background_image || branding.backgroundImage || '',
                background_image_slice: branding.background_image_slice || branding.backgroundImageSlice || '',
                primary_background_color: branding.primary_background_color || branding.primaryBackgroundColor || '',
                secondary_background_color: branding.secondary_background_color || branding.secondaryBackgroundColor || '',
                primary_attribute: branding.primary_attribute || branding.primaryAttribute || '',
                secondary_attribute: branding.secondary_attribute || branding.secondaryAttribute || '',
                header: branding.header || { color: '#000000' },
                footer: branding.footer || { color: '#000000' },
            });
        }
        return {
            captureBase,
            overlays,
        };
    }
    /**
     * Override resolveAllBundles to use our custom resolve for Kanon bundles
     */
    async resolveAllBundles(params) {
        const credDefId = params.identifiers.credentialDefinitionId;
        // First try the default resolver (local bundles) - use parent's resolveAllBundles
        // which knows how to process local bundles correctly
        const localBundle = await super.resolve({
            identifiers: params.identifiers,
            language: params.language,
        });
        if (localBundle) {
            // Use parent's resolveAllBundles for local bundles
            return super.resolveAllBundles(params);
        }
        // Check cache for Kanon bundles
        if (credDefId && this.cachedOverlays.has(credDefId)) {
            const cachedBundle = this.cachedOverlays.get(credDefId);
            return this.processBundle(cachedBundle, params);
        }
        // Try to fetch from Kanon credential definition
        if (credDefId && this.agent) {
            try {
                const kanonBundle = await this.fetchKanonOCA(credDefId, params.language);
                if (kanonBundle) {
                    this.cachedOverlays.set(credDefId, kanonBundle);
                    return this.processBundle(kanonBundle, params);
                }
            }
            catch (error) {
                // Silently fail - credential will use default overlay
            }
        }
        // Fall back to default behavior
        return super.resolveAllBundles(params);
    }
    /**
     * Process a bundle into CredentialOverlay format
     */
    processBundle(bundle, params) {
        const lang = params.language || 'en';
        // Extract meta overlay
        const bundleAny = bundle;
        const metaOverlay = bundleAny.overlays?.find((o) => o.type === 'spec/overlays/meta/1.0' && o.language === lang);
        // Extract label overlay
        const labelOverlay = bundleAny.overlays?.find((o) => o.type === 'spec/overlays/label/1.0' && o.language === lang);
        // Extract branding overlay and convert to camelCase for UI components
        const rawBrandingOverlay = bundleAny.overlays?.find((o) => o.type === 'aries/overlays/branding/0.1');
        // Convert snake_case to camelCase for branding overlay
        // UI components expect camelCase (e.g., primaryBackgroundColor, not primary_background_color)
        const brandingOverlay = rawBrandingOverlay ? {
            logo: rawBrandingOverlay.logo,
            backgroundColor: rawBrandingOverlay.background_color || rawBrandingOverlay.backgroundColor,
            backgroundImage: rawBrandingOverlay.background_image || rawBrandingOverlay.backgroundImage,
            backgroundImageSlice: rawBrandingOverlay.background_image_slice || rawBrandingOverlay.backgroundImageSlice,
            primaryBackgroundColor: rawBrandingOverlay.primary_background_color || rawBrandingOverlay.primaryBackgroundColor,
            secondaryBackgroundColor: rawBrandingOverlay.secondary_background_color || rawBrandingOverlay.secondaryBackgroundColor,
            primaryAttribute: rawBrandingOverlay.primary_attribute || rawBrandingOverlay.primaryAttribute,
            secondaryAttribute: rawBrandingOverlay.secondary_attribute || rawBrandingOverlay.secondaryAttribute,
            issuedDateAttribute: rawBrandingOverlay.issued_date_attribute || rawBrandingOverlay.issuedDateAttribute,
            expiryDateAttribute: rawBrandingOverlay.expiry_date_attribute || rawBrandingOverlay.expiryDateAttribute,
            header: rawBrandingOverlay.header,
            footer: rawBrandingOverlay.footer,
        } : undefined;
        // Build presentation fields with labels
        const presentationFields = params.attributes?.map((attr) => {
            const label = labelOverlay?.attribute_labels?.[attr.name || ''] || attr.name;
            return {
                ...attr,
                label,
            };
        });
        return {
            bundle,
            presentationFields,
            metaOverlay: metaOverlay ? {
                name: metaOverlay.name,
                description: metaOverlay.description,
                issuer: metaOverlay.issuer,
                issuerDescription: metaOverlay.issuer_description,
                credentialHelpText: metaOverlay.credential_help_text,
                credentialSupportUrl: metaOverlay.credential_support_url,
            } : undefined,
            brandingOverlay,
        };
    }
}
