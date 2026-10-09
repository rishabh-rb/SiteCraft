
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProvider,
  ProviderError,
} from "@sitecraft/ml";

test(
  "throws MODEL_UNAVAILABLE when the NVIDIA model does not exist",
  async () => {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: {
              message: 'The model "missing-model" does not exist.',
            },
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )) as typeof fetch;

      const provider = createProvider({
        NVIDIA_API_KEY: "nvidia-test-key",
        NVIDIA_MODEL: "missing-model",
      });

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assert.ok(error instanceof ProviderError);
          assert.equal(error.code, "MODEL_UNAVAILABLE");
          assert.match(error.message, /missing-model/i);
          assert.match(error.message, /NVIDIA_MODEL/);

          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

test(
  "throws MALFORMED_RESPONSE when NVIDIA returns invalid JSON content",
  async () => {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "not-json",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )) as typeof fetch;

      const provider = createProvider({
        NVIDIA_API_KEY: "nvidia-test-key",
        NVIDIA_MODEL: "working-model",
      });

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assert.ok(error instanceof ProviderError);
          assert.equal(error.code, "MALFORMED_RESPONSE");

          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);