import { useAgent } from '@credo-ts/react-hooks';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import WalletNameForm from '../components/forms/WalletNameForm';
const RenameWallet = () => {
    const navigation = useNavigation();
    const { agent } = useAgent();
    const onCancel = useCallback(() => {
        navigation.goBack();
    }, [navigation]);
    const onSubmitSuccess = useCallback((name) => {
        agent.config.label = name;
        navigation.goBack();
    }, [navigation, agent]);
    return <WalletNameForm isRenaming onCancel={onCancel} onSubmitSuccess={onSubmitSuccess}/>;
};
export default RenameWallet;
