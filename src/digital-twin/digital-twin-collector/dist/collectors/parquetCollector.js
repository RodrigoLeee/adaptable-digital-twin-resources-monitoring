"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractStateFromParquets = extractStateFromParquets;
const fs_1 = __importDefault(require("fs"));
const stateNormalizer_1 = require("../normalizer/stateNormalizer");
const logger_1 = __importDefault(require("../logger"));
async function readParquet(filePath) {
    const { parquetRead } = await Promise.resolve().then(() => __importStar(require('hyparquet')));
    const buffer = fs_1.default.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const rows = [];
    await parquetRead({
        file: arrayBuffer,
        onComplete: (data) => {
            rows.push(...data);
        },
    });
    return rows;
}
async function extractStateFromParquets(files) {
    logger_1.default.debug('Reading parquet files', { files });
    const [taskRows, powerRows, serviceRows, hostRows] = await Promise.all([
        readParquet(files.task),
        readParquet(files.powerSource),
        readParquet(files.service),
        readParquet(files.host),
    ]);
    logger_1.default.debug('Parquet rows loaded', {
        tasks: taskRows.length,
        power: powerRows.length,
        service: serviceRows.length,
        hosts: hostRows.length,
    });
    return (0, stateNormalizer_1.normalizeFromParquets)(taskRows, powerRows, serviceRows, hostRows);
}
