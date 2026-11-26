import assert from "node:assert/strict";
import { canActivateAppUpdate, createAppUpdateCoordinator } from "../app-updates.js";

const idle = { view: "home", modal: null, contactMessage: "" };
const input = { matches: selector => selector.includes("input") };
const button = { matches: () => false };
const downloadDialogButton = { matches: () => false, closest: selector => selector === "dialog[open]" ? {} : null };
assert.equal(canActivateAppUpdate(idle, button), true);
assert.equal(canActivateAppUpdate({ ...idle, view: "viewer" }, button), false);
assert.equal(canActivateAppUpdate({ ...idle, modal: "about" }, button), false);
assert.equal(canActivateAppUpdate(idle, input), false);
assert.equal(canActivateAppUpdate({ ...idle, view: "workbooks" }, downloadDialogButton), false);
assert.equal(canActivateAppUpdate({ ...idle, contactMessage: "Bitte erklärt mir Aufgabe 3." }, button), false);
assert.equal(canActivateAppUpdate({ ...idle, contactMessage: "  \n " }, button), true);

let state = { ...idle, view: "viewer" };
let activeElement = button;
const messages = [];
const worker = { postMessage: message => messages.push(message) };
const coordinator = createAppUpdateCoordinator({ canActivate: () => canActivateAppUpdate(state, activeElement) });
assert.equal(coordinator.offer(worker), false);
assert.equal(coordinator.pendingWorker, worker);
assert.deepEqual(messages, []);

// Leaving a video is insufficient if the child is writing a message afterward.
state = { ...idle, view: "more", contactMessage: "Meine Frage" };
assert.equal(coordinator.tryActivate(), false);
state.contactMessage = "";
activeElement = input;
assert.equal(coordinator.tryActivate(), false);
activeElement = downloadDialogButton;
assert.equal(coordinator.tryActivate(), false, "A pending PDF download dialog also protects the activity");
activeElement = button;
assert.equal(coordinator.tryActivate(), true);
assert.deepEqual(messages, [{ type: "SKIP_WAITING" }]);
assert.equal(coordinator.pendingWorker, null);
assert.equal(coordinator.offer(worker), false);
assert.equal(coordinator.tryActivate(), false);
assert.equal(messages.length, 1);

// A newer waiting version supersedes an earlier waiting version while busy.
state = { ...idle, modal: "install" };
const oldMessages = [];
const newMessages = [];
const olderWorker = { postMessage: message => oldMessages.push(message) };
const newerWorker = { postMessage: message => newMessages.push(message) };
assert.equal(coordinator.offer(olderWorker), false);
assert.equal(coordinator.offer(newerWorker), false);
assert.equal(coordinator.pendingWorker, newerWorker);
state.modal = null;
assert.equal(coordinator.tryActivate(), true);
assert.deepEqual(oldMessages, []);
assert.deepEqual(newMessages, [{ type: "SKIP_WAITING" }]);
assert.equal(coordinator.offer(null), false);
assert.equal(coordinator.offer({}), false);

console.log("App updates: video, dialog, focused inputs and contact drafts protected; busy-to-safe activation and one message per worker verified.");
