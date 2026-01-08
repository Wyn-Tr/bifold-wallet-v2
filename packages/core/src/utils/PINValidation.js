const consecutiveSeriesOfThree = new RegExp(/012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210/);
const evenNumberSeries = new RegExp('(13579)');
const oddNumberSeries = new RegExp('(02468)');
const isNumber = new RegExp('^[0-9]+$');
const crossNumberPattern = ['159753', '159357', '951357', '951753', '357159', '357951', '753159', '753951'];
const commonUsedPINs = [
    '123456',
    '111111',
    '000000',
    '123123',
    '321654',
    '123321',
    '520131',
    '520520',
    '112233',
    '147258',
    '654321',
];
const nistPinLength = 6;
export var PINError;
(function (PINError) {
    PINError["CrossPatternValidation"] = "CrossPatternValidation";
    PINError["OddOrEvenSequenceValidation"] = "OddOrEvenSequenceValidation";
    PINError["NoRepetitionOfTheSameNumbersValidation"] = "NoRepetitionOfTheSameNumbersValidation";
    PINError["MaxAdjacentNumberRepetitionValidation"] = "MaxAdjacentNumberRepetitionValidation";
    PINError["NoRepetitionOfTheTwoSameNumbersValidation"] = "NoRepetitionOfTheTwoSameNumbersValidation";
    PINError["NoSeriesOfNumbersValidation"] = "NoSeriesOfNumbersValidation";
    PINError["PINOnlyContainDigitsValidation"] = "PINOnlyContainDigitsValidation";
    PINError["PINTooShortValidation"] = "PINTooShortValidation";
    PINError["PINTooLongValidation"] = "PINTooLongValidation";
    PINError["PINIsExpectedLength"] = "PINExpectedLengthValidation";
    PINError["PINCommonlyUsed"] = "PINCommonlyUsed";
})(PINError || (PINError = {}));
export const createPINValidations = (PIN, PINRules) => {
    const PINValidations = [];
    if (PINRules.use_nist_requirements) {
        PINValidations.push({
            isInvalid: commonUsedPINs.includes(PIN),
            errorName: PINError.PINCommonlyUsed,
        });
        PINValidations.push({
            isInvalid: PIN.length < nistPinLength || PIN.length > nistPinLength,
            errorName: PINError.PINIsExpectedLength,
            errorTextAddition: { num: `${nistPinLength}` },
        });
        return PINValidations;
    }
    if (PINRules.no_cross_pattern) {
        PINValidations.push({
            isInvalid: crossNumberPattern.includes(PIN),
            errorName: PINError.CrossPatternValidation,
        });
    }
    if (PINRules.no_even_or_odd_series_of_numbers) {
        PINValidations.push({
            isInvalid: evenNumberSeries.test(PIN) || oddNumberSeries.test(PIN),
            errorName: PINError.OddOrEvenSequenceValidation,
        });
    }
    if (1 == PINRules.no_repeated_numbers) {
        const repetitionPattern = new RegExp(/(\d)\1{1,}/);
        PINValidations.push({
            isInvalid: repetitionPattern.test(PIN),
            errorName: PINError.NoRepetitionOfTheSameNumbersValidation,
        });
    }
    else if (1 < PINRules.no_repeated_numbers) {
        const repetitionPattern = new RegExp(String.raw `(\d)\1{${PINRules.no_repeated_numbers},}`, 'g');
        PINValidations.push({
            isInvalid: repetitionPattern.test(PIN),
            errorName: PINError.MaxAdjacentNumberRepetitionValidation,
        });
    }
    if (PINRules.no_repetition_of_the_two_same_numbers) {
        let noRepetitionOfTheTwoSameNumbers = new RegExp(/([0-9][0-9])\1{1,}/);
        if (typeof PINRules.no_repetition_of_the_two_same_numbers === 'number') {
            noRepetitionOfTheTwoSameNumbers = new RegExp(`([0-9][0-9])\\1{${PINRules.no_repetition_of_the_two_same_numbers - 1},}`);
        }
        PINValidations.push({
            isInvalid: noRepetitionOfTheTwoSameNumbers.test(PIN),
            errorName: PINError.NoRepetitionOfTheTwoSameNumbersValidation,
        });
    }
    if (PINRules.no_series_of_numbers) {
        PINValidations.push({
            isInvalid: consecutiveSeriesOfThree.test(PIN),
            errorName: PINError.NoSeriesOfNumbersValidation,
        });
    }
    if (PINRules.only_numbers) {
        PINValidations.push({
            isInvalid: !isNumber.test(PIN),
            errorName: PINError.PINOnlyContainDigitsValidation,
        });
    }
    if (PINRules.most_used_pins) {
        PINValidations.push({
            isInvalid: commonUsedPINs.includes(PIN),
            errorName: PINError.PINCommonlyUsed,
        });
    }
    PINValidations.push({
        isInvalid: PIN.length < PINRules.min_length || PIN.length > PINRules.max_length,
        errorName: PINRules.min_length === PINRules.max_length
            ? PINError.PINIsExpectedLength
            : PIN.length <= PINRules.max_length
                ? PINError.PINTooShortValidation
                : PINError.PINTooLongValidation,
        errorTextAddition: PINRules.min_length === PINRules.max_length
            ? { num: `${PINRules.min_length}` }
            : { num: PIN.length <= PINRules.max_length ? `${PINRules.min_length - 1}` : `${PINRules.max_length + 1}` },
    });
    return PINValidations;
};
