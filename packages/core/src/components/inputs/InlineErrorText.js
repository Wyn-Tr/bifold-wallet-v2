import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme';
import { testIdWithKey } from '../../utils/testable';
import { ThemedText } from '../texts/ThemedText';
export var InlineErrorType;
(function (InlineErrorType) {
    InlineErrorType[InlineErrorType["error"] = 0] = "error";
    InlineErrorType[InlineErrorType["warning"] = 1] = "warning";
})(InlineErrorType || (InlineErrorType = {}));
const InlineErrorText = ({ message, inlineType, config }) => {
    const { InputInlineMessage } = useTheme();
    const style = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignContent: 'center',
            marginVertical: 5,
            paddingRight: 20,
        },
        icon: { marginRight: 4 },
    });
    const color = inlineType === InlineErrorType.warning
        ? InputInlineMessage.inlineWarningText.color
        : InputInlineMessage.inlineErrorText.color;
    const props = { height: 24, width: 24, color: color, style: style.icon };
    const getInlineErrorIcon = () => {
        if (!config.hasErrorIcon)
            return null;
        if (inlineType === InlineErrorType.warning) {
            return <InputInlineMessage.InlineWarningIcon {...props}/>;
        }
        else {
            return <InputInlineMessage.InlineErrorIcon {...props}/>;
        }
    };
    return (<View style={[style.container, config.style]}>
      {getInlineErrorIcon()}
      <ThemedText style={[InputInlineMessage.inlineErrorText]} testID={testIdWithKey('InlineErrorText')}>
        {message}
      </ThemedText>
    </View>);
};
export default InlineErrorText;
