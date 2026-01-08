/**
 * ProofRenderer
 *
 * Custom renderer for displaying proof requests in chat.
 * Can render as visual cards or default text.
 */
import { ProofState } from '@credo-ts/core';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../contexts/theme';
import { ThemedText } from '../../../components/texts/ThemedText';
/**
 * Default proof card component
 * This is a simplified version - can be extended with custom proof display
 */
export const DefaultProofCard = ({ proof, context, onPress, isLoading }) => {
    const { ColorPalette, SettingsTheme } = useTheme();
    // Determine state label and color using theme colors
    const getStateInfo = () => {
        const successColor = SettingsTheme.newSettingColors.successColor || ColorPalette.semantic.success;
        const errorColor = SettingsTheme.newSettingColors.deleteBtn;
        switch (proof.state) {
            case ProofState.RequestReceived:
                return {
                    label: context.t('ProofRequest.ProofRequest'),
                    color: SettingsTheme.newSettingColors.buttonColor,
                };
            case ProofState.PresentationSent:
                return {
                    label: context.t('ProofRequest.PresentationSent'),
                    color: successColor,
                };
            case ProofState.Done:
                return {
                    label: proof.isVerified
                        ? context.t('ProofRequest.Verified')
                        : context.t('ProofRequest.NotVerified'),
                    color: proof.isVerified ? successColor : errorColor,
                };
            case ProofState.Declined:
                return {
                    label: context.t('ProofRequest.Declined'),
                    color: errorColor,
                };
            default:
                return {
                    label: proof.state,
                    color: SettingsTheme.newSettingColors.textColor,
                };
        }
    };
    const stateInfo = getStateInfo();
    const content = (<View style={[styles.card, { backgroundColor: SettingsTheme.newSettingColors.bgColorUp }]}>
      {/* Header with state */}
      <View style={[styles.header, { backgroundColor: stateInfo.color }]}>
        <ThemedText style={[styles.headerText, { color: ColorPalette.grayscale.white }]}>{stateInfo.label}</ThemedText>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {isLoading ? (<ActivityIndicator size="small" color={SettingsTheme.newSettingColors.buttonColor}/>) : (<>
            <ThemedText style={[styles.title, { color: SettingsTheme.newSettingColors.textBody }]}>
              {context.t('ProofRequest.InformationRequest')}
            </ThemedText>
            <ThemedText style={[styles.description, { color: SettingsTheme.newSettingColors.textColor }]}>
              {context.theirLabel} {context.t('ProofRequest.RequestsInformation')}
            </ThemedText>
            {proof.state === ProofState.RequestReceived && (<ThemedText style={[styles.action, { color: SettingsTheme.newSettingColors.buttonColor }]}>
                {context.t('ProofRequest.TapToView')}
              </ThemedText>)}
          </>)}
      </View>

      {/* Bottom accent line */}
      <View style={[styles.bottomLine, { backgroundColor: stateInfo.color }]}/>
    </View>);
    if (onPress) {
        return (<TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>);
    }
    return content;
};
const styles = StyleSheet.create({
    card: {
        width: 280,
        minHeight: 100,
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    headerText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    body: {
        padding: 12,
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        marginBottom: 8,
    },
    action: {
        fontSize: 12,
        fontWeight: '500',
    },
    bottomLine: {
        height: 4,
    },
});
/**
 * Default proof renderer class
 */
export class DefaultProofRenderer {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    render(proof, context) {
        const CardComponent = this.options.CardComponent || DefaultProofCard;
        const handlePress = this.options.onPress ? () => this.options.onPress(proof, context) : undefined;
        return <CardComponent proof={proof} context={context} onPress={handlePress}/>;
    }
}
/**
 * Factory function to create a DefaultProofRenderer
 */
export function createDefaultProofRenderer(options = {}) {
    return new DefaultProofRenderer(options);
}
