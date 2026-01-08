import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { TourOverlay } from '../../components/tour/TourOverlay';
import { BaseTourID } from '../../types/tour';
import { isChildFunction } from '../../utils/helpers';
import { TourContext, ORIGIN_SPOT, } from './tour-context';
const TourProviderComponent = (props, ref) => {
    const { children, onBackdropPress, overlayColor = 'black', overlayOpacity = 0.45, tours, nativeDriver = false, } = props;
    const [currentTour, setCurrentTour] = useState(BaseTourID.HomeTour);
    const [currentStep, setCurrentStep] = useState();
    const [spot, setSpot] = useState(ORIGIN_SPOT);
    const renderStep = useCallback((index) => {
        if (tours[currentTour]?.[index] !== undefined) {
            setCurrentStep(index);
        }
    }, [currentTour, tours]);
    const changeSpot = useCallback((newSpot) => {
        setSpot(newSpot);
    }, []);
    const start = useCallback((tourId) => {
        setCurrentTour(tourId);
        renderStep(0);
    }, [renderStep]);
    const stop = useCallback(() => {
        setCurrentStep(undefined);
        setSpot(ORIGIN_SPOT);
    }, []);
    const next = useCallback(() => {
        if (currentTour && currentStep !== undefined && tours[currentTour]) {
            currentStep === tours[currentTour].length - 1 ? stop() : renderStep(currentStep + 1);
        }
    }, [stop, renderStep, currentStep, currentTour, tours]);
    const previous = useCallback(() => {
        if (currentStep !== undefined && currentStep > 0) {
            renderStep(currentStep - 1);
        }
    }, [renderStep, currentStep]);
    const tourStep = useMemo(() => {
        return tours?.[currentTour]?.[currentStep ?? 0] ?? { Render: () => <></> };
    }, [currentTour, currentStep, tours]);
    const tour = useMemo(() => ({
        changeSpot,
        currentTour,
        currentStep,
        next,
        previous,
        spot,
        start,
        stop,
        tours,
    }), [changeSpot, currentTour, currentStep, next, previous, spot, start, stop, tours]);
    useImperativeHandle(ref, () => ({
        currentTour,
        currentStep,
        changeSpot,
        next,
        previous,
        start,
        stop,
    }));
    return (<TourContext.Provider value={tour}>
      {isChildFunction(children) ? <TourContext.Consumer>{children}</TourContext.Consumer> : <>{children}</>}

      <TourOverlay color={overlayColor} currentStep={currentStep} currentTour={currentTour} changeSpot={changeSpot} backdropOpacity={overlayOpacity} onBackdropPress={onBackdropPress} spot={spot} tourStep={tourStep} nativeDriver={nativeDriver}/>
    </TourContext.Provider>);
};
export const TourProvider = forwardRef(TourProviderComponent);
