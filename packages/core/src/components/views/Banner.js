import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DispatchAction } from '../../contexts/reducers/store';
import { useStore } from '../../contexts/store';
import { useTheme } from '../../contexts/theme';
import { testIdWithKey } from '../../utils/testable';
import { ThemedText } from '../texts/ThemedText';
export const Banner = () => {
    const { t } = useTranslation();
    const { ColorPalette } = useTheme();
    const [store, dispatch] = useStore();
    const [expanded, setExpanded] = useState(false);
    const bannerMessages = store.preferences.bannerMessages;
    const alertMessage = {
        id: 'alertMessage',
        title: t('Banner.AlertsLength', { alerts: bannerMessages.length }),
        type: 'error',
        variant: 'summary',
    };
    const dismissBanner = (key) => {
        dispatch({
            type: DispatchAction.REMOVE_BANNER_MESSAGE,
            payload: [key],
        });
    };
    if (!bannerMessages || bannerMessages.length == 0) {
        return null;
    }
    if (bannerMessages.length === 1) {
        const message = bannerMessages[0];
        return (<BannerSection id={message.id} key={message.id} title={message.title} type={message.type} variant="detail" onDismiss={() => dismissBanner(message.id)} dismissible={message.dismissible}/>);
    }
    return (<View>
      <BannerSection id={alertMessage.id} title={t('Banner.AlertsLength', { alerts: bannerMessages.length })} type={alertMessage.type} variant={alertMessage.variant} expanded={expanded} onToggle={() => setExpanded(!expanded)} dismissible={alertMessage.dismissible}/>
      {expanded &&
            bannerMessages.map((message) => (<React.Fragment key={message.id}>
            {/* Render a divider between the banners when multiple banners exist */}
            <View style={{ height: 2, backgroundColor: ColorPalette.brand.primaryBackground }}/>
            <BannerSection id={message.id} key={message.id} title={message.title} type={message.type} variant="detail" onDismiss={() => dismissBanner(message.id)} dismissible={message.dismissible}/>
          </React.Fragment>))}
    </View>);
};
export const BannerSection = ({ title, type, onDismiss, dismissible = true, variant, expanded, onToggle, }) => {
    const { Spacing, ColorPalette, SettingsTheme } = useTheme();
    const styles = StyleSheet.create({
        container: {
            backgroundColor: ColorPalette.brand.primary,
            flexDirection: 'row',
            alignItems: 'center',
            padding: Spacing.md,
        },
        icon: {
            marginRight: Spacing.md,
        },
    });
    const iconName = (type) => {
        switch (type) {
            case 'error':
                return 'alert-circle';
            case 'warning':
                return 'alert';
            case 'info':
                return 'information';
            case 'success':
                return 'check-circle';
            default:
                return 'information';
        }
    };
    // Use theme colors for status indicators
    const bannerColor = (type) => {
        switch (type) {
            case 'error':
                return SettingsTheme.newSettingColors.deleteBtn;
            case 'warning':
                return SettingsTheme.newSettingColors.warningColor || '#F8BB47';
            case 'info':
                return SettingsTheme.newSettingColors.buttonColor;
            case 'success':
                return SettingsTheme.newSettingColors.successColor || ColorPalette.semantic.success;
            default:
                return SettingsTheme.newSettingColors.buttonColor;
        }
    };
    // If more details are needed we might need to push the banner down to accommodate the extra information
    return (<TouchableOpacity style={{ ...styles.container, backgroundColor: bannerColor(type) }} testID={testIdWithKey(`button-${type}`)} onPress={() => {
            if (variant === 'summary' && onToggle) {
                onToggle();
            }
            else if (dismissible && onDismiss) {
                onDismiss();
            }
        }}>
      <Icon name={iconName(type)} size={24} color={type === 'warning' ? ColorPalette.brand.secondaryBackground : ColorPalette.grayscale.white} style={styles.icon} testID={testIdWithKey(`icon-${type}`)}/>
      <ThemedText variant={'bold'} style={{
            color: type === 'warning' ? ColorPalette.brand.secondaryBackground : ColorPalette.grayscale.white,
            flex: 1,
        }} testID={testIdWithKey(`text-${type}`)}>
        {title}
      </ThemedText>
      {variant === 'summary' && <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="white"/>}
    </TouchableOpacity>);
};
