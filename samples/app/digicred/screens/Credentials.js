import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, FlatList, StatusBar, TouchableOpacity, } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds';
import { CredentialState, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core';
import { useCredentialByState } from '@credo-ts/react-hooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore, CredentialCard, useTour, DispatchAction, testIdWithKey, } from '@bifold/core';
import { useOpenIDCredentials } from '@bifold/core/src/modules/openid/context/OpenIDCredentialRecordProvider';
import { CredentialErrors } from '@bifold/core/src/types/credentials';
import { OpenIDCredentialType } from '@bifold/core/src/modules/openid/types';
import { TOKENS, useServices } from '../../../../packages/core/src/container-api';
import { Screens, Stacks } from '../../../../packages/core/src/types/navigators';
import { GradientBackground } from '../components';
import { DigiCredColors } from '../theme';
const Credentials = () => {
    const { t } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigation = useNavigation();
    const [store, dispatch] = useStore();
    const { start, stop } = useTour();
    const screenIsFocused = useIsFocused();
    const [CredentialListOptions, , credentialListFooter, { enableTours: enableToursConfig, credentialHideList },] = useServices([
        TOKENS.COMPONENT_CRED_LIST_OPTIONS,
        TOKENS.COMPONENT_CRED_EMPTY_LIST,
        TOKENS.COMPONENT_CRED_LIST_FOOTER,
        TOKENS.CONFIG,
    ]);
    const { openIdState: { w3cCredentialRecords, sdJwtVcRecords }, } = useOpenIDCredentials();
    let credentials = [
        ...useCredentialByState(CredentialState.CredentialReceived),
        ...useCredentialByState(CredentialState.Done),
        ...w3cCredentialRecords,
        ...sdJwtVcRecords,
    ];
    const CredentialListFooter = credentialListFooter;
    // CredentialEmptyList available via: credentialEmptyList as React.FC<EmptyListProps>
    // Filter out hidden credentials when not in dev mode
    if (!store.preferences.developerModeEnabled) {
        credentials = credentials.filter((r) => {
            const credDefId = r.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId;
            return !credentialHideList?.includes(credDefId);
        });
    }
    useEffect(() => {
        const shouldShowTour = enableToursConfig && store.tours.enableTours && !store.tours.seenCredentialsTour;
        if (shouldShowTour && screenIsFocused) {
            start();
            dispatch({
                type: DispatchAction.UPDATE_SEEN_CREDENTIALS_TOUR,
                payload: [true],
            });
        }
    }, [enableToursConfig, store.tours.enableTours, store.tours.seenCredentialsTour, screenIsFocused, start, dispatch]);
    // stop the tour when the screen unmounts
    useEffect(() => {
        return stop;
    }, [stop]);
    const handleScanPress = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation.navigate(Stacks.ConnectStack, { screen: Screens.Scan });
    };
    const renderCardItem = (cred) => {
        return (<CredentialCard credential={cred} credentialErrors={cred.revocationNotification?.revocationDate && [CredentialErrors.Revoked]} onPress={() => {
                if (cred instanceof W3cCredentialRecord) {
                    navigation.navigate(Screens.OpenIDCredentialDetails, {
                        credentialId: cred.id,
                        type: OpenIDCredentialType.W3cCredential,
                    });
                }
                else if (cred instanceof SdJwtVcRecord) {
                    navigation.navigate(Screens.OpenIDCredentialDetails, {
                        credentialId: cred.id,
                        type: OpenIDCredentialType.SdJwtVc,
                    });
                }
                else {
                    navigation.navigate(Screens.CredentialDetails, { credentialId: cred.id });
                }
            }}/>);
    };
    const renderEmptyState = () => (<View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Icon name="card-multiple-outline" size={48} color={DigiCredColors.button.primary}/>
      </View>
      <Text style={styles.emptyTitle}>No Credentials Yet</Text>
      <Text style={styles.emptySubtitle}>
        Connect with an organization to receive your first credential.
      </Text>
      <TouchableOpacity style={styles.scanActionButton} onPress={handleScanPress} testID={testIdWithKey('ScanToConnect')}>
        <Icon name="qrcode-scan" size={20} color="#FFFFFF"/>
        <Text style={styles.scanActionButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>);
    return (<GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('Screens.Credentials') || 'Credentials'}</Text>
        </View>

        {/* Credentials List */}
        <FlatList data={credentials.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())} keyExtractor={(credential) => credential.id} renderItem={({ item: credential, index }) => (<View style={[styles.cardContainer, index === credentials.length - 1 && styles.lastCard]}>
              {renderCardItem(credential)}
            </View>)} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListEmptyComponent={renderEmptyState} ListFooterComponent={() => <CredentialListFooter credentialsCount={credentials.length}/>}/>
        <CredentialListOptions />
      </View>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50, // Account for status bar
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: DigiCredColors.text.primary,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        flexGrow: 1,
    },
    cardContainer: {
        marginTop: 15,
    },
    lastCard: {
        marginBottom: 45,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: -60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: DigiCredColors.text.primary,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 15,
        color: DigiCredColors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    scanActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DigiCredColors.button.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    scanActionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
export default Credentials;
