const Orientation = {
    initialOrientation: 'PORTRAIT',
};
const useOrientationChange = jest.fn();
var OrientationType;
(function (OrientationType) {
    OrientationType["PORTRAIT"] = "PORTRAIT";
})(OrientationType || (OrientationType = {}));
export { Orientation, useOrientationChange, OrientationType };
