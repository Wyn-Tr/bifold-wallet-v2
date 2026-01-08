import { ConnectionType, DidExchangeState } from '@credo-ts/core';
import { useAgent, useConnections } from '@credo-ts/react-hooks';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, FlatList, StyleSheet, View, Text, StatusBar, TouchableOpacity, } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore, Screens, Stacks, testIdWithKey, EventTypes, BifoldError, TOKENS, useServices, } from '@bifold/core';
import { fetchContactsByLatestMessage } from '@bifold/core/src/utils/contacts';
import { GradientBackground } from '../components';
// Hardcoded colors to avoid circular dependency with theme
const Colors = {
    text: { primary: '#FFFFFF', secondary: '#8A9A9A' },
    button: { primary: '#1A7A7A' },
    card: { background: '#1C2B2B' },
};
const ContactItem = ({ contact, onPress }) => {
    const label = contact.theirLabel || contact.alias || 'Unknown Contact';
    const initial = label.charAt(0).toUpperCase();
    return (<TouchableOpacity style={styles.contactItem} onPress={onPress} activeOpacity={0.7} testID={testIdWithKey(`Contact-${contact.id}`)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.contactStatus}>
          {contact.state === DidExchangeState.Completed ? 'Connected' : contact.state}
        </Text>
      </View>
      <Icon name="chevron-right" size={24} color={Colors.text.secondary}/>
    </TouchableOpacity>);
};
const EmptyContacts = ({ onAddContact }) => {
    return (<View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="account-group-outline" size={48} color={Colors.button.primary}/>
      </View>
      <Text style={styles.emptyTitle}>No Contacts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Scan a QR code to connect with organizations and individuals.
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={onAddContact} testID={testIdWithKey('AddFirstContact')}>
        <Icon name="plus" size={20} color="#FFFFFF"/>
        <Text style={styles.addButtonText}>Add Contact</Text>
      </TouchableOpacity>
    </View>);
};
const Contacts = ({ navigation }) => {
    const { t } = useTranslation();
    const { agent } = useAgent();
    const [connections, setConnections] = useState([]);
    const { records: connectionRecords = [] } = useConnections() ?? { records: [] };
    const [store] = useStore();
    const [config] = useServices([TOKENS.CONFIG]);
    const contactHideList = config?.contactHideList;
    useEffect(() => {
        const fetchAndSetConnections = async () => {
            if (!agent)
                return;
            let orderedContacts = await fetchContactsByLatestMessage(agent, connectionRecords);
            // Filter out mediator connections and hidden contacts
            if (!store.preferences.developerModeEnabled) {
                orderedContacts = orderedContacts.filter((r) => {
                    return (!r.connectionTypes.includes(ConnectionType.Mediator) &&
                        !contactHideList?.includes((r.theirLabel || r.alias) ?? '') &&
                        r.state === DidExchangeState.Completed);
                });
            }
            setConnections(orderedContacts);
        };
        fetchAndSetConnections().catch((err) => {
            agent?.config.logger.error('Error fetching contacts:', err);
            const error = new BifoldError(t('Error.Title1046'), t('Error.Message1046'), err?.message ?? err, 1046);
            DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error);
        });
    }, [agent, connectionRecords, store.preferences.developerModeEnabled, contactHideList, t]);
    const handleAddContact = useCallback(() => {
        navigation.getParent()?.navigate(Stacks.ConnectStack, { screen: Screens.Scan, params: { defaultToConnect: true } });
    }, [navigation]);
    const handleContactPress = useCallback((contact) => {
        navigation.navigate(Screens.ContactDetails, { connectionId: contact.id });
    }, [navigation]);
    return (<GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} testID={testIdWithKey('Back')}>
            <Icon name="arrow-left" size={24} color={Colors.text.primary}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contacts</Text>
          <TouchableOpacity onPress={handleAddContact} style={styles.addIconButton} testID={testIdWithKey('AddContact')}>
            <Icon name="plus" size={24} color={Colors.text.primary}/>
          </TouchableOpacity>
        </View>

        {/* Contact List */}
        <FlatList data={connections} keyExtractor={(item) => item.id} renderItem={({ item }) => (<ContactItem contact={item} onPress={() => handleContactPress(item)}/>)} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListEmptyComponent={() => <EmptyContacts onAddContact={handleAddContact}/>}/>
      </View>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    addIconButton: {
        padding: 8,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
        flexGrow: 1,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.button.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    contactStatus: {
        fontSize: 14,
        color: Colors.text.secondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 100,
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
        color: Colors.text.primary,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 15,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.button.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
export default Contacts;
