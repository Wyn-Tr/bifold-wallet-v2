import { ClaimFormat } from '@credo-ts/core';
import { filterAndMapSdJwtKeys, getCredentialForDisplay } from './display';
export function formatDifPexCredentialsForRequest(credentialsForRequest) {
    const entries = credentialsForRequest.requirements.flatMap((requirement) => {
        return requirement.submissionEntry.map((submission) => {
            return {
                inputDescriptorId: submission.inputDescriptorId,
                name: submission.name ?? 'Unknown',
                purpose: submission.purpose,
                description: submission.purpose,
                isSatisfied: submission.verifiableCredentials.length >= 1,
                credentials: submission.verifiableCredentials.map((verifiableCredential) => {
                    const { display, attributes, metadata, claimFormat } = getCredentialForDisplay(verifiableCredential.credentialRecord);
                    let disclosedPayload = attributes;
                    if (verifiableCredential.type === ClaimFormat.SdJwtVc) {
                        disclosedPayload = filterAndMapSdJwtKeys(verifiableCredential.disclosedPayload).visibleProperties;
                    }
                    else if (verifiableCredential.type === ClaimFormat.MsoMdoc) {
                        disclosedPayload = Object.fromEntries(Object.values(verifiableCredential.disclosedPayload).flatMap((entry) => Object.entries(entry)));
                    }
                    return {
                        id: verifiableCredential.credentialRecord.id,
                        credentialName: display.name,
                        issuerName: display.issuer.name,
                        requestedAttributes: [...Object.keys(disclosedPayload)],
                        disclosedPayload,
                        metadata,
                        backgroundColor: display.backgroundColor,
                        textColor: display.textColor,
                        backgroundImage: display.backgroundImage,
                        claimFormat,
                    };
                }),
            };
        });
    });
    return {
        areAllSatisfied: entries.every((entry) => entry.isSatisfied),
        name: credentialsForRequest.name ?? 'Unknown',
        purpose: credentialsForRequest.purpose,
        entries,
    };
}
