"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const collect_1 = __importDefault(require("./routes/collect"));
const collectParquet_1 = __importDefault(require("./routes/collectParquet"));
const status_1 = __importDefault(require("./routes/status"));
const events_1 = __importDefault(require("./routes/events"));
const scheduledCollector_1 = require("./collectors/scheduledCollector");
const logger_1 = __importDefault(require("./logger"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/collect/manual', collect_1.default);
app.use('/collect/parquet', collectParquet_1.default);
app.use('/status', status_1.default);
app.use('/events', events_1.default);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
    logger_1.default.info(`digital-twin-collector running on port ${PORT}`);
    (0, scheduledCollector_1.startScheduledCollector)();
});
