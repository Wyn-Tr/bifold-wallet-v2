import { useProofs } from '@credo-ts/react-hooks';
import { useMemo } from 'react';
import { ProofMetadata } from '../types/metadata';
export const useProofsByTemplateId = (templateId) => {
    const { records: proofs } = useProofs();
    return useMemo(() => proofs.filter((proof) => {
        const metadata = proof?.metadata.get(ProofMetadata.customMetadata);
        if (metadata?.proof_request_template_id === templateId) {
            return proof;
        }
    }), [proofs, templateId]);
};
