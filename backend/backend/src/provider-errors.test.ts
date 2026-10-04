
import test from "node:test";
import assert from "node:assert/strict";

import { createProvider, ProviderError } from "@sitecraft/ml";

const NVIDIA_API_KEY = "super-secret-nvidia-key";
const NVIDIA_MODEL = "working-model";

function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
) {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers,
    });
}

async function withMockedFetch(
  fetchMock: typeof fetch,
  callback: () => Promise<void>
) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = fetchMock;

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

/* =========================================================
   Model Errors
========================================================= */

test("surfaces NVIDIA model unavailable errors with configuration guidance", async () => {
  await withMockedFetch(
    mockFetch(
      {
        error: {
          message: 'The model "missing-model" does not exist.',
        },
      },
      404
    ) as typeof fetch,
    async () => {
      const provider = createProvider({
        NVIDIA_API_KEY: "nvidia-key",
        NVIDIA_MODEL: "missing-model",
      });

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assert.ok(
            error instanceof ProviderError,
            "Error should be a ProviderError"
          );

          assert.equal(
            error.code,
            "MODEL_UNAVAILABLE",
            "Incorrect error code for unavailable model"
          );

          assert.match(
            error.message,
            /missing-model/,
            "Error should contain the unavailable model name"
          );

          assert.match(
            error.message,
            /NVIDIA_MODEL/,
            "Error should provide configuration guidance"
          );

          return true;
        }
      );
    }
  );
});

/* =========================================================
   Malformed Responses
========================================================= */

test("surfaces malformed NVIDIA JSON responses", async () => {
  await withMockedFetch(
    mockFetch({
      choices: [
        {
          message: {
            content: "not-json",
          },
        },
      ],
    }) as typeof fetch,
    async () => {
      const provider = createProvider({
        NVIDIA_API_KEY: "nvidia-key",
        NVIDIA_MODEL,
      });

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assert.ok(
            error instanceof ProviderError,
            "Error should be a ProviderError"
          );

          assert.equal(
            error.code,
            "MALFORMED_RESPONSE",
            "Incorrect error code for malformed JSON"
          );

          return true;
        }
      );
    }
  );
});

test("surfaces NVIDIA responses with missing choices", async () => {
  await withMockedFetch(
    mockFetch({
      object: "chat.completion",
      choices: [],
    }) as typeof fetch,
    async () => {
      const provider = createProvider({
        NVIDIA_API_KEY: "nvidia-key",
        NVIDIA_MODEL,
      });

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assert.ok(error instanceof ProviderError);

          assert.equal(
            error.code,
            "MALFORMED_RESPONSE",
            "Missing choices should produce MALFORMED_RESPONSE"
          );

          return true;
        }
      );
    }
  );
});

test("surfaces NVIDIA responses with missing message content", async () => {
  await withMockedFetch(
    mockFetch({
      choices: [
        {
          message: {},
        },
      ],
    }) as typeof fetch,
    async () => {
      const provider = createProvider({
        NVIDIA_API_KEY: "nvidia-key",
        NVIDIA_MODEL,
      });

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assert.ok(error instanceof ProviderError);

          assert.equal(
            error.code,
            "MALFORMED_RESPONSE",
            "Missing content should produce MALFORMED_RESPONSE"
          );

          return true;
        }
      );
    }
  );
});

test("surfaces NVIDIA responses wi
