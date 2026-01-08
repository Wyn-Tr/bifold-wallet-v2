import { hashCode, hashToRGBA } from '@bifold/oca';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/theme';
import { testIdWithKey } from '../../utils/testable';
const AvatarView = ({ name, style }) => {
    const { ListItems } = useTheme();
    const styles = StyleSheet.create({
        avatar: {
            ...ListItems.avatarCircle,
            margin: 12,
            borderWidth: 3,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });
    return (<View style={[styles.avatar, { borderColor: hashToRGBA(hashCode(name)) }, style]}>
      <Text style={ListItems.avatarText} testID={testIdWithKey('AvatarName')}>
        {name.charAt(0)}
      </Text>
    </View>);
};
export default AvatarView;
