export var CredentialErrors;
(function (CredentialErrors) {
    CredentialErrors[CredentialErrors["Revoked"] = 0] = "Revoked";
    CredentialErrors[CredentialErrors["NotInWallet"] = 1] = "NotInWallet";
    CredentialErrors[CredentialErrors["PredicateError"] = 2] = "PredicateError";
})(CredentialErrors || (CredentialErrors = {}));
