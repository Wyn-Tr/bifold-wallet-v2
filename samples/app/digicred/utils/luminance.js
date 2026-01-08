export var StatusBarStyles;
(function (StatusBarStyles) {
    StatusBarStyles["Light"] = "light-content";
    StatusBarStyles["Dark"] = "dark-content";
})(StatusBarStyles || (StatusBarStyles = {}));
export var Shade;
(function (Shade) {
    Shade["Light"] = "light";
    Shade["Dark"] = "dark";
})(Shade || (Shade = {}));
export const luminanceForHexColor = (hex) => {
    if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) {
        return;
    }
    const hexAsNumber = Number(`0x${hex.slice(1)}`);
    const [r, g, b] = [(hexAsNumber >> 16) & 255, (hexAsNumber >> 8) & 255, hexAsNumber & 255];
    // Scalars below defined [here](https://en.wikipedia.org/wiki/Relative_luminance)
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return Math.round(y);
};
export const shadeIsLightOrDark = (hex) => {
    const rgbMidPoint = 255 / 2;
    const y = luminanceForHexColor(hex) ?? 0;
    return y <= rgbMidPoint ? Shade.Dark : Shade.Light;
};
export const statusBarStyleForColor = (hex) => {
    const rgbMidPoint = 255 / 2;
    const y = luminanceForHexColor(hex);
    if (typeof y === 'undefined') {
        return;
    }
    return y <= rgbMidPoint ? StatusBarStyles.Light : StatusBarStyles.Dark;
};
