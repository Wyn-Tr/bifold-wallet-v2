export class ParsedAnonCredsProof {
    sharedAttributes;
    sharedAttributeGroups;
    resolvedPredicates;
    unresolvedAttributes;
    unresolvedAttributeGroups;
    unresolvedPredicates;
    constructor() {
        this.sharedAttributes = [];
        this.sharedAttributeGroups = [];
        this.resolvedPredicates = [];
        this.unresolvedAttributes = [];
        this.unresolvedAttributeGroups = [];
        this.unresolvedPredicates = [];
    }
}
export class CredentialSharedProofData {
    sharedAttributes;
    sharedAttributeGroups;
    resolvedPredicates;
    constructor() {
        this.sharedAttributes = [];
        this.sharedAttributeGroups = [];
        this.resolvedPredicates = [];
    }
}
