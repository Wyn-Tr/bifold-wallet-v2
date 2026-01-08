export var InvitationQrTypes;
(function (InvitationQrTypes) {
    InvitationQrTypes["OPENID_INITIATE_ISSUANCE"] = "openid-initiate-issuance://";
    InvitationQrTypes["OPENID_CREDENTIAL_OFFER"] = "openid-credential-offer://";
    // TODO: I think we should not support openid://, as we mainly support openid4vp
    // But older requests do use openid:// I think (such as the DIIP dbc login)
    // but I think we're going to move to just openid4p in the future
    InvitationQrTypes["OPENID"] = "openid://";
    InvitationQrTypes["OPENID4VP"] = "openid4vp://";
    InvitationQrTypes["OPENID_VC"] = "openid-vc://";
    InvitationQrTypes["DIDCOMM"] = "didcomm://";
    InvitationQrTypes["HTTPS"] = "https://";
})(InvitationQrTypes || (InvitationQrTypes = {}));
export const isOpenIdCredentialOffer = (url) => {
    if (url.startsWith(InvitationQrTypes.OPENID_INITIATE_ISSUANCE) ||
        url.startsWith(InvitationQrTypes.OPENID_CREDENTIAL_OFFER)) {
        return true;
    }
    if (url.includes('credential_offer_uri=') || url.includes('credential_offer=')) {
        return true;
    }
    return false;
};
export const isOpenIdPresentationRequest = (url) => {
    if (url.startsWith(InvitationQrTypes.OPENID) ||
        url.startsWith(InvitationQrTypes.OPENID_VC) ||
        url.startsWith(InvitationQrTypes.OPENID4VP)) {
        return true;
    }
    if (url.includes('request_uri=') || url.includes('request=')) {
        return true;
    }
    return false;
};
export const isDidCommInvitation = (url) => {
    if (url.startsWith(InvitationQrTypes.DIDCOMM)) {
        return true;
    }
    if (url.includes('c_i=') || url.includes('oob=') || url.includes('oobUrl=') || url.includes('d_m=')) {
        return true;
    }
    return false;
};
export async function parseInvitationUrl(invitationUrl) {
    if (isOpenIdCredentialOffer(invitationUrl)) {
        return {
            success: true,
            result: {
                format: 'url',
                type: 'openid-credential-offer',
                data: invitationUrl,
            },
        };
    }
    if (isOpenIdPresentationRequest(invitationUrl)) {
        return {
            success: true,
            result: {
                format: 'url',
                type: 'openid-authorization-request',
                data: invitationUrl,
            },
        };
    }
    if (isDidCommInvitation(invitationUrl)) {
        return {
            success: true,
            result: {
                format: 'url',
                type: 'didcomm',
                data: invitationUrl,
            },
        };
    }
    return {
        success: false,
        error: 'Invitation not recognized.',
    };
}
