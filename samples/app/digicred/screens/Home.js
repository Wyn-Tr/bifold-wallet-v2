import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useConnections } from '@credo-ts/react-hooks';
import { ConnectionType, DidExchangeState } from '@credo-ts/core';
import { testIdWithKey, useStore, getConnectionName } from '@bifold/core';
import { GradientBackground } from '../components';
import { DigiCredColors } from '../theme';
import { TOKENS, useServices } from '../../../../packages/core/src/container-api';
import { Screens, Stacks } from '../../../../packages/core/src/types/navigators';
const ContactCard = ({ name, date, imageUrl, hasUnread, onPress }) => {
    return (<TouchableOpacity style={styles.contactCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.contactAvatar}>
        {imageUrl ? (<Image source={{ uri: imageUrl }} style={styles.avatarImage}/>) : (<View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>)}
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactName} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.contactDate}>{date}</Text>
      </View>
      <View style={styles.rightSection}>
        {hasUnread && <View style={styles.unreadDot}/>}
        <Icon name="chevron-right" size={24} color={DigiCredColors.text.secondary}/>
      </View>
    </TouchableOpacity>);
};
const Home = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const [store] = useStore();
    const [config] = useServices([TOKENS.CONFIG]);
    const contactHideList = config?.contactHideList;
    const connectionsResult = useConnections();
    const { records: connections = [] } = connectionsResult ?? { records: [] };
    const filteredConnections = useMemo(() => {
        if (!connections || !Array.isArray(connections))
            return [];
        return connections.filter((connection) => {
            if (connection.connectionTypes.includes(ConnectionType.Mediator)) {
                return false;
            }
            const contactName = connection.theirLabel || connection.alias;
            if (contactHideList?.includes(contactName ?? '')) {
                return false;
            }
            if (!store.preferences.developerModeEnabled && connection.state !== DidExchangeState.Completed) {
                return false;
            }
            return true;
        });
    }, [connections, contactHideList, store.preferences.developerModeEnabled]);
    const handleScanPress = useCallback(() => {
        navigation.navigate(Stacks.ConnectStack, { screen: Screens.Scan });
    }, [navigation]);
    const handleContactPress = useCallback((connectionId) => {
        navigation.navigate(Screens.Chat, { connectionId });
    }, [navigation]);
    const formatDate = (dateString) => {
        if (!dateString)
            return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 24) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }
        return date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
        });
    };
    const sortedConnections = useMemo(() => {
        return [...filteredConnections].sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt).getTime();
            return dateB - dateA;
        });
    }, [filteredConnections]);
    const renderContact = ({ item }) => {
        const contactName = getConnectionName(item, store.preferences.alternateContactNames) || 'Unknown Contact';
        return (<ContactCard name={contactName} date={formatDate((item.updatedAt || item.createdAt).toISOString())} hasUnread={false} onPress={() => handleContactPress(item.id)}/>);
    };
    return (<>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <GradientBackground>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('Screens.Home') || 'Home'}</Text>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanPress} testID={testIdWithKey('ScanButton')} accessibilityLabel={t('Home.Scan') || 'Scan QR Code'}>
              <Icon name="qrcode-scan" size={24} color={DigiCredColors.text.primary}/>
            </TouchableOpacity>
          </View>
          <FlatList data={sortedConnections} renderItem={renderContact} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}/>
        </View>
      </GradientBackground>
    </>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
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
    scanButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        flexGrow: 1,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 50, 50, 0.8)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    contactAvatar: {
        width: 50,
        height: 50,
        borderRadius: 12,
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: DigiCredColors.card.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: DigiCredColors.text.primary,
    },
    contactContent: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: DigiCredColors.text.primary,
    },
    contactDate: {
        fontSize: 12,
        color: DigiCredColors.text.secondary,
        marginTop: 4,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#14FFEC',
        marginRight: 8,
    },
    statusIos: {
        width: '100%',
        height: '10%',
        position: 'absolute',
        top: 0,
        backgroundColor: DigiCredColors.homeNoChannels.darkCircle,
    },
});
export default Home;
