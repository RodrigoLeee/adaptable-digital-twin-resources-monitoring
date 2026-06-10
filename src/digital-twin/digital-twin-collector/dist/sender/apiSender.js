"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToApi = sendToApi;
exports.saveResult = saveResult;
exports.checkApiReachable = checkApiReachable;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../logger"));
const API_URL = process.env.API_URL || 'http://localhost:3000';
const RESULTS_DIR = process.env.RESULTS_DIR || './results';
async function sendToApi(payload) {
    const response = await axios_1.default.post(`${API_URL}/recommend`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
    });
    return response.data;
}
async function saveResult(clientId, recommendation) {
    const dir = path_1.default.join(RESULTS_DIR, clientId);
    fs_1.default.mkdirSync(dir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path_1.default.join(dir, `${timestamp}.json`);
    fs_1.default.writeFileSync(filePath, JSON.stringify(recommendation, null, 2), 'utf-8');
    logger_1.default.info(`Result saved: ${filePath}`);
}
async function checkApiReachable() {
    try {
        await axios_1.default.get(`${API_URL}/health`, { timeout: 3000 });
        return true;
    }
    catch {
        return false;
    }
}
