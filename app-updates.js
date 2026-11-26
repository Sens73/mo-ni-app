/** Code updates wait until the child has finished the current activity. */
export function canActivateAppUpdate(state, activeElement) {
  return !state.gameActive && state.view !== "viewer"
    && !state.modal
    && !String(state.contactMessage || "").trim()
    && !activeElement?.closest?.("dialog[open]")
    && !activeElement?.matches?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
}

/** Keep one waiting worker and activate it once a safe opportunity arrives. */
export function createAppUpdateCoordinator({
  canActivate,
  activate = worker => worker.postMessage({ type: "SKIP_WAITING" })
}) {
  const activated = new WeakSet();
  let pendingWorker = null;

  function tryActivate() {
    if (!pendingWorker || !canActivate()) return false;
    const worker = pendingWorker;
    if (activated.has(worker)) {
      pendingWorker = null;
      return false;
    }
    activate(worker);
    activated.add(worker);
    pendingWorker = null;
    return true;
  }

  return {
    offer(worker) {
      if (!worker || typeof worker.postMessage !== "function" || activated.has(worker)) return false;
      pendingWorker = worker;
      return tryActivate();
    },
    tryActivate,
    get pendingWorker() { return pendingWorker; }
  };
}
