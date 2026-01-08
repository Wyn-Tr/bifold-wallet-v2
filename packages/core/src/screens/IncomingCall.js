import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Vibration, Animated, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useConnectionById, useAgent } from '@credo-ts/react-hooks';
import { Screens } from '../types/navigators';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/theme';
import { getConnectionName } from '../utils/helpers';
import { ThemedText } from '../components/texts/ThemedText';
const IncomingCall = ({ route, navigation }) => {
    const { connectionId, threadId, sdp, callerLabel, iceServers } = route.params;
    const connection = useConnectionById(connectionId);
    const [store] = useStore();
    const { agent } = useAgent();
    const { ColorPalette, SettingsTheme } = useTheme();
    const insets = useSafeAreaInsets();
    // Dark theme colors for incoming call interface
    const darkBg = SettingsTheme.newSettingColors.bgColorDown;
    const darkBgSecondary = SettingsTheme.newSettingColors.bgColorUp;
    const textLight = ColorPalette.grayscale.white;
    const textMuted = ColorPalette.grayscale.mediumGrey;
    const errorColor = SettingsTheme.newSettingColors.deleteBtn;
    const successColor = SettingsTheme.newSettingColors.successColor || ColorPalette.semantic.success;
    const contactName = callerLabel || (connection ? getConnectionName(connection, store.preferences.alternateContactNames) : 'Unknown Caller');
    // Animation for pulsing effect
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        // Vibrate pattern: vibrate, pause, vibrate...
        const vibrationPattern = [0, 1000, 500, 1000, 500, 1000];
        Vibration.vibrate(vibrationPattern, true);
        // Pulsing animation for avatar
        const pulse = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]));
        pulse.start();
        return () => {
            Vibration.cancel();
            pulse.stop();
        };
    }, [pulseAnim]);
    const handleAccept = () => {
        Vibration.cancel();
        navigation.replace(Screens.VideoCall, {
            connectionId,
            threadId,
            isIncoming: true,
            remoteSdp: sdp,
            iceServers,
            video: true,
        });
    };
    const handleReject = async () => {
        Vibration.cancel();
        try {
            const agentModules = agent?.modules;
            if (agentModules?.webrtc) {
                await agentModules.webrtc.endCall({
                    connectionId,
                    threadId,
                    reason: 'rejected',
                });
            }
        }
        catch { /* reject error ignored */ }
        navigation.goBack();
    };
    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: darkBg,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
        },
        content: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
        },
        avatarContainer: {
            marginBottom: 32,
        },
        avatarRing: {
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 3,
            borderColor: ColorPalette.brand.primary,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'transparent',
        },
        avatar: {
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: darkBgSecondary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        callerName: {
            fontSize: 28,
            fontWeight: 'bold',
            color: textLight,
            marginBottom: 8,
            textAlign: 'center',
        },
        callType: {
            fontSize: 16,
            color: textMuted,
            marginBottom: 24,
        },
        callingIndicator: {
            flexDirection: 'row',
            gap: 8,
        },
        dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: ColorPalette.brand.primary,
            opacity: 0.3,
        },
        dotDelay1: {
            opacity: 0.6,
        },
        dotDelay2: {
            opacity: 1,
        },
        actionsContainer: {
            paddingBottom: 60,
            paddingHorizontal: 20,
        },
        actions: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: 80,
        },
        actionButtonContainer: {
            alignItems: 'center',
        },
        actionButton: {
            width: 80,
            height: 80,
            borderRadius: 40,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: ColorPalette.grayscale.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
        },
        rejectButton: {
            backgroundColor: errorColor,
        },
        acceptButton: {
            backgroundColor: successColor,
        },
        actionLabel: {
            fontSize: 14,
            color: textMuted,
            marginTop: 12,
            textAlign: 'center',
        },
    }), [darkBg, darkBgSecondary, textLight, textMuted, errorColor, successColor, ColorPalette, insets]);
    return (<View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkBg} translucent/>

      <View style={styles.content}>
        {/* Animated Avatar */}
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Icon name="user" size={64} color={textLight}/>
            </View>
          </View>
        </Animated.View>

        {/* Caller Info */}
        <ThemedText style={styles.callerName}>{contactName}</ThemedText>
        <ThemedText style={styles.callType}>Incoming Video Call</ThemedText>

        {/* Call indicator */}
        <View style={styles.callingIndicator}>
          <View style={styles.dot}/>
          <View style={[styles.dot, styles.dotDelay1]}/>
          <View style={[styles.dot, styles.dotDelay2]}/>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <View style={styles.actions}>
          {/* Reject Button */}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleReject} activeOpacity={0.7}>
              <Icon name="phone-off" size={32} color={textLight}/>
            </TouchableOpacity>
            <ThemedText style={styles.actionLabel}>Decline</ThemedText>
          </View>

          {/* Accept Button */}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAccept} activeOpacity={0.7}>
              <Icon name="phone" size={32} color={textLight}/>
            </TouchableOpacity>
            <ThemedText style={styles.actionLabel}>Accept</ThemedText>
          </View>
        </View>
      </View>
    </View>);
};
export default IncomingCall;
