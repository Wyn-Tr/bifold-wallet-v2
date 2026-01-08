import React, { useMemo } from 'react';
import { NetworkContext } from '../../src/contexts/network';
import networkContext from '../contexts/network';
import { ContainerProvider, TOKENS } from '../../src/container-api';
import { MainContainer } from '../../src/container-impl';
import { container } from 'tsyringe';
import { OpenIDCredentialRecordProvider } from '../../src/modules/openid/context/OpenIDCredentialRecordProvider';
import { MockLogger } from '../../src/testing/MockLogger';
export const BasicAppContext = ({ children }) => {
    const context = useMemo(() => {
        const c = new MainContainer(container.createChildContainer()).init();
        c.resolve(TOKENS.UTIL_LOGGER);
        c.container.registerInstance(TOKENS.UTIL_LOGGER, new MockLogger());
        return c;
    }, []);
    return (<ContainerProvider value={context}>
      <OpenIDCredentialRecordProvider>
        <NetworkContext.Provider value={networkContext}>{children}</NetworkContext.Provider>
      </OpenIDCredentialRecordProvider>
    </ContainerProvider>);
};
export const CustomBasicAppContext = ({ children, container }) => {
    const context = container;
    return (<ContainerProvider value={context}>
      <NetworkContext.Provider value={networkContext}>{children}</NetworkContext.Provider>
    </ContainerProvider>);
};
