import { useAgent, useConnectionById, useConnections } from '@credo-ts/react-hooks';
import { useMemo, useState } from 'react';
export const useOutOfBandById = (oobId) => {
    const { agent } = useAgent();
    const [oob, setOob] = useState(undefined);
    if (!oob) {
        agent?.oob.findById(oobId).then((res) => {
            if (res) {
                setOob(res);
            }
        });
    }
    return oob;
};
export const useConnectionByOutOfBandId = (outOfBandId) => {
    const reuseConnectionId = useOutOfBandById(outOfBandId)?.reuseConnectionId;
    const { records: connections } = useConnections();
    return useMemo(() => connections.find((connection) => connection.outOfBandId === outOfBandId ||
        // Check for a reusable connection
        (reuseConnectionId && connection.id === reuseConnectionId)), [connections, outOfBandId, reuseConnectionId]);
};
export const useOutOfBandByConnectionId = (connectionId) => {
    const connection = useConnectionById(connectionId);
    return useOutOfBandById(connection?.outOfBandId ?? '');
};
