import startCase from 'lodash.startcase';
import { defaultBundleLanguage } from '../../constants';
import { MetaOverlay, OverlayBundle, OverlayType, } from '../../types';
import { generateColor } from '../../utils/color';
import { parseCredDefFromId } from '../../utils/credential-definition';
export const BrandingOverlayType = {
    Branding01: OverlayType.Branding01,
    Branding10: OverlayType.Branding10,
    Branding11: OverlayType.Branding11,
};
export class OCABundle {
    bundle;
    options;
    constructor(bundle, options) {
        this.bundle = bundle;
        this.options = {
            brandingOverlayType: options?.brandingOverlayType ?? BrandingOverlayType.Branding10,
            language: options?.language ?? defaultBundleLanguage,
        };
        // Make bundle overlay type come from options.brandingOverlayType
        this.bundle.overlays.forEach((o) => {
            if (o.type === BrandingOverlayType.Branding10 || o.type === BrandingOverlayType.Branding11) {
                o.type = this.options.brandingOverlayType;
            }
        });
    }
    get captureBase() {
        const overlay = this.bundle.captureBase;
        if (!overlay) {
            throw new Error('Capture Base must be defined');
        }
        return overlay;
    }
    get characterEncodingOverlay() {
        return this.getOverlay(OverlayType.CharacterEncoding10);
    }
    get formatOverlay() {
        return this.getOverlay(OverlayType.Format10);
    }
    get labelOverlay() {
        return this.getOverlay(OverlayType.Label10, this.options.language);
    }
    get metaOverlay() {
        return this.getOverlay(OverlayType.Meta10, this.options.language);
    }
    get brandingOverlay() {
        return this.getOverlay(this.options?.brandingOverlayType || BrandingOverlayType.Branding10);
    }
    buildOverlay(name, language) {
        return new MetaOverlay({
            capture_base: '',
            type: OverlayType.Meta10,
            name,
            language,
            description: '',
            credential_help_text: '',
            credential_support_url: '',
            issuer: '',
            issuer_description: '',
            issuer_url: '',
        });
    }
    getOverlay(type, language) {
        if (type === OverlayType.CaptureBase10) {
            return this.bundle.captureBase;
        }
        if (language !== undefined) {
            // we want to return branding even if there isn't a bundle for a given language
            const overlay = this.bundle.overlays.find((item) => (item.language === undefined && item.type === type.toString()) ||
                (item.type === type.toString() && item.language === language));
            if (overlay) {
                return overlay;
            }
        }
        return this.bundle.overlays.find((item) => item.type === type.toString());
    }
}
export class DefaultOCABundleResolver {
    bundles = {};
    options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _log;
    constructor(bundlesData = {}, options) {
        for (const cid in bundlesData) {
            try {
                if (typeof bundlesData[cid] !== 'string') {
                    this.bundles[cid] = new OverlayBundle(cid, bundlesData[cid]);
                }
                else {
                    this.bundles[cid] = bundlesData[cid];
                }
            }
            catch (error) {
                // might get an error trying to parse javascript's default value
                this.log?.error(`Error parsing bundle for ${cid}`, error);
            }
        }
        this.options = {
            brandingOverlayType: options?.brandingOverlayType ?? BrandingOverlayType.Branding10,
            language: options?.language ?? defaultBundleLanguage,
        };
    }
    /**
     * Sets the log value.
     * @param value - The new value for the log.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set log(value) {
        this._log = value;
    }
    /**
     * Get the log value.
     */
    get log() {
        return this._log;
    }
    getBrandingOverlayType() {
        return this.options.brandingOverlayType ?? BrandingOverlayType.Branding10;
    }
    getDefaultBundle(params) {
        if (!params.language) {
            params.language = defaultBundleLanguage;
        }
        const metaOverlay = {
            capture_base: '',
            type: OverlayType.Meta10,
            name: startCase(params.meta?.credName ??
                parseCredDefFromId(params.identifiers?.credentialDefinitionId, params.identifiers?.schemaId)),
            issuer: params.meta?.alias || params.meta?.credConnectionId || 'Unknown Contact',
            language: params.language ?? this.options?.language,
            description: '',
            credential_help_text: '',
            credential_support_url: '',
            issuer_description: '',
            issuer_url: '',
        };
        let colorHash = 'default';
        if (metaOverlay?.name) {
            colorHash = metaOverlay.name;
        }
        else if (metaOverlay?.issuer) {
            colorHash = metaOverlay.issuer;
        }
        const brandingOverlay01 = {
            capture_base: '',
            type: OverlayType.Branding01,
            background_color: generateColor(colorHash),
        };
        const brandingOverlay10 = {
            capture_base: '',
            type: OverlayType.Branding10,
            primary_background_color: generateColor(colorHash),
        };
        const brandingOverlay11 = {
            capture_base: '',
            type: OverlayType.Branding11,
            primary_background_color: '#FFFFFF',
            secondary_background_color: generateColor(colorHash),
        };
        let brandingOverlay = this.getBrandingOverlayType() === BrandingOverlayType.Branding01 ? brandingOverlay01 : brandingOverlay10;
        if (this.getBrandingOverlayType() === BrandingOverlayType.Branding11) {
            brandingOverlay = brandingOverlay11;
        }
        const bundle = new OverlayBundle(params.identifiers?.credentialDefinitionId, {
            capture_base: {
                attributes: {},
                classification: '',
                type: OverlayType.CaptureBase10,
                flagged_attributes: [],
            },
            overlays: [metaOverlay, brandingOverlay],
        });
        return Promise.resolve(new OCABundle(bundle, { ...this.options, language: params.language ?? this.options.language }));
    }
    resolveDefaultBundle(params) {
        return this.getDefaultBundle(params);
    }
    resolve(params) {
        const language = params.language || defaultBundleLanguage;
        for (const item of [
            params.identifiers?.credentialDefinitionId,
            params.identifiers?.schemaId,
            params.identifiers?.templateId,
        ]) {
            if (item && this.bundles[item] !== undefined) {
                let bundle = this.bundles[item];
                // if it is a string, it is a reference/alias to another one bundle
                if (typeof bundle === 'string') {
                    bundle = this.bundles[bundle];
                }
                return Promise.resolve(new OCABundle(bundle, { ...this.options, language: language ?? this.options.language }));
            }
        }
        return Promise.resolve(undefined);
    }
    async presentationFields(params) {
        const bundle = await this.resolve(params);
        let presentationFields = [...params.attributes];
        if (bundle?.captureBase?.attributes) {
            // if the oca branding has the attributes set, only display those attributes
            const bundleFields = Object.keys(bundle.captureBase.attributes);
            presentationFields = presentationFields.filter((item) => item.name && bundleFields.includes(item.name));
            for (let i = 0; i < presentationFields.length; i++) {
                const presentationField = presentationFields[i];
                const key = presentationField.name || '';
                if (bundle.captureBase.attributes[key]) {
                    presentationField.label = bundle?.labelOverlay?.attributeLabels[key];
                    presentationField.format = bundle?.formatOverlay?.attributeFormats[key];
                    presentationField.type = bundle?.captureBase?.attributes?.[key];
                    presentationField.encoding = bundle?.characterEncodingOverlay?.attributeCharacterEncoding?.[key];
                }
            }
        }
        return presentationFields;
    }
    async resolveAllBundles(params) {
        const [bundle, defaultBundle] = await Promise.all([this.resolve(params), this.resolveDefaultBundle(params)]);
        const fields = params.attributes
            ? await this.presentationFields({
                ...params,
                attributes: params.attributes,
            })
            : [];
        const overlayBundle = bundle ?? defaultBundle;
        const metaOverlay = overlayBundle?.metaOverlay;
        const brandingOverlay = overlayBundle?.brandingOverlay;
        if (brandingOverlay && 'logo' in brandingOverlay && params.meta?.logo) {
            brandingOverlay.logo = params.meta.logo;
        }
        return { bundle: overlayBundle, presentationFields: fields, metaOverlay, brandingOverlay };
    }
}
