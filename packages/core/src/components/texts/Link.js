import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme';
import { testIdForAccessabilityLabel, testIdWithKey } from '../../utils/testable';
import { ThemedText } from './ThemedText';
const Link = ({ linkText, onPress, style = {}, testID, ...textProps }) => {
    const { ColorPalette } = useTheme();
    const styles = StyleSheet.create({
        link: {
            color: ColorPalette.brand.link,
            textDecorationLine: 'underline',
            alignSelf: 'flex-start',
        },
    });
    return (<ThemedText style={[styles.link, style]} accessibilityLabel={linkText} accessible accessibilityRole={'link'} testID={testID ? testID : testIdWithKey(testIdForAccessabilityLabel(linkText))} onPress={onPress} {...textProps}>
      {linkText}
    </ThemedText>);
};
export default Link;
