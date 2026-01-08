export class AgentBridge {
    agent;
    // one-shot listeners (cleared after first setAgent)
    readyOnce = [];
    // persistent listeners (fire on every setAgent)
    readyPersistent = new Set();
    closedListeners = [];
    changeListeners = [];
    /** Set the live agent (e.g., after PIN unlock) */
    setAgent(agent) {
        this.agent = agent;
        this.readyOnce.forEach((l) => l(agent));
        this.readyOnce = [];
        this.readyPersistent.forEach((l) => l(agent));
        this.changeListeners.forEach((l) => l(agent));
    }
    /** Clear the current agent (e.g., on wallet lock / shutdown) */
    clearAgent(reason) {
        if (!this.agent)
            return;
        this.agent = undefined;
        this.closedListeners.forEach((l) => l(reason));
        this.changeListeners.forEach((l) => l(undefined));
    }
    /**
     * Ready subscription.
     * - Default (persistent = false): one-shot (old behavior). If agent exists, fires immediately.
     * - Persistent (persistent = true): fires now if ready and on every subsequent setAgent.
     */
    onReady(fn, persistent = false) {
        if (persistent) {
            this.readyPersistent.add(fn);
            if (this.agent)
                fn(this.agent);
            return () => this.readyPersistent.delete(fn);
        }
        if (this.agent) {
            fn(this.agent);
            return () => void 0;
        }
        this.readyOnce.push(fn);
        return () => {
            this.readyOnce = this.readyOnce.filter((f) => f !== fn);
        };
    }
    /** Persistent: called whenever agent becomes available or cleared */
    onChange(fn) {
        this.changeListeners.push(fn);
        // Emit current state immediately
        fn(this.agent);
        return () => {
            this.changeListeners = this.changeListeners.filter((f) => f !== fn);
        };
    }
    /** Persistent: called when agent is cleared (lock/shutdown) */
    onClosed(fn) {
        this.closedListeners.push(fn);
        return () => {
            this.closedListeners = this.closedListeners.filter((f) => f !== fn);
        };
    }
    /** Promise helper to await an agent (one-shot) */
    waitForReady() {
        return new Promise((resolve) => {
            const unsub = this.onReady((a) => {
                unsub?.();
                resolve(a);
            });
        });
    }
    get current() {
        return this.agent;
    }
    get isReady() {
        return !!this.agent;
    }
}
