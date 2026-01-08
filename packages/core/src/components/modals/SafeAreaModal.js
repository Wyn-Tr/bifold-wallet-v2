import React from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
const SafeAreaModal = ({ children, ...modalProps }) => {
    return (<Modal {...modalProps}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </Modal>);
};
export default SafeAreaModal;
