import { useState, useEffect, useMemo } from 'react';
import { useNavigationState } from '@react-navigation/native';
/**
 * Hook to manage onboarding workflow state
 * Tracks the onboarding tasks, their completion status.
 */
export const useOnboardingState = (store, config, termsVersion, agent, generateOnboardingWorkflowSteps) => {
    const [onboardingState, setOnboardingState] = useState([]);
    const currentRoute = useNavigationState((state) => state?.routes[state?.index]);
    const activeScreen = useMemo(() => {
        return onboardingState.find((task) => !task.completed)?.name;
    }, [onboardingState]);
    useEffect(() => {
        if (!store.stateLoaded) {
            return;
        }
        const onboardingTasks = generateOnboardingWorkflowSteps(store, config, termsVersion, agent);
        setOnboardingState(onboardingTasks);
    }, [store, config, termsVersion, agent, generateOnboardingWorkflowSteps]);
    return {
        onboardingState,
        setOnboardingState,
        activeScreen,
        currentRoute,
        isComplete: !activeScreen,
    };
};
