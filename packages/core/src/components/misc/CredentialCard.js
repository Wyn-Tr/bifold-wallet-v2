import { MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core';
import { BrandingOverlayType } from '@bifold/oca/build/legacy';
import React, { useEffect, useState } from 'react';
import { TOKENS, useServices } from '../../container-api';
import { useTheme } from '../../contexts/theme';
import CredentialCard10 from './CredentialCard10';
import CredentialCard11 from './CredentialCard11';
import { useOpenIDCredentials } from '../../modules/openid/context/OpenIDCredentialRecordProvider';
import { getCredentialForDisplay } from '../../modules/openid/display';
import { getAttributeField } from '../../utils/oca';
import { useCredentialErrorsFromRegistry } from '../../modules/openid/hooks/useCredentialErrorsFromRegistry';
const CredentialCard = ({ credential, credDefId, schemaId, proof, displayItems, credName, hasAltCredentials, handleAltCredChange, style = {}, onPress = undefined, credentialErrors, brandingOverlay, }) => {
    // add ability to reference credential by ID, allows us to get past react hook restrictions
    const [bundleResolver] = useServices([TOKENS.UTIL_OCA_RESOLVER]);
    const { ColorPalette } = useTheme();
    const [overlay, setOverlay] = useState({});
    const { resolveBundleForCredential } = useOpenIDCredentials();
    const [extraOverlayAttribute, setExtraOverlayAttribute] = useState();
    const computedErrors = useCredentialErrorsFromRegistry(credential, credentialErrors);
    useEffect(() => {
        if (brandingOverlay) {
            setOverlay(brandingOverlay);
            return;
        }
        const resolveOverlay = async (w3cCred) => {
            const brandingOverlay = await resolveBundleForCredential(w3cCred);
            setOverlay(brandingOverlay);
        };
        if (credential instanceof W3cCredentialRecord ||
            credential instanceof SdJwtVcRecord ||
            credential instanceof MdocRecord) {
            resolveOverlay(credential);
            const credentialDisplay = getCredentialForDisplay(credential);
            if (credentialDisplay.display.primary_overlay_attribute) {
                const attributeValue = getAttributeField(credentialDisplay, credentialDisplay.display.primary_overlay_attribute)?.field;
                setExtraOverlayAttribute(attributeValue);
            }
        }
    }, [credential, brandingOverlay, resolveBundleForCredential]);
    const getCredOverlayType = (type) => {
        const isBranding10 = bundleResolver.getBrandingOverlayType() === BrandingOverlayType.Branding10;
        if (proof) {
            return (<CredentialCard11 displayItems={displayItems} style={isBranding10 ? { backgroundColor: ColorPalette.brand.secondaryBackground } : undefined} credName={credName} credDefId={credDefId} schemaId={schemaId} credential={credential} handleAltCredChange={handleAltCredChange} hasAltCredentials={hasAltCredentials} proof elevated credentialErrors={credentialErrors ?? []} brandingOverlayType={bundleResolver.getBrandingOverlayType()}/>);
        }
        if (credential) {
            if (type === BrandingOverlayType.Branding01) {
                return <CredentialCard10 credential={credential} style={style} onPress={onPress}/>;
            }
            else {
                return (<CredentialCard11 credential={credential} style={style} onPress={onPress} credentialErrors={credentialErrors ?? []} brandingOverlayType={bundleResolver.getBrandingOverlayType()} elevated={bundleResolver.getBrandingOverlayType() === BrandingOverlayType.Branding11}/>);
            }
        }
        else {
            return (<CredentialCard11 credDefId={credDefId} schemaId={schemaId} credName={credName} displayItems={displayItems} style={style} onPress={onPress} credentialErrors={credentialErrors ?? []} brandingOverlayType={bundleResolver.getBrandingOverlayType()}/>);
        }
    };
    if (credential instanceof W3cCredentialRecord ||
        credential instanceof SdJwtVcRecord ||
        credential instanceof MdocRecord) {
        return (<CredentialCard11 credential={undefined} style={style} onPress={onPress} brandingOverlay={overlay} credentialErrors={computedErrors} proof={proof} elevated={proof} displayItems={displayItems} hideSlice={true} hasAltCredentials={hasAltCredentials} handleAltCredChange={handleAltCredChange} extraOverlayParameter={extraOverlayAttribute} brandingOverlayType={bundleResolver.getBrandingOverlayType()}/>);
    }
    else {
        return getCredOverlayType(bundleResolver.getBrandingOverlayType());
    }
};
export default CredentialCard;
