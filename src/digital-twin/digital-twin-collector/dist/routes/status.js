"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lastState_1 = require("../store/lastState");
const apiSender_1 = require("../sender/apiSender");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const store = (0, lastState_1.getStore)();
    const apiReachable = await (0, apiSender_1.checkApiReachable)();
    res.json({
        collector_status: 'ok',
        api_reachable: apiReachable,
        last_collection: store.lastCollection,
        last_recommendation_status: store.lastRecommendation?.status ?? null,
        collections_total: store.collectionsTotal,
        client_profile: store.lastClientProfile,
    });
});
exports.default = router;
