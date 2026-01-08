import { createContext, useContext } from 'react';
import { BaseTourID } from '../../types/tour';
export const ORIGIN_SPOT = {
    height: 0,
    width: 0,
    x: 0,
    y: 0,
};
export const TourContext = createContext({
    currentTour: BaseTourID.HomeTour,
    currentStep: undefined,
    changeSpot: () => undefined,
    next: () => undefined,
    previous: () => undefined,
    spot: ORIGIN_SPOT,
    start: () => undefined,
    tours: {},
    stop: () => undefined,
});
/**
 * React hook to access the {@link Tour} context.
 *
 * @returns the Tour context
 */
export function useTour() {
    const { currentTour, currentStep, changeSpot, next, previous, start, stop } = useContext(TourContext);
    return {
        currentTour,
        currentStep,
        changeSpot,
        next,
        previous,
        start,
        stop,
    };
}
