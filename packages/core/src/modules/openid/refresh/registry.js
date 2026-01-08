import { createStore } from 'zustand/vanilla';
export const credentialRegistry = createStore((set, get) => ({
    byId: {},
    expired: [],
    checked: [],
    replacements: {},
    refreshing: {},
    blocked: {},
    lastSweepAt: undefined,
    upsert: (cred) => set((s) => ({ byId: { ...s.byId, [cred.id]: cred } })),
    markRefreshing: (id) => set((s) => ({ refreshing: { ...s.refreshing, [id]: true } })),
    clearRefreshing: (id) => set((s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _drop, ...rest } = s.refreshing;
        return { refreshing: rest };
    }),
    markExpiredWithReplacement: (oldId, replacement) => set((s) => ({
        expired: s.expired.includes(oldId) ? s.expired : [...s.expired, oldId],
        checked: s.checked.includes(oldId) ? s.checked : [...s.checked, oldId],
        replacements: { ...s.replacements, [oldId]: replacement },
    })),
    markInvalid: (id) => set((s) => ({
        expired: s.expired.includes(id) ? s.expired : [...s.expired, id],
        checked: s.checked.includes(id) ? s.checked : [...s.checked, id],
    })),
    acceptReplacement: (oldId) => set((s) => {
        const repl = s.replacements[oldId];
        if (!repl)
            return s;
        const byId = { ...s.byId };
        delete byId[oldId];
        byId[repl.id] = repl;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [oldId]: _drop, ...restRepl } = s.replacements;
        return {
            byId,
            replacements: restRepl,
            expired: s.expired.filter((x) => x !== oldId),
            // Once accepted, you can optionally block the oldId as succeeded:
            blocked: { ...s.blocked, [oldId]: { reason: 'succeeded', at: new Date().toISOString() } },
        };
    }),
    clearExpired: (id) => set((s) => ({
        expired: s.expired.filter((x) => x !== id),
    })),
    blockAsSucceeded: (id) => set((s) => ({
        blocked: { ...s.blocked, [id]: { reason: 'succeeded', at: new Date().toISOString() } },
    })),
    blockAsFailed: (id, error) => set((s) => ({
        blocked: { ...s.blocked, [id]: { reason: 'failed', at: new Date().toISOString(), error } },
    })),
    unblock: (id) => set((s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _drop, ...rest } = s.blocked;
        return { blocked: rest };
    }),
    shouldSkip: (id) => {
        const s = get();
        if (s.refreshing[id])
            return true; // in-progress
        if (s.expired.includes(id))
            return true; // replacement already queued
        if (s.blocked[id])
            return true; // previously succeeded/failed
        return false;
    },
    setLastSweep: (iso) => set({ lastSweepAt: iso }),
    reset: () => set({
        byId: {},
        expired: [],
        checked: [],
        replacements: {},
        refreshing: {},
        blocked: {},
        lastSweepAt: undefined,
    }),
}));
// Non-React helpers for workers/services
export const readRegistry = () => credentialRegistry.getState();
export const mutateRegistry = (updater) => credentialRegistry.setState((s) => {
    updater(s);
    return s;
});
export const selectOldIdByReplacementId = (replacementId) => {
    const { replacements } = credentialRegistry.getState();
    for (const [oldId, repl] of Object.entries(replacements)) {
        if (repl.id === replacementId)
            return oldId;
    }
    return undefined;
};
