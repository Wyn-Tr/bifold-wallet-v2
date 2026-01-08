import React from 'react';
import { View } from 'react-native';
import { Header } from '@react-navigation/stack';
import { useServices, TOKENS } from '../../container-api';
const HeaderWithBanner = (props) => {
    const [NotificationBanner] = useServices([TOKENS.COMPONENT_NOTIFICATION_BANNER]);
    return (<View>
      <Header {...props}/>
      <NotificationBanner />
    </View>);
};
export default HeaderWithBanner;
