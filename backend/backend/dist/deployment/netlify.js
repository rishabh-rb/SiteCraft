"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployToNetlify = deployToNetlify;
async function deployToNetlify(_projectName, _files, token) {
    const netlifyToken = token || process.env.NETLIFY_AUTH_TOKEN;
    if (!netlifyToken || !netlifyToken.trim()) {
        return {
            success: false,
            provider: "netlify",
            status: "ERROR",
            error: "Netlify deployment is not configured. Add NETLIFY_AUTH_TOKEN to .env."
        };
    }
    return {
        success: false,
        provider: "netlify",
        status: "ERROR",
        error: "Netlify deployment adapter is ready for configuration."
    };
}
