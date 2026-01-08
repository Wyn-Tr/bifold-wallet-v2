import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');
export const isTablet = () => {
    const aspectRatio = width / height;
    const diagonal = Math.sqrt(width * width + height * height) / 160;
    return diagonal > 7 || (aspectRatio > 1.3 && width > 600);
};
export const isSmallScreen = () => {
    return height <= 667 || width <= 375;
};
export const getDeviceSize = () => {
    if (isTablet())
        return 'tablet';
    if (isSmallScreen())
        return 'small';
    return 'normal';
};
