import { useCredentials } from '@credo-ts/react-hooks';
import { useMemo } from 'react';
export const useCredentialsByConnectionId = (connectionId) => {
    const { records: credentials } = useCredentials();
    return useMemo(() => credentials.filter((credential) => credential.connectionId === connectionId), [credentials, connectionId]);
};
