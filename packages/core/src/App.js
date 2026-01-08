import React, { useEffect, useMemo } from 'react';
import { StatusBar } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import Toast from 'react-native-toast-message';
import { useNavigationContainerRef } from '@react-navigation/native';
import { isTablet } from 'react-native-device-info';
import Orientation from 'react-native-orientation-locker';
import { animatedComponents } from './animated-components';
import ErrorModal from './components/modals/ErrorModal';
import toastConfig from './components/toast/ToastConfig';
import { tours } from './constants';
import { ContainerProvider } from './container-api';
import { AnimatedComponentsProvider } from './contexts/animated-components';
import { AuthProvider } from './contexts/auth';
import NavContainer from './contexts/navigation';
import { NetworkProvider } from './contexts/network';
import { StoreProvider } from './contexts/store';
import { ThemeProvider } from './contexts/theme';
import { TourProvider } from './contexts/tour/tour-provider';
import { initStoredLanguage } from './localization';
import RootStack from './navigators/RootStack';
import { themes } from './theme';
import { digicredTheme } from './modules/theme/themes/teal-dark/digicredTheme';
import ErrorBoundaryWrapper from './components/misc/ErrorBoundary';
import { bifoldLoggerInstance } from './services/bifoldLogger';
import { ThemeRegistry, ThemeRegistryProvider, } from './modules/theme';
import { manifest as tealDarkManifest, tabBarConfig as tealDarkTabBar, backgrounds as tealDarkBackgrounds, cardThemes as tealDarkCardThemes, } from './modules/theme/themes/teal-dark';
const createApp = (container) => {
    const AppComponent = () => {
        const navigationRef = useNavigationContainerRef();
        // Create and configure the theme registry with teal-dark theme
        const themeRegistry = useMemo(() => {
            const registry = new ThemeRegistry();
            registry.register(tealDarkManifest);
            registry.setTabBarConfig(tealDarkTabBar);
            registry.setBackgrounds(tealDarkBackgrounds);
            registry.setCardThemes(tealDarkCardThemes);
            registry.setActive('teal-dark');
            return registry;
        }, []);
        useEffect(() => {
            initStoredLanguage().then();
        }, []);
        useEffect(() => {
            // Hide the native splash / loading screen so that our
            // RN version can be displayed.
            SplashScreen.hide();
        }, []);
        if (!isTablet()) {
            Orientation.lockToPortrait();
        }
        return (<ErrorBoundaryWrapper logger={bifoldLoggerInstance}>
        <ContainerProvider value={container}>
          <StoreProvider>
            <ThemeRegistryProvider registry={themeRegistry} initialThemeId="teal-dark">
              <ThemeProvider themes={[digicredTheme, ...themes]} defaultThemeName={digicredTheme.themeName}>
                <NavContainer navigationRef={navigationRef}>
                  <AnimatedComponentsProvider value={animatedComponents}>
                    <AuthProvider>
                      <NetworkProvider>
                        <StatusBar hidden={false} barStyle="light-content" backgroundColor="transparent" translucent={true}/>
                        <ErrorModal />
                        <TourProvider tours={tours} overlayColor={'gray'} overlayOpacity={0.7}>
                          <RootStack />
                        </TourProvider>
                        <Toast topOffset={15} config={toastConfig}/>
                      </NetworkProvider>
                    </AuthProvider>
                  </AnimatedComponentsProvider>
                </NavContainer>
              </ThemeProvider>
            </ThemeRegistryProvider>
          </StoreProvider>
        </ContainerProvider>
      </ErrorBoundaryWrapper>);
    };
    return AppComponent;
};
export default createApp;
