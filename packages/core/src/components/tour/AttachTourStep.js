import React, { cloneElement, useContext, useEffect, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { TourContext } from '../../contexts/tour/tour-context';
import { testIdWithKey } from '../../utils/testable';
/**
 * React functional component used to attach and step to another component by
 * only wrapping it. Use its props to customize the behavior.
 *
 * @param props the component props
 * @returns an AttachTourStep React element
 */
export function AttachTourStep({ children, fill = false, index, tourID }) {
    const { currentStep, currentTour, changeSpot } = useContext(TourContext);
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const childRef = useRef(null);
    useEffect(() => {
        if (currentTour === tourID && currentStep === index) {
            childRef.current?.measureInWindow((x, y, width, height) => {
                changeSpot({ height, width, x, y });
            });
        }
    }, [currentTour, tourID, currentStep, index, windowWidth, windowHeight, changeSpot]);
    const { style, ...rest } = children.props;
    const childStyle = style ?? {};
    return (<View testID={testIdWithKey('AttachTourStep')} ref={childRef} style={{ alignSelf: fill ? 'stretch' : 'center', ...childStyle }} collapsable={false} focusable={false}>
      {cloneElement(children, rest, children.props?.children)}
    </View>);
}
