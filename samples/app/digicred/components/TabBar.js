import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { width: screenWidth } = Dimensions.get('window');
void screenWidth; // Available for future use
const TabItem = ({ label, icon, iconOutline, isActive, badge, onPress, onLayout, animatedScale, }) => {
    return (<TouchableOpacity style={styles.tabItem} onPress={onPress} onLayout={onLayout} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isActive }}>
      <Animated.View style={[
            styles.iconContainer,
            { transform: [{ scale: animatedScale }] }
        ]}>
        <Icon name={isActive ? icon : iconOutline} size={26} color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'}/>
        {badge !== undefined && badge > 0 && (<View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>)}
      </Animated.View>
    </TouchableOpacity>);
};
const tabConfig = [
    { key: 'Tab Home Stack', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { key: 'Tab Credential Stack', label: 'Credentials', icon: 'text-box-multiple', iconOutline: 'text-box-multiple-outline' },
    { key: 'Tab Connect Stack', label: 'Settings', icon: 'cog', iconOutline: 'cog-outline' },
];
// Map route names to tab config keys (using actual TabStacks enum values)
const routeToTabKey = {
    'Tab Home Stack': 'Tab Home Stack',
    'Tab Credential Stack': 'Tab Credential Stack',
    'Tab Connect Stack': 'Tab Connect Stack',
};
const DigiCredTabBar = ({ state, navigation, badges = {}, }) => {
    const insets = useSafeAreaInsets();
    // Animation values
    const pillPosition = useRef(new Animated.Value(0)).current;
    const tabScales = useRef(tabConfig.map(() => new Animated.Value(1))).current;
    // Track tab positions for pill animation
    const tabPositions = useRef([]).current;
    // Current focused index
    const currentIndex = state?.index || 0;
    // Animate pill and icon when tab changes
    useEffect(() => {
        if (tabPositions.length > currentIndex && tabPositions[currentIndex]) {
            const targetTab = tabPositions[currentIndex];
            // Animate pill to new position
            Animated.parallel([
                Animated.spring(pillPosition, {
                    toValue: targetTab.x + (targetTab.width / 2) - 30, // Center the pill
                    useNativeDriver: true,
                    friction: 8,
                    tension: 80,
                }),
                // Scale animation for the active tab icon
                ...tabScales.map((scale, index) => Animated.spring(scale, {
                    toValue: index === currentIndex ? 1.1 : 1,
                    useNativeDriver: true,
                    friction: 6,
                    tension: 100,
                })),
            ]).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);
    // Handle tab layout to track positions
    const handleTabLayout = (index) => (event) => {
        const { x, width } = event.nativeEvent.layout;
        tabPositions[index] = { x, width };
        // Set initial pill position if this is the active tab
        if (index === currentIndex && tabPositions.length > 0) {
            pillPosition.setValue(x + (width / 2) - 30);
        }
    };
    // Render fallback if no navigation state
    if (!state || !navigation) {
        return (<View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.container}>
          {/* Selection pill indicator */}
          <Animated.View style={[
                styles.selectionPill,
                { transform: [{ translateX: pillPosition }] }
            ]}/>
          {tabConfig.map((tab, index) => (<TabItem key={tab.key} label={tab.label} icon={tab.icon} iconOutline={tab.iconOutline} isActive={index === 0} badge={badges[tab.key]} onPress={() => { }} onLayout={handleTabLayout(index)} animatedScale={tabScales[index]}/>))}
        </View>
      </View>);
    }
    return (<View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.container}>
        {/* Animated selection pill indicator */}
        <Animated.View style={[
            styles.selectionPill,
            { transform: [{ translateX: pillPosition }] }
        ]}/>

        {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const tabKey = routeToTabKey[route.name] || route.name;
            const config = tabConfig.find(t => t.key === tabKey) || tabConfig[index % tabConfig.length];
            const onPress = () => {
                const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                }
            };
            return (<TabItem key={route.key} label={config?.label || route.name} icon={config?.icon || 'circle'} iconOutline={config?.iconOutline || 'circle-outline'} isActive={isFocused} badge={badges[route.name]} onPress={onPress} onLayout={handleTabLayout(index)} animatedScale={tabScales[index]}/>);
        })}
      </View>
    </View>);
};
const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
    },
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(20, 45, 45, 0.95)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        position: 'relative',
    },
    selectionPill: {
        position: 'absolute',
        width: 60,
        height: 44,
        backgroundColor: 'rgba(40, 80, 80, 0.8)',
        borderRadius: 22,
        top: 10,
        left: 0,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        zIndex: 1,
    },
    iconContainer: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -12,
        backgroundColor: '#FF6B6B',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
});
export default DigiCredTabBar;
