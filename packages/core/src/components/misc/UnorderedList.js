import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/theme';
import { ThemedText } from '../texts/ThemedText';
const UnorderedList = ({ unorderedListItems }) => {
    const { ColorPalette } = useTheme();
    return (<>
      {unorderedListItems.map((item, i) => {
            return (<View key={i} style={{ display: 'flex', flexDirection: 'row', marginBottom: 5 }}>
            <ThemedText style={{ color: ColorPalette.brand.unorderedList, paddingLeft: 5 }}>{`\u2022`}</ThemedText>
            <ThemedText style={{ color: ColorPalette.brand.unorderedList, paddingLeft: 5, flex: 1 }}>{item}</ThemedText>
          </View>);
        })}
    </>);
};
export default UnorderedList;
