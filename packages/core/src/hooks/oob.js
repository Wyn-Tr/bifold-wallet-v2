import { useAgent } from '@credo-ts/react-hooks';
import { useState } from 'react';
export const useOutOfBandByReceivedInvitationId = (receivedInvitationId) => {
    const { agent } = useAgent();
    const [oob, setOob] = useState(undefined);
    if (!oob) {
        agent?.oob.findByReceivedInvitationId(receivedInvitationId).then((res) => {
            if (res) {
                setOob(res);
            }
        });
    }
    return oob;
};
