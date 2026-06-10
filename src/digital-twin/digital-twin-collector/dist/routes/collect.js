"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const manualCollector_1 = require("../collectors/manualCollector");
const logger_1 = __importDefault(require("../logger"));
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    const body = req.body;
    if (!body.state || !body.sla || !body.client_profile) {
        res.status(400).json({ error: 'Missing required fields: state, sla, client_profile' });
        return;
    }
    try {
        const result = await (0, manualCollector_1.processManualCollection)(body);
        res.json(result);
    }
    catch (err) {
        const message = err.message;
        logger_1.default.error('POST /collect/manual failed', { error: message });
        res.status(502).json({ error: 'Failed to get recommendation from API', details: message });
    }
});
exports.default = router;
