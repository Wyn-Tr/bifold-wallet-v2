import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { PersistentStorage } from '../services/storage';
import { LocalStorageKeys } from '../constants';
import en from './en';
import fr from './fr';
import ptBr from './pt-br';
import sp from './sp';
export const translationResources = {
    en: {
        translation: en,
    },
    fr: {
        translation: fr,
    },
    'pt-BR': {
        translation: ptBr,
    },
    sp: {
        translation: sp,
    },
};
export var Locales;
(function (Locales) {
    Locales["en"] = "en";
    Locales["fr"] = "fr";
    Locales["ptBr"] = "pt-BR";
    Locales["sp"] = "sp";
})(Locales || (Locales = {}));
const currentLanguage = i18n.language;
const storeLanguage = async (id) => {
    await PersistentStorage.storeValueForKey(LocalStorageKeys.Language, id);
};
const initLanguages = (resources, fallbackLng = Locales.en) => {
    const availableLanguages = Object.keys(resources);
    const bestLanguageMatch = RNLocalize.findBestAvailableLanguage(availableLanguages);
    let translationToUse = fallbackLng;
    if (bestLanguageMatch && availableLanguages.includes(bestLanguageMatch.languageTag)) {
        translationToUse = bestLanguageMatch.languageTag;
    }
    i18n.use(initReactI18next).init({
        lng: translationToUse,
        fallbackLng,
        resources,
    });
};
//** Fetch user preference language from the AsyncStorage and set if require  */
const initStoredLanguage = async () => {
    const langId = await PersistentStorage.fetchValueForKey(LocalStorageKeys.Language);
    if (langId && langId !== currentLanguage) {
        await i18n.changeLanguage(langId);
    }
};
export { i18n, initStoredLanguage, initLanguages, storeLanguage, currentLanguage };
