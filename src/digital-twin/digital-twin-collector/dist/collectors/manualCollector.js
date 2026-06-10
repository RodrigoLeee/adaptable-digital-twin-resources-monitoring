"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processManualCollection = processManualCollection;
const stateNormalizer_1 = require("../normalizer/stateNormalizer");
const apiSender_1 = require("../sender/apiSender");
const lastState_1 = require("../store/lastState");
const sse_1 = require("../sse");
const logger_1 = __importDefault(require("../logger"));
async function processManualCollection(body) {
    const { state: rawState, sla, client_profile } = body;
    const state = (0, stateNormalizer_1.normalizeManualState)(rawState);
    const payload = { state, sla, client_profile };
    logger_1.default.info('Sending manual state to API', { client_id: client_profile.client_id });
    const recommendation = await (0, apiSender_1.sendToApi)(payload);
    (0, lastState_1.setLastState)(state, client_profile);
    (0, lastState_1.setLastRecommendation)(recommendation);
    await (0, apiSender_1.saveResult)(client_profile.client_id, recommendation);
    (0, sse_1.broadcastRecommendation)(recommendation);
    logger_1.default.info('Manual collection complete', {
        client_id: client_profile.client_id,
        status: recommendation.status,
    });
    return { ...recommendation, client_profile };
}
