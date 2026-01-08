import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TOKENS, useServices } from '../container-api';
const defaultStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
const ScreenLayout = ({ children, screen }) => {
    //safeArea, customEdges, style, header
    const [screenLayoutOptions] = useServices([TOKENS.OBJECT_LAYOUT_CONFIG]);
    const screenProps = screenLayoutOptions[screen];
    const { safeArea, customEdges, style, Header } = screenProps || {
        safeArea: false,
        customEdges: ['top', 'left', 'right', 'bottom'],
        style: {},
        Header: undefined,
    };
    const Container = ({ children }) => {
        return safeArea ? (<SafeAreaView style={[defaultStyles.container, style]} edges={customEdges || ['top', 'left', 'right', 'bottom']}>
        {children}
      </SafeAreaView>) : (<View style={[defaultStyles.container, style]}>{children}</View>);
    };
    return (<Container>
      {Header && <Header />}
      {children}
    </Container>);
};
export default ScreenLayout;
