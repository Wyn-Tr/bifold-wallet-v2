import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useTheme } from '../../contexts/theme';
import { TourBox } from './TourBox';
export const credentialOfferTourSteps = [
    {
        Render: (props) => {
            const { currentTour, currentStep, next, stop, previous } = props;
            const { t } = useTranslation();
            const { ColorPalette, TextTheme } = useTheme();
            return (<TourBox title={t('Tour.CredentialOffers')} hideLeft rightText={t('Tour.Done')} onRight={stop} currentTour={currentTour} currentStep={currentStep} previous={previous} stop={stop} next={next}>
          <Text style={{
                    ...TextTheme.normal,
                    color: ColorPalette.notification.infoText,
                }} allowFontScaling={false}>
            {t('Tour.CredentialOffersDescription')}
          </Text>
        </TourBox>);
        },
    },
];
