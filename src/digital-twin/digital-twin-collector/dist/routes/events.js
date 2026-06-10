"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sse_1 = require("../sse");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    // Send a heartbeat comment every 30s to keep the connection alive
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);
    (0, sse_1.addSseClient)(res);
    req.on('close', () => {
        clearInterval(heartbeat);
        (0, sse_1.removeSseClient)(res);
    });
});
exports.default = router;
