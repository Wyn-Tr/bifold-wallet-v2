import { testIdPrefix } from '../constants';
export const testIdWithKey = (key) => {
    return `${testIdPrefix}${key}`;
};
export const testIdForAccessabilityLabel = (label) => {
    if (!label) {
        return '';
    }
    return label
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/\s/g, '');
};
