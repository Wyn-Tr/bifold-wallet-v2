import { createContext, useContext } from 'react';
import { animatedComponents } from '../animated-components';
export const AnimatedComponentsContext = createContext(animatedComponents);
export const AnimatedComponentsProvider = AnimatedComponentsContext.Provider;
export const useAnimatedComponents = () => useContext(AnimatedComponentsContext);
