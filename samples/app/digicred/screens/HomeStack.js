import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Screens } from '../../../../packages/core/src/types/navigators';
import { TOKENS, useServices } from '../../../../packages/core/src/container-api';
const Stack = createStackNavigator();
const DigiCredHomeStack = () => {
    const [Home] = useServices([TOKENS.SCREEN_HOME]);
    return (<Stack.Navigator screenOptions={{
            headerShown: false,
        }}>
      <Stack.Screen name={Screens.Home} component={Home} options={{
            headerShown: false,
        }}/>
    </Stack.Navigator>);
};
export default DigiCredHomeStack;
