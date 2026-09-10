"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(80),
    description: zod_1.z.string().trim().max(240).default(""),
    initialPrompt: zod_1.z.string().trim().min(10).max(2_000),
});
exports.promptSchema = zod_1.z.object({ prompt: zod_1.z.string().trim().min(2).max(2_000) });
