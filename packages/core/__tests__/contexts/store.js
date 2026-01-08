import { defaultState } from '../../src/contexts/store';
export const testDefaultState = {
    ...defaultState,
    preferences: {
        ...defaultState.preferences,
        walletName: 'test-wallet',
    },
    stateLoaded: true,
};
