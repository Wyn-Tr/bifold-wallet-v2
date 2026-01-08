import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text, StatusBar, Switch, Animated, } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore, testIdWithKey, } from '@bifold/core';
import { Screens, Stacks } from '../../../../packages/core/src/types/navigators';
import { DispatchAction } from '@bifold/core/src/contexts/reducers/store';
import { getBuildNumber, getVersion } from 'react-native-device-info';
import { GradientBackground } from '../components';
import { DigiCredColors } from '../theme';
const ExpandableCard = ({ title, description, isEnabled, onToggle, expanded, onPress, }) => {
    const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;
    useEffect(() => {
        Animated.timing(rotation, {
            toValue: expanded ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [expanded, rotation]);
    const rotateInterpolate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });
    return (<View style={styles.expandableCard}>
      <TouchableOpacity style={styles.expandableHeader} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Icon name="chevron-down" size={24} color={DigiCredColors.text.secondary}/>
        </Animated.View>
      </TouchableOpacity>

      {expanded && (<View style={styles.expandableContent}>
          <Text style={styles.cardDescription}>{description}</Text>
          <View style={styles.toggleRow}>
            <Switch value={isEnabled} onValueChange={onToggle} trackColor={{ false: '#3e3e3e', true: DigiCredColors.button.primary }} thumbColor={isEnabled ? '#FFFFFF' : '#f4f3f4'} ios_backgroundColor="#3e3e3e"/>
            <Text style={styles.toggleLabel}>Enable</Text>
          </View>
        </View>)}
    </View>);
};
const MenuCard = ({ title, onPress, testID }) => (<TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.7} testID={testID}>
    <Text style={styles.menuCardTitle}>{title}</Text>
  </TouchableOpacity>);
const Settings = ({ navigation }) => {
    useTranslation(); // Hook available for future i18n
    const [store, dispatch] = useStore();
    const [biometricsExpanded, setBiometricsExpanded] = useState(true);
    const handleBiometryToggle = async (value) => {
        dispatch({
            type: DispatchAction.USE_BIOMETRY,
            payload: [value],
        });
    };
    return (<GradientBackground>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Section: Contacts */}
          <Text style={styles.sectionTitle}>Contacts</Text>
          <MenuCard title="Contacts" onPress={() => navigation.getParent()?.navigate(Stacks.ContactStack, { screen: Screens.Contacts })} testID={testIdWithKey('Contacts')}/>

          {/* Section: App Settings */}
          <Text style={styles.sectionTitle}>App Settings</Text>

          {/* Biometrics Expandable Card */}
          <ExpandableCard title="Biometrics" description="The DigiCred wallet defaults to using your biometrics (face recognition or fingerprint) to unlock the application. We use a PIN as a backup if your biometrics are not working. You can use this control to turn off the biometric unlock." isEnabled={store.preferences.useBiometry} onToggle={handleBiometryToggle} expanded={biometricsExpanded} onPress={() => setBiometricsExpanded(!biometricsExpanded)}/>

          <MenuCard title="Change PIN" onPress={() => navigation.navigate(Screens.ChangePIN)} testID={testIdWithKey('ChangePIN')}/>

          <MenuCard title="Language" onPress={() => navigation.navigate(Screens.Language)} testID={testIdWithKey('Language')}/>

          {/* Section: Wallet Management */}
          <Text style={styles.sectionTitle}>Wallet Management</Text>

          <MenuCard title="Transfer Wallet" onPress={() => navigation.navigate(Screens.ExportWalletIntro)} testID={testIdWithKey('TransferWallet')}/>

          <MenuCard title="Restore Wallet" onPress={() => navigation.navigate(Screens.ImportWallet)} testID={testIdWithKey('RestoreWallet')}/>

          {/* Section: About */}
          <Text style={styles.sectionTitle}>About</Text>

          <MenuCard title="Demographics" onPress={() => {
            // TODO: Navigate to demographics screen
        }} testID={testIdWithKey('Demographics')}/>

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>
              Version {getVersion()} Build ({getBuildNumber()})
            </Text>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: DigiCredColors.text.primary,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    expandableCard: {
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    expandableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    expandableContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: DigiCredColors.text.primary,
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 22,
        color: DigiCredColors.text.secondary,
        marginBottom: 16,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleLabel: {
        fontSize: 14,
        color: DigiCredColors.text.primary,
        marginLeft: 12,
    },
    menuCard: {
        backgroundColor: 'rgba(30, 50, 50, 0.6)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    menuCardTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: DigiCredColors.text.primary,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: DigiCredColors.text.secondary,
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 20,
    },
    versionText: {
        fontSize: 13,
        color: DigiCredColors.text.secondary,
    },
});
export default Settings;
