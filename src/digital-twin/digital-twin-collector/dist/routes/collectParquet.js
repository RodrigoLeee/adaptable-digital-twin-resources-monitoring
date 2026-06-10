"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const parquetCollector_1 = require("../collectors/parquetCollector");
const apiSender_1 = require("../sender/apiSender");
const lastState_1 = require("../store/lastState");
const sse_1 = require("../sse");
const logger_1 = __importDefault(require("../logger"));
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${file.fieldname}${path_1.default.extname(file.originalname)}`;
        cb(null, unique);
    },
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
router.post('/', upload.fields([
    { name: 'host', maxCount: 1 },
    { name: 'powerSource', maxCount: 1 },
    { name: 'service', maxCount: 1 },
    { name: 'task', maxCount: 1 },
]), async (req, res) => {
    const files = req.files;
    const required = ['host', 'powerSource', 'service', 'task'];
    const missing = required.filter(f => !files?.[f]?.[0]);
    if (missing.length > 0) {
        res.status(400).json({ error: `Missing parquet files: ${missing.join(', ')}` });
        return;
    }
    let sla;
    let clientProfile;
    try {
        sla = JSON.parse(req.body.sla);
        clientProfile = JSON.parse(req.body.client_profile);
    }
    catch {
        res.status(400).json({ error: 'Invalid JSON in sla or client_profile fields' });
        return;
    }
    const filePaths = {
        host: files['host'][0].path,
        powerSource: files['powerSource'][0].path,
        service: files['service'][0].path,
        task: files['task'][0].path,
    };
    try {
        const state = await (0, parquetCollector_1.extractStateFromParquets)(filePaths);
        logger_1.default.info('State extracted from parquets', { client_id: clientProfile.client_id, state });
        const payload = { state, sla, client_profile: clientProfile };
        const recommendation = await (0, apiSender_1.sendToApi)(payload);
        (0, lastState_1.setLastState)(state, clientProfile);
        (0, lastState_1.setLastRecommendation)(recommendation);
        await (0, apiSender_1.saveResult)(clientProfile.client_id, recommendation);
        (0, sse_1.broadcastRecommendation)(recommendation);
        logger_1.default.info('Parquet collection complete', {
            client_id: clientProfile.client_id,
            status: recommendation.status,
        });
        res.json({ ...recommendation, client_profile: clientProfile });
    }
    catch (err) {
        const message = err.message;
        logger_1.default.error('POST /collect/parquet failed', { error: message });
        res.status(502).json({ error: 'Failed to process parquets or get recommendation', details: message });
    }
    finally {
        // Clean up uploaded files
        for (const filePath of Object.values(filePaths)) {
            fs_1.default.unlink(filePath, () => undefined);
        }
    }
});
exports.default = router;
