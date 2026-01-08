import { CredentialPreviewAttribute } from '@credo-ts/core';
export default class DisplayAttribute extends CredentialPreviewAttribute {
    characterEncoding;
    standard;
    format;
    information;
    label;
    constructor(options, overlayOptions, language) {
        super(options);
        this.characterEncoding = overlayOptions.characterEncoding;
        this.standard = overlayOptions.standard;
        this.format = overlayOptions.format;
        this.information = overlayOptions.information?.[language];
        this.label = overlayOptions.label?.[language];
    }
    toJSON() {
        return { ...super.toJSON(), format: this.format, information: this.information, label: this.label };
    }
}
