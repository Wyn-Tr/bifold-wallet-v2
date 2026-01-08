/**
 * DigiCredChatBackgroundRenderer
 *
 * Custom chat background renderer using DigiCred gradient colors
 */
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { DigiCredColors } from '../theme';
/**
 * Gradient background component for chat screen
 */
const DigiCredChatGradientBackground = ({ children, style }) => {
    return (<LinearGradient colors={DigiCredColors.gradient.colors} locations={DigiCredColors.gradient.locations} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>);
};
/**
 * Chat background renderer class implementing IChatBackgroundRenderer
 */
export class DigiCredChatBackgroundRenderer {
    style;
    constructor(style) {
        this.style = style;
    }
    render(children) {
        return <DigiCredChatGradientBackground style={this.style}>{children}</DigiCredChatGradientBackground>;
    }
}
export default DigiCredChatBackgroundRenderer;
