"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledCollector = startScheduledCollector;
exports.stopScheduledCollector = stopScheduledCollector;
const node_cron_1 = __importDefault(require("node-cron"));
const lastState_1 = require("../store/lastState");
const apiSender_1 = require("../sender/apiSender");
const lastState_2 = require("../store/lastState");
const sse_1 = require("../sse");
const logger_1 = __importDefault(require("../logger"));
let scheduledTask = null;
function startScheduledCollector() {
    const intervalSeconds = parseInt(process.env.COLLECT_INTERVAL_SECONDS || '60', 10);
    if (isNaN(intervalSeconds) || intervalSeconds <= 0) {
        logger_1.default.warn('COLLECT_INTERVAL_SECONDS is invalid, scheduled collector disabled');
        return;
    }
    const cronExpression = `*/${intervalSeconds} * * * * *`;
    logger_1.default.info(`Scheduled collector starting with interval ${intervalSeconds}s (${cronExpression})`);
    scheduledTask = node_cron_1.default.schedule(cronExpression, async () => {
        const state = (0, lastState_1.getLastKnownState)();
        const profile = (0, lastState_1.getLastKnownProfile)();
        if (!state || !profile) {
            logger_1.default.debug('Scheduled collector: no state available yet, skipping');
            return;
        }
        try {
            const payload = { state, sla: defaultSla(), client_profile: profile };
            const recommendation = await (0, apiSender_1.sendToApi)(payload);
            (0, lastState_2.setLastRecommendation)(recommendation);
            await (0, apiSender_1.saveResult)(profile.client_id, recommendation);
            (0, sse_1.broadcastRecommendation)(recommendation);
            logger_1.default.info('Scheduled collection complete', {
                client_id: profile.client_id,
                status: recommendation.status,
            });
        }
        catch (err) {
            logger_1.default.error('Scheduled collection failed', { error: err.message });
        }
    });
}
function stopScheduledCollector() {
    scheduledTask?.stop();
    scheduledTask = null;
}
function defaultSla() {
    return {
        max_energy_kwh: Infinity,
        max_wait_s: Infinity,
        max_cost_usd: Infinity,
    };
}
