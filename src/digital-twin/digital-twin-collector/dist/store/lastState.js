"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = getStore;
exports.setLastState = setLastState;
exports.setLastRecommendation = setLastRecommendation;
exports.getLastKnownState = getLastKnownState;
exports.getLastKnownProfile = getLastKnownProfile;
const store = {
    lastState: null,
    lastRecommendation: null,
    lastCollection: null,
    lastClientProfile: null,
    collectionsTotal: 0,
};
function getStore() {
    return store;
}
function setLastState(state, profile) {
    store.lastState = state;
    store.lastClientProfile = profile;
    store.lastCollection = new Date().toISOString();
    store.collectionsTotal += 1;
}
function setLastRecommendation(rec) {
    store.lastRecommendation = rec;
}
function getLastKnownState() {
    return store.lastState;
}
function getLastKnownProfile() {
    return store.lastClientProfile;
}
