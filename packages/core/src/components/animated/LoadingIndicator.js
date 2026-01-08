import React from 'react';
import { View } from 'react-native';
import DigiCredSplashLogo from '../../assets/img/SplashLogo.svg';
import { testIdWithKey } from '../../utils/testable';
// const timing: Animated.TimingAnimationConfig = {
//   toValue: 1,
//   duration: 2000,
//   useNativeDriver: true,
// }
const LoadingIndicator = () => {
    // const { Assets } = useTheme()
    // const rotationAnim = useRef(new Animated.Value(0))
    // const rotation = rotationAnim.current.interpolate({
    //   inputRange: [0, 1],
    //   outputRange: ['0deg', '360deg'],
    // })
    // const style = StyleSheet.create({
    //   animation: {
    //     position: 'absolute',
    //   },
    // })
    // const imageDisplayOptions = {
    //   fill: '#8484DC',
    //   height: 370,
    //   width: 370,
    // }
    // useEffect(() => {
    //   Animated.loop(Animated.timing(rotationAnim.current, timing)).start()
    // }, [])
    return (<View style={{ alignItems: 'center', justifyContent: 'center' }} testID={testIdWithKey('LoadingActivityIndicator')}>
      <DigiCredSplashLogo width={230} height={230}/>
      {/*<Animated.View style={[style.animation, { transform: [{ rotate: rotation }] }]}>*/}
      {/*  <Assets.svg.activityIndicator {...imageDisplayOptions} />*/}
      {/*</Animated.View>*/}
    </View>);
};
export default LoadingIndicator;
