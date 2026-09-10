"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const validators_js_1 = require("./validators.js");
(0, node_test_1.default)("rejects prompts that are too short", () => {
    strict_1.default.equal(validators_js_1.promptSchema.safeParse({ prompt: "hi" }).success, true);
    strict_1.default.equal(validators_js_1.promptSchema.safeParse({ prompt: "" }).success, false);
});
(0, node_test_1.default)("validates project creation input", () => {
    strict_1.default.equal(validators_js_1.createProjectSchema.safeParse({ name: "Cafe", initialPrompt: "Create a cafe website with a menu" }).success, true);
    strict_1.default.equal(validators_js_1.createProjectSchema.safeParse({ name: "", initialPrompt: "short" }).success, false);
});
