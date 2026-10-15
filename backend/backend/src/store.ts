            }
            /* Deploy Website */
            if (request.method === "POST" &&
                action === "deploy") {
                const project = await authorizeProject(projectId);
                if (!project) {
                    return;
                }
                const body = deploySchema.parse(await readBody(request));
                const latestWebsite = project.websites[0];
                if (!latestWebsite) {
                    return sendError(response, 400, "NO_WEBSITE", "Cannot deploy a project without generated website code.");
                }
                const deployResult = body.provider === "netlify"
                    ? await deployToNetlify(project.name, latestWebsite.generatedCode)
                    : await deployToVercel(project.name, latestWebsite.generatedCode);
                if (deployResult.success) {
                    await recordDeployment(projectId, {
                        provider: deployResult.provider,
                        deploymentUrl: deployResult.deploymentUrl,
                        deploymentId: deployResult.deploymentId,
                        status: deployResult.status,
                    });
                }
                return sendJson(response, deployResult.success ? 200 : 400, {
                    success: deployResult.success,
                    data: deployResult,
                    ...(deployResult.error
                        ? {
                            error: {
                                code: "DEPLOYMENT_FAILED",
                                message: deployResult.error,
                            },
                        }
                        : {}),
                });
            }
        }
        /* Unknown Route */
        return sendError(response, 404, "NOT_FOUND", "Route not found.");
    }
    catch (error) {
        const status = errorStatus(error);
        const failure = errorResponse(error);
        /*
  
         * Avoid returning unexpected internal server details
  
         * to clients. Provider errors retain their public message.
  
         */
        const publicFailure = status >= 500 &&
            !(error instanceof ProviderError)
            ? {
                code: "INTERNAL_SERVER_ERROR",
                message: "An unexpected server error occurred.",
            }
            : failure;
        console.error(JSON.stringify({
            event: "request_failed",
            method: request.method,
            path: url.pathname,
            status,
            errorCode: publicFailure.code,
            ...(error instanceof ProviderError
                ? {
                    provider: error.provider,
                    model: error.model,
                    providerErrorCode: error.code,
                    providerStatus: error.status,
                }
                : {}),
        }));
        return sendJson(response, status, {
            success: false,
            error: publicFailure,
        });
    }
});
/* =========================================================

   Server Startup

========================================================= */
server.listen(port, () => {
    console.log(JSON.stringify({
        event: "backend_started",
        port,
        activeProvider: provider.config.provider,
        model: provider.config.model,
        configured: provider.config.configured,
    }));
});
/* =========================================================

   Graceful Shutdown

========================================================= */
let shuttingDown = false;
function handleShutdown(signal: string): void {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    console.log(JSON.stringify({
        event: "backend_shutdown",
        signal,
    }));
    const forceExitTimer = setTimeout(() => {
        console.error(JSON.stringify({
            event: "backend_shutdown_timeout",
        }));
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();
    server.close((error) => {
        clearTimeout(forceExitTimer);
        if (error) {
            console.error(JSON.stringify({
                event: "backend_close_failed",
                message: error.message,
            }));
            process.exitCode = 1;
            return;
        }
        process.exitCode = 0;
    });
    server.closeIdleConnections?.();