import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineErrorType } from '../components/inputs/InlineErrorText';
import { TOKENS, useServices } from '../container-api';
import { createPINValidations } from '../utils/PINValidation';
const initialModalState = {
    visible: false,
    title: '',
    message: '',
};
export const usePINValidation = (PIN) => {
    const { t } = useTranslation();
    const [{ PINSecurity }, inlineMessages] = useServices([TOKENS.CONFIG, TOKENS.INLINE_ERRORS]);
    const [inlineMessageField1, setInlineMessageField1] = useState();
    const [inlineMessageField2, setInlineMessageField2] = useState();
    const [modalState, setModalState] = useState(initialModalState);
    const clearModal = useCallback(() => {
        setModalState(initialModalState);
    }, []);
    const [PINValidations, setPINValidations] = useState(createPINValidations(PIN, PINSecurity.rules));
    useEffect(() => {
        setPINValidations(createPINValidations(PIN, PINSecurity.rules));
    }, [PIN, PINSecurity.rules]);
    const attentionMessage = useCallback((title, message, pinOne) => {
        if (inlineMessages.enabled) {
            const config = {
                message: message,
                inlineType: InlineErrorType.error,
                config: inlineMessages,
            };
            if (pinOne) {
                setInlineMessageField1(config);
            }
            else {
                setInlineMessageField2(config);
            }
        }
        else {
            setModalState({
                visible: true,
                title: title,
                message: message,
                onModalDismiss: clearModal,
            });
        }
    }, [inlineMessages, clearModal]);
    const comparePINEntries = useCallback((pinOne, pinTwo) => {
        if (pinOne !== pinTwo) {
            attentionMessage(t('PINCreate.InvalidPIN'), t('PINCreate.PINsDoNotMatch'), false);
            return false;
        }
        return true;
    }, [attentionMessage, t]);
    const validatePINEntry = useCallback((pinOne, pinTwo) => {
        const PINValidation = createPINValidations(pinOne, PINSecurity.rules);
        for (const validation of PINValidation) {
            if (validation.isInvalid) {
                attentionMessage(t('PINCreate.InvalidPIN'), t(`PINCreate.Message.${validation.errorName}`, validation?.errorTextAddition), true);
                return false;
            }
        }
        return comparePINEntries(pinOne, pinTwo);
    }, [t, attentionMessage, PINSecurity.rules, comparePINEntries]);
    return {
        PINValidations,
        validatePINEntry,
        inlineMessageField1,
        inlineMessageField2,
        modalState,
        setModalState,
        clearModal,
        PINSecurity,
        comparePINEntries,
        setInlineMessageField1,
        setInlineMessageField2,
    };
};
