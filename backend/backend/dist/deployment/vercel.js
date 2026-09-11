"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployToVercel = deployToVercel;
async function deployToVercel(projectName, files, token, teamId) {
    const vercelToken = token || process.env.VERCEL_TOKEN;
    if (!vercelToken || !vercelToken.trim()) {
        return {
            success: false,
            provider: "vercel",
            status: "ERROR",
            error: "Vercel deployment is not configured. Add VERCEL_TOKEN to .env."
        };
    }
    const cleanName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50) || "sitecraft-project";
    const urlParams = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
    try {
        const payloadFiles = files.map((file) => ({
            file: file.path,
            data: Buffer.from(file.content).toString("utf8")
        }));
        const response = await fetch(`https://api.vercel.com/v13/deployments${urlParams}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: cleanName,
                files: payloadFiles,
                projectSettings: {
                    framework: null
                }
            })
        });
        const data = (await response.json());
        if (!response.ok || data.error) {
            return {
                success: false,
                provider: "vercel",
                status: "ERROR",
                error: data.error?.message || `Vercel deployment failed with status ${response.status}`
            };
        }
        const deploymentUrl = data.url ? (data.url.startsWith("http") ? data.url : `https://${data.url}`) : undefined;
        return {
            success: true,
            provider: "vercel",
            status: data.readyState === "READY" ? "READY" : "BUILDING",
            deploymentId: data.id,
            deploymentUrl
        };
    }
    catch (caught) {
        return {
            success: false,
            provider: "vercel",
            status: "ERROR",
            error: caught instanceof Error ? caught.message : "Vercel deployment failed"
        };
    }
}
