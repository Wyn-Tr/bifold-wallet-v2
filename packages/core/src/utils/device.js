/**
 * Device utility functions
 */
import { Dimensions, PixelRatio, Platform } from 'react-native';
export const isTablet = () => {
    const { width, height } = Dimensions.get('window');
    const aspectRatio = height / width;
    if (Platform.OS === 'ios') {
        return Platform.isPad;
    }
    if (Platform.OS === 'android') {
        const pixelDensity = PixelRatio.get();
        const adjustedWidth = width * pixelDensity;
        const adjustedHeight = height * pixelDensity;
        if (pixelDensity <= 2 && Math.max(width, height) >= 900) {
            return true;
        }
        return aspectRatio < 1.6 && Math.max(adjustedWidth, adjustedHeight) >= 1200;
    }
    return aspectRatio < 1.6 && Math.max(width, height) >= 768;
};
export const getScreenWidth = () => {
    return Dimensions.get('window').width;
};
export const getScreenHeight = () => {
    return Dimensions.get('window').height;
};
