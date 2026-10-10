
import test from "node:test";
import assert from "node:assert/strict";
import { createProvider, ProviderError } from "@sitecraft/ml";

const NVIDIA_API_KEY = "super-secret-nvidia-key";
const NVIDIA_MODEL = "working-model";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers,
    })) as typeof fetch;
}

async function withMockedFetch<T>(
  fetchMock: typeof fetch,
  callback: () => Promise<T>
): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function createNvidiaProvider(
  overrides: Record<string, string> = {}
) {
  return createProvider({
    NVIDIA_API_KEY,
    NVIDIA_MODEL,
    NVIDIA_BASE_URL,
    ...overrides,
  });
}

function assertProviderError(
  error: unknown,
  expectedCode?: string
): asserts error is ProviderError {
  assert.ok(
    error instanceof ProviderError,
    "Expected a ProviderError"
  );

  if (expectedCode) {
    assert.equal(error.code, expectedCode);
  }
}

function chatResponse(content: string) {
  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}

test("reports an unavailable NVIDIA model with configuration guidance", async () => {
  await withMockedFetch(
    mockFetch(
      {
        error: {
          message: 'The model "missing-model" does not exist.',
        },
      },
      404
    ),
    async () => {
      const provider = createNvidiaProvider({
        NVIDIA_MODEL: "missing-model",
      });

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assertProviderError(error, "MODEL_UNAVAILABLE");
          assert.match(error.message, /missing-model/i);
          assert.match(error.message, /NVIDIA_MODEL/i);
          return true;
        }
      );
    }
  );
});

test("reports malformed JSON returned by NVIDIA", async () => {
  await withMockedFetch(
    mockFetch(chatResponse("not-json")),
    async () => {
      const provider = createNvidiaProvider();

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assertProviderError(error, "MALFORMED_RESPONSE");
          return true;
        }
      );
    }
  );
});

test("rejects responses with missing choices", async () => {
  const invalidResponses: unknown[] = [
    {},
    { choices: [] },
    { choices: null },
    { choices: [{}] },
    { choices: [{ message: {} }] },
    { choices: [{ message: { content: "" } }] },
    { choices: [{ message: { content: null } }] },
  ];

  for (const body of invalidResponses) {
    await withMockedFetch(
      mockFetch(body),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () => provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assertProviderError(error, "MALFORMED_RESPONSE");
            return true;
          }
        );
      }
    );
  }
});

test("reports NVIDIA server errors", async () => {
  await withMockedFetch(
    mockFetch(
      {
        error: {
          message: "NVIDIA service temporarily unavailable",
        },
      },
      500
    ),
    async () => {
      const provider = createNvidiaProvider();

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assertProviderError(error);
          assert.match(error.message, /NVIDIA|unavailable|500/i);
          return true;
        }
      );
    }
  );
});

test("reports NVIDIA rate-limit errors", async () => {
  await withMockedFetch(
    mockFetch(
      {
        error: {
          message: "Rate limit exceeded",
        },
      },
      429
    ),
    async () => {
      const provider = createNvidiaProvider();

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assertProviderError(error);
          assert.match(error.message, /rate|429|limit/i);
          return true;
        }
      );
    }
  );
});

test("reports NVIDIA authentication errors", async () => {
  await withMockedFetch(
    mockFetch(
      {
        error: {
          message: "Invalid API key",
        },
      },
      401
    ),
    async () => {
      const provider = createNvidiaProvider();

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assertProviderError(error);
          assert.match(
            error.message,
            /401|unauthorized|authentication|invalid|key/i
          );
          return true;
        }
      );
    }
  );
});

test("converts network failures into ProviderError", async () => {
  await withMockedFetch(
    (async () => {
      throw new Error("Network connection failed");
    }) as typeof fetch,
    async () => {
      const provider = createNvidiaProvider();

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assertProviderError(error);
          assert.match(error.message, /network|connection|failed/i);
          return true;
        }
      );
    }
  );
});

test("parses a valid NVIDIA JSON response", async () => {
  const expected = {
    siteName: "Northstar Studio",
    theme: "modern",
    pages: ["Home"],
  };

  await withMockedFetch(
    mockFetch(chatResponse(JSON.stringify(expected))),
    async () => {
      const provider = createNvidiaProvider();

      const result = await provider.generateJson(
        "{}",
        "planner"
      );

      assert.deepEqual(result, expected);
    }
  );
});

test("sends the correct NVIDIA request", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const fetchMock = (async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;

    return new Response(
      JSON.stringify(chatResponse('{"ok":true}')),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }) as typeof fetch;

  await withMockedFetch(fetchMock, async () => {
    const provider = createNvidiaProvider();

    const result = await provider.generateJson(
      "{}",
      "planner"
    );

    assert.deepEqual(result, { ok: true });
  });

  assert.equal(
    capturedUrl,
    `${NVIDIA_BASE_URL}/chat/completions`
  );

  assert.equal(capturedInit?.method, "POST");

  const headers = new Headers(capturedInit?.headers);

  assert.equal(
    headers.get("Authorization"),
    `Bearer ${NVIDIA_API_KEY}`
  );
  assert.equal(headers.get("Content-Type"), "application/json");

  assert.equal(typeof capturedInit?.body, "string");

  const body = JSON.parse(capturedInit?.body as string);

  assert.equal(body.model, NVIDIA_MODEL);
  assert.ok(Array.isArray(body.messages));
  assert.ok(body.messages.length > 0);
});

test("does not expose the API key in provider errors", async () => {
  await withMockedFetch(
    mockFetch(
      {
        error: {
          message: `Request failed for ${NVIDIA_API_KEY}`,
        },
      },
      500
    ),
    async () => {
      const provider = createNvidiaProvider();

      await assert.rejects(
        () => provider.generateJson("{}", "planner"),
        (error: unknown) => {
          assertProviderError(error);
          assert.ok(
            !error.message.includes(NVIDIA_API_KEY),
            "Provider error must not expose the API key"
          );
          return true;
        }
      );
    }
  );
});

test("restores global fetch after success", async () => {
  const originalFetch = globalThis.fetch;

  await withMockedFetch(
    mockFetch(chatResponse('{"ok":true}')),
    async () => {
      const provider = createNvidiaProvider();
      await provider.generateJson("{}", "planner");
    }
  );

  assert.equal(globalThis.fetch, originalFetch);
});

test("restores global fetch after failure", async () => {
  const originalFetch = globalThis.fetch;

  await assert.rejects(
    () =>
      withMockedFetch(
        mockFetch(
          { error: { message: "Server failure" } },
          500
        ),
        async () => {
          const provider = createNvidiaProvider();
          await provider.generateJson("{}", "planner");
        }
      )
  );

  assert.equal(globalThis.fetch, originalFetch);
});
