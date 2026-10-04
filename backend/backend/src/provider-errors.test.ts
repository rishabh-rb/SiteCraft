```ts
import test from "node:test";
import assert from "node:assert/strict";

import { createProvider, ProviderError } from "@sitecraft/ml";

test("surfaces NVIDIA model unavailable errors with configuration guidance", async () => {
  const originalFetch = globalThis.fetch;

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

  try {
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
          "Error should tell the user which configuration to change"
        );

        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("surfaces malformed NVIDIA JSON responses", async () => {
  const originalFetch = globalThis.fetch;

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

  try {
    const provider = createProvider({
      NVIDIA_API_KEY: "nvidia-key",
      NVIDIA_MODEL: "working-model",
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
          "Incorrect error code for malformed response"
        );

        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("surfaces NVIDIA server errors as provider errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "NVIDIA service temporarily unavailable",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const provider = createProvider({
      NVIDIA_API_KEY: "nvidia-key",
      NVIDIA_MODEL: "working-model",
    });

    await assert.rejects(
      () => provider.generateJson("{}", "planner"),
      (error: unknown) => {
        assert.ok(
          error instanceof ProviderError,
          "Error should be a ProviderError"
        );

        assert.match(
          error.message,
          /NVIDIA service temporarily unavailable/i,
          "Server error message should be preserved"
        );

        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("surfaces NVIDIA responses with missing choices", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        object: "chat.completion",
        choices: [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const provider = createProvider({
      NVIDIA_API_KEY: "nvidia-key",
      NVIDIA_MODEL: "working-model",
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
          "Missing choices should produce MALFORMED_RESPONSE"
        );

        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("surfaces NVIDIA responses with empty message content", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "",
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

  try {
    const provider = createProvider({
      NVIDIA_API_KEY: "nvidia-key",
      NVIDIA_MODEL: "working-model",
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
          "Empty content should produce MALFORMED_RESPONSE"
        );

        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not leak NVIDIA credentials when an error occurs", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Authentication failed",
        },
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const provider = createProvider({
      NVIDIA_API_KEY: "super-secret-nvidia-key",
      NVIDIA_MODEL: "working-model",
    });

    await assert.rejects(
      () => provider.generateJson("{}", "planner"),
      (error: unknown) => {
        assert.ok(
          error instanceof ProviderError,
          "Error should be a ProviderError"
        );

        assert.doesNotMatch(
          error.message,
          /super-secret-nvidia-key/,
          "Provider error must not expose the NVIDIA API key"
        );

        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("restores fetch after NVIDIA provider errors", async () => {
  const originalFetch = globalThis.fetch;

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

  try {
    const provider = createProvider({
      NVIDIA_API_KEY: "nvidia-key",
      NVIDIA_MODEL: "missing-model",
    });

    await assert.rejects(() => provider.generateJson("{}", "planner"));
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    globalThis.fetch,
    originalFetch,
    "globalThis.fetch should be restored after the test"
  );
});
```
