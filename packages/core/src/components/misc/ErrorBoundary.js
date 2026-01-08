import React from 'react';
import { StyleSheet, Text, useWindowDimensions, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from '../buttons/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getBuildNumber, getVersion } from 'react-native-device-info';
import { testIdWithKey } from '../../utils/testable';
const iconSize = 30;
class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null, reported: false };
    static getDerivedStateFromError(error) {
        return { hasError: true, error, reported: false };
    }
    onDismissModalTouched = () => {
        this.setState({ hasError: false, error: null, reported: false });
    };
    componentDidCatch(error) {
        const { logger } = this.props;
        logger.error('ErrorBoundary caught an error:', error);
    }
    reportError = (error, logger) => {
        if (error) {
            this.setState({ reported: true });
            logger.report(error);
        }
    };
    render() {
        const { hasError, error, reported } = this.state;
        const { t, styles, logger } = this.props;
        if (hasError && error) {
            return (<SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ErrorBoundaryInfoBox title={error.name} description={error.message} secondaryCallToActionTitle={reported ? t('Error.Reported') : t('Error.ReportThisProblem')} secondaryCallToActionPressed={() => this.reportError(error, logger)} secondaryCallToActionDisabled={reported} onCallToActionPressed={this.onDismissModalTouched} onCallToActionLabel={t('Global.Okay')} showVersionFooter/>
        </SafeAreaView>);
        }
        return this.props.children;
    }
}
const ErrorBoundaryInfoBox = ({ title, description, secondaryCallToActionTitle, secondaryCallToActionPressed, secondaryCallToActionDisabled, onCallToActionPressed, onCallToActionLabel, showVersionFooter, }) => {
    const { width } = useWindowDimensions();
    const { t } = useTranslation();
    const styles = StyleSheet.create({
        container: {
            backgroundColor: 'lightgrey',
            borderColor: 'darkgrey',
            borderRadius: 5,
            borderWidth: 1,
            padding: 10,
            minWidth: width - 2 * 25,
            height: 400,
        },
        headerContainer: {
            flexDirection: 'row',
            paddingHorizontal: 5,
            paddingTop: 5,
        },
        bodyContainer: {
            flexDirection: 'column',
            marginLeft: 10,
            paddingHorizontal: 5,
            paddingBottom: 5,
            flexGrow: 0,
        },
        headerText: {
            marginLeft: 7,
            flexShrink: 1,
            alignSelf: 'center',
            color: 'darkred',
        },
        bodyText: {
            flexShrink: 1,
            marginVertical: 16,
            color: 'darkred',
        },
        showDetailsText: {
            fontWeight: 'normal',
            color: 'black',
        },
    });
    return (<View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={styles.headerContainer}>
          <Icon name={'error'} size={iconSize} color={'darkred'}/>
          <Text style={styles.headerText}>{title}</Text>
        </View>
        <TouchableOpacity accessibilityLabel={'dismiss'} accessibilityRole={'button'} onPress={onCallToActionPressed}>
          <Icon name={'close'} size={iconSize} color={'black'}/>
        </TouchableOpacity>
      </View>
      <View style={{ maxHeight: 150, marginBottom: 8 }}>
        <ScrollView>
          <Text style={styles.bodyText}>{description}</Text>
        </ScrollView>
      </View>
      {onCallToActionLabel && (<View style={{ marginBottom: 8 }}>
          <Button buttonType={ButtonType.Critical} title={onCallToActionLabel} onPress={onCallToActionPressed}/>
        </View>)}
      {secondaryCallToActionTitle && (<Button buttonType={ButtonType.Critical} title={secondaryCallToActionTitle} onPress={secondaryCallToActionPressed} disabled={secondaryCallToActionDisabled}/>)}
      {showVersionFooter ? (<Text style={{ flex: 1, marginTop: 8, textAlign: 'center', color: 'darkred' }} testID={testIdWithKey('VersionNumber')}>
          {`${t('Settings.Version')} ${getVersion()} (${getBuildNumber()})`}
        </Text>) : null}
    </View>);
};
const ErrorBoundaryWrapper = ({ children, logger }) => {
    const { t } = useTranslation();
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            padding: 20,
        },
    });
    return (<ErrorBoundary t={t} styles={styles} logger={logger}>
      {children}
    </ErrorBoundary>);
};
export default ErrorBoundaryWrapper;
