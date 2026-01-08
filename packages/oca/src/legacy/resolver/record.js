export class Field {
    name;
    format;
    type;
    encoding;
    mimeType;
    revoked;
    credentialId;
    label;
    restrictions;
    nonRevoked;
    constructor(params) {
        this.name = params.name;
        this.format = params.format;
        this.type = params.type;
        this.encoding = params.encoding;
        this.mimeType = params.mimeType;
        this.revoked = params.revoked;
        this.credentialId = params.credentialId;
        this.label = params.label;
        this.restrictions = params.restrictions;
        this.nonRevoked = params.nonRevoked;
    }
}
export class Attribute extends Field {
    value;
    revealed;
    hasError;
    constructor(params) {
        super(params);
        this.value = params.value;
        this.revealed = params.revealed;
        this.hasError = params.hasError;
    }
}
export class Predicate extends Field {
    pValue;
    pType;
    parameterizable;
    satisfied;
    constructor(params) {
        super(params);
        this.pValue = params.pValue;
        this.pType = params.pType;
        this.parameterizable = params.parameterizable;
        this.satisfied = params.satisfied;
    }
}
