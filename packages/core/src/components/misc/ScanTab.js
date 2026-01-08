import React from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../contexts/theme';
import { testIdWithKey } from '../../utils/testable';
import { ThemedText } from '../texts/ThemedText';
const ScanTab = ({ onPress, active, iconName, title }) => {
    const { TabTheme, TextTheme } = useTheme();
    const { fontScale } = useWindowDimensions();
    const showLabels = fontScale * TabTheme.tabBarTextStyle.fontSize < 18;
    const styles = StyleSheet.create({
        container: {
            ...TabTheme.tabBarContainerStyle,
        },
        text: {
            ...TabTheme.tabBarTextStyle,
            color: active ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
            fontWeight: active ? TextTheme.bold.fontWeight : TextTheme.normal.fontWeight,
        },
    });
    return (<TouchableOpacity style={styles.container} onPress={onPress} accessibilityLabel={title} accessibilityRole="tab" testID={testIdWithKey(title)}>
      <Icon name={iconName} size={30} color={styles.text.color}></Icon>
      {showLabels ? <ThemedText style={styles.text}>{title}</ThemedText> : null}
    </TouchableOpacity>);
};
export default ScanTab;
