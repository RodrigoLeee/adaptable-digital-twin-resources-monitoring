"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSseClient = addSseClient;
exports.removeSseClient = removeSseClient;
exports.broadcastRecommendation = broadcastRecommendation;
const clients = new Set();
function addSseClient(res) {
    clients.add(res);
}
function removeSseClient(res) {
    clients.delete(res);
}
function broadcastRecommendation(recommendation) {
    const data = JSON.stringify({ type: 'recommendation', payload: recommendation });
    for (const client of clients) {
        client.write(`data: ${data}\n\n`);
    }
}
