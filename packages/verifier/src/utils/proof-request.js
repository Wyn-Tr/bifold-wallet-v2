import { V1RequestPresentationMessage, } from '@credo-ts/anoncreds';
import { AutoAcceptProof } from '@credo-ts/core';
import { ProofRequestType } from '../types/proof-reqeust-template';
const protocolVersion = 'v2';
const domain = 'http://aries-mobile-agent.com';
/*
 * Find Proof Request message in the storage by the given id
 * */
export const findProofRequestMessage = async (agent, id) => {
    const message = await agent.proofs.findRequestMessage(id);
    if (message && message instanceof V1RequestPresentationMessage && message.indyProofRequest) {
        return message.indyProofRequest;
    }
    else {
        return undefined;
    }
};
/*
 * Build Proof Request data from for provided template
 * */
/*
 * Build Proof Request data for provided template
 * */
export const buildProofRequestDataForTemplate = (template, customValues) => {
    if (template.payload.type === ProofRequestType.AnonCreds) {
        const requestedAttributes = {};
        const requestedPredicates = {};
        let index = 0;
        template.payload.data.forEach((data) => {
            if (data.requestedAttributes?.length) {
                data.requestedAttributes.forEach((requestedAttribute) => {
                    requestedAttributes[`referent_${index}`] = {
                        name: requestedAttribute.name,
                        names: requestedAttribute.names,
                        non_revoked: requestedAttribute.nonRevoked,
                        restrictions: requestedAttribute.restrictions,
                    };
                    index++;
                });
            }
            if (data.requestedPredicates?.length) {
                data.requestedPredicates.forEach((requestedPredicate) => {
                    const customValue = customValues && customValues[data.schema] ? customValues[data.schema][requestedPredicate.name] : undefined;
                    requestedPredicates[`referent_${index}`] = {
                        name: requestedPredicate.name,
                        p_value: requestedPredicate.parameterizable && customValue ? customValue : requestedPredicate.predicateValue,
                        p_type: requestedPredicate.predicateType,
                        non_revoked: requestedPredicate.nonRevoked,
                        restrictions: requestedPredicate.restrictions,
                    };
                    index++;
                });
            }
        });
        return {
            anoncreds: {
                name: template.name,
                version: template.version,
                nonce: Date.now().toString(),
                requested_attributes: requestedAttributes,
                requested_predicates: requestedPredicates,
            },
        };
    }
    if (template.payload.type === ProofRequestType.DIF) {
        return {};
    }
};
/*
 * Create connectionless proof request invitation for provided template
 * */
export const createConnectionlessProofRequestInvitation = async (agent, template, customPredicateValues) => {
    const proofFormats = buildProofRequestDataForTemplate(template, customPredicateValues);
    if (!proofFormats) {
        return undefined;
    }
    const { message: request, proofRecord } = await agent.proofs.createRequest({
        protocolVersion,
        autoAcceptProof: AutoAcceptProof.Always,
        proofFormats,
    });
    const { message: invitation, invitationUrl } = await agent.oob.createLegacyConnectionlessInvitation({
        recordId: proofRecord.id,
        message: request,
        domain,
    });
    return {
        request,
        proofRecord,
        invitation,
        invitationUrl,
    };
};
/*
 * Build Proof Request for provided template and send it to provided connection
 * */
export const sendProofRequest = async (agent, template, connectionId, customPredicateValues) => {
    const proofFormats = buildProofRequestDataForTemplate(template, customPredicateValues);
    if (!proofFormats) {
        return undefined;
    }
    const proofRecord = await agent.proofs.requestProof({
        protocolVersion,
        connectionId,
        proofFormats,
    });
    return {
        proofRecord,
    };
};
/*
 * Check if the Proof Request template contains at least one predicate
 * */
export const hasPredicates = (record) => {
    if (record.payload.type === ProofRequestType.AnonCreds) {
        return record.payload.data.some((d) => d.requestedPredicates && d.requestedPredicates?.length > 0);
    }
    if (record.payload.type === ProofRequestType.DIF) {
        return false;
    }
    return false;
};
/*
 * Check if the Proof Request template contains parameterizable predicates
 * */
export const isParameterizable = (record) => {
    if (record.payload.type === ProofRequestType.AnonCreds) {
        return record.payload.data.some((d) => d.requestedPredicates?.some((predicate) => predicate.parameterizable));
    }
    if (record.payload.type === ProofRequestType.DIF) {
        return false;
    }
    return false;
};
