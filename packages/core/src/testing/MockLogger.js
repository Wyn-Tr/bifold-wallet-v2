import { AbstractBifoldLogger } from '../services/AbstractBifoldLogger';
export class MockLogger extends AbstractBifoldLogger {
    constructor() {
        super();
    }
    test = jest.fn();
    trace = jest.fn();
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
    fatal = jest.fn();
    report = jest.fn();
}
