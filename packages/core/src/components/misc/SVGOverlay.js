import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Mask, Path, Rect } from 'react-native-svg';
import ScanFrame from '../../assets/img/ScanFrame.svg';
export var MaskType;
(function (MaskType) {
    MaskType["QR_CODE"] = "qr-code";
    MaskType["OVAL"] = "oval";
    MaskType["RECTANGLE"] = "rectangle";
    MaskType["ID_CARD"] = "id-card";
    MaskType["CUSTOM"] = "custom";
})(MaskType || (MaskType = {}));
const SVGOverlay = ({ maskType = MaskType.OVAL, customPath, strokeColor = undefined, overlayColor = 'white', overlayOpacity = 0.3, }) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 1.7;
    const renderCutOutShape = () => {
        switch (maskType) {
            case MaskType.OVAL:
                return (<Ellipse cx={centerX} cy={centerY} rx={screenWidth * 0.4} ry={screenHeight * 0.2} fill="transparent" stroke={strokeColor}/>);
            case MaskType.RECTANGLE: {
                const rectSize = screenWidth * 0.9;
                return (<Rect x={centerX - rectSize / 2 - 1} y={centerY - rectSize / 2 - 1} width={rectSize} height={rectSize} fill="transparent"/>);
            }
            case MaskType.ID_CARD: {
                const cardWidth = screenWidth * 0.9;
                const cardHeight = cardWidth / 1.6;
                return (<Rect x={centerX - cardWidth / 2} y={centerY - cardHeight} width={cardWidth} height={cardHeight} rx={15} ry={15} fill="transparent" stroke={strokeColor} strokeWidth={2}/>);
            }
            case MaskType.QR_CODE: {
                const qrSize = screenWidth * 0.8;
                return (<Rect x={centerX - qrSize / 2} y={centerY - qrSize / 1.5} width={qrSize} height={qrSize} fill="transparent" stroke={strokeColor} strokeWidth={2}/>);
            }
            case MaskType.CUSTOM:
                return customPath ? <Path d={customPath} fill="transparent"/> : null;
            default:
                return <Circle cx={centerX} cy={centerY} r={screenWidth / 2} fill="transparent"/>;
        }
    };
    const renderScanFrame = () => {
        if (maskType !== MaskType.QR_CODE)
            return null;
        const qrSize = screenWidth * 0.9;
        const x = centerX - qrSize / 1.956 + 5;
        const y = centerY - qrSize / 1.553 + 5;
        return (<View style={{
                position: 'absolute',
                left: x,
                top: y,
                width: qrSize,
                height: qrSize,
            }}>
        <ScanFrame width="100%" height="100%"/>
      </View>);
    };
    return (<View style={{ position: 'absolute', width: screenWidth, height: screenHeight }}>
      <Svg width={screenWidth} height={screenHeight}>
        <Defs>
          <Mask id="overlayMask">
            <Rect width={screenWidth} height={screenHeight} fill="white"/>
            {React.cloneElement(renderCutOutShape(), { fill: 'black' })}
          </Mask>
        </Defs>

        <Rect width={screenWidth} height={screenHeight} fill={overlayColor} fillOpacity={overlayOpacity} mask="url(#overlayMask)"/>

        {renderCutOutShape()}
      </Svg>
      {renderScanFrame()}
    </View>);
};
export default SVGOverlay;
