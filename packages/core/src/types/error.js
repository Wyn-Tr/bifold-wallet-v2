export class QrCodeScanError extends Error {
    data;
    details;
    constructor(message, data, details) {
        super(message);
        this.data = data;
        this.details = details;
    }
}
export class BifoldError extends Error {
    title;
    code;
    description;
    constructor(title, description, message, code) {
        super(message);
        this.title = title;
        this.description = description;
        this.code = code;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, BifoldError.prototype);
    }
}
export var InlineErrorPosition;
(function (InlineErrorPosition) {
    InlineErrorPosition[InlineErrorPosition["Above"] = 0] = "Above";
    InlineErrorPosition[InlineErrorPosition["Below"] = 1] = "Below";
})(InlineErrorPosition || (InlineErrorPosition = {}));
