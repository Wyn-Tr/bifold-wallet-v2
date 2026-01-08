import LocalizedCredential from './LocalizedCredential';
export default class CredentialFormatter {
    #credentials;
    constructor(bundle, record) {
        this.#credentials = bundle.languages.reduce((credentials, language) => {
            credentials[language] = new LocalizedCredential(bundle, record, language);
            return credentials;
        }, {});
    }
    localizedCredential(language) {
        return this.#credentials[language];
    }
}
