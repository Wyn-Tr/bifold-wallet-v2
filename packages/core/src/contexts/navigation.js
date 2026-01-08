import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { useTheme } from './theme';
const NavContainer = ({ navigationRef, children }) => {
    const { NavigationTheme } = useTheme();
    return (<NavigationContainer ref={navigationRef} theme={NavigationTheme}>
      {children}
    </NavigationContainer>);
};
export default NavContainer;
