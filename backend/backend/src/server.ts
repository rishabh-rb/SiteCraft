
import test from "node:test";
import assert from "node:assert/strict";
import {
  createProvider,
  ProviderError,
} from "@sitecraft/ml";

const NVIDIA_API_KEY = "super-secret-nvidia-key";
const NVIDIA_MODEL = "working-model";
const NVIDIA_BASE_URL =
  "https://integrate.api.nvidia.com/v1";

const ENV_KEYS = [
  "NVIDIA_API_KEY",
  "NVIDIA_MODEL",
  "NVIDIA_BASE_URL",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "BYNARA_API_KEY",
] as const;

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

type ProviderErrorShape = ProviderError & {
  code: string;
  model: string;
  provider: string;
};

type JsonResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }> | null;
};

const serial = { concurrency: false };

function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
): typeof fetch {
  return (async () =>
    new Response(
      typeof body === "string"
        ? body
        : JSON.stringify(body),
      { status, headers }
    )) as typeof fetch;
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

async function withNvidiaEnvironment<T>(
  callback: () => Promise<T>
): Promise<T> {
  const previousValues = new Map<
    string,
    string | undefined
  >();

  for (const key of ENV_KEYS) {
    previousValues.set(key, process.env[key]);
  }

  process.env.NVIDIA_API_KEY = NVIDIA_API_KEY;
  process.env.NVIDIA_MODEL = NVIDIA_MODEL;
  process.env.NVIDIA_BASE_URL = NVIDIA_BASE_URL;

  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.BYNARA_API_KEY;

  try {
    return await callback();
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function createValidResponse(
  content = '{"ok":true}'
): JsonResponse {
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

function createProviderError(
  error: unknown,
  expectedCode?: string
): asserts error is ProviderErrorShape {
  assert.ok(
    error instanceof ProviderError,
    "Expected a ProviderError"
  );

  const providerError = error as ProviderErrorShape;

  assert.equal(providerError.provider, "nvidia");
  assert.equal(providerError.model, NVIDIA_MODEL);
  assert.ok(providerError.message.length > 0);

  if (expectedCode) {
    assert.equal(providerError.code, expectedCode);
  }
}

async function expectProviderError(
  action: () => Promise<unknown>,
  expectedCode?: string
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    createProviderError(error, expectedCode);
    return true;
  });
}

// =========================================================
// Model errors
// =========================================================

test(
  "throws MODEL_UNAVAILABLE when the model does not exist",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: "The requested model is not available",
            },
          },
          404
        ),
        async () => {
          await expectProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MODEL_UNAVAILABLE"
          );
        }
      );
    });
  }
);

test(
  "provides NVIDIA_MODEL guidance for unavailable models",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: "Model not found",
            },
          },
          404
        ),
        async () => {
          await assert.rejects(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            (error: unknown) => {
              createProviderError(
                error,
                "MODEL_UNAVAILABLE"
              );

              assert.match(
                error.message,
                /NVIDIA_MODEL/i
              );
              assert.ok(
                error.message.includes(NVIDIA_MODEL)
              );

              return true;
            }
          );
        }
      );
    });
  }
);

// =========================================================
// Malformed responses
// =========================================================

test(
  "throws MALFORMED_RESPONSE for invalid HTTP JSON",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch("{ invalid JSON"),
        async () => {
          await expectProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when generated content is not JSON",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(createValidResponse("not-json")),
        async () => {
          await expectProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

const malformedResponses: Array<{
  name: string;
  body: unknown;
}> = [
  {
    name: "missing choices",
    body: {},
  },
  {
    name: "null choices",
    body: { choices: null },
  },
  {
    name: "empty choices",
    body: { choices: [] },
  },
  {
    name: "missing message",
    body: { choices: [{}] },
  },
  {
    name: "missing message content",
    body: { choices: [{ message: {} }] },
  },
  {
    name: "empty message content",
    body: {
      choices: [{ message: { content: "" } }],
    },
  },
  {
    name: "null message content",
    body: {
      choices: [{ message: { content: null } }],
    },
  },
];

for (const response of malformedResponses) {
  test(
    `throws MALFORMED_RESPONSE for ${response.name}`,
    serial,
    async () => {
      await withNvidiaEnvironment(async () => {
        const provider = createProvider();

        await withMockedFetch(
          mockFetch(response.body),
          async () => {
            await expectProviderError(
              () =>
                provider.generateJson(
                  "Generate a test response",
                  "code"
                ),
              "MALFORMED_RESPONSE"
            );
          }
        );
      });
    }
  );
}

// =========================================================
// HTTP errors
// =========================================================

const httpErrors = [
  {
    name: "server failure",
    status: 500,
    message: "Internal server error",
  },
  {
    name: "rate limiting",
    status: 429,
    message: "Too many requests",
  },
  {
    name: "authentication failure",
    status: 401,
    message: "Invalid API key",
  },
];

for (const item of httpErrors) {
  test(
    `returns ProviderError for ${item.name}`,
    serial,
    async () => {
      await withNvidiaEnvironment(async () => {
        const provider = createProvider();

        await withMockedFetch(
          mockFetch(
            { error: { message: item.message } },
            item.status
          ),
          async () => {
            await expectProviderError(() =>
              provider.generateJson(
                "Generate a test response",
                "code"
              )
            );
          }
        );
      });
    }
  );
}

// =========================================================
// Network errors and secret protection
// =========================================================

test(
  "converts network failures into ProviderError",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        (async () => {
          throw new Error("connect ECONNREFUSED");
        }) as typeof fetch,
        async () => {
          await expectProviderError(() =>
            provider.generateJson(
              "Generate a test response",
              "code"
            )
          );
        }
      );
    });
  }
);

test(
  "does not expose the API key in provider errors",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: `Authentication failed for ${NVIDIA_API_KEY}`,
            },
          },
          401
        ),
        async () => {
          await assert.rejects(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            (error: unknown) => {
              assert.ok(error instanceof Error);

              assert.ok(
                !error.message.includes(NVIDIA_API_KEY),
                "Error message must not expose the API key"
              );

              return true;
            }
          );
        }
      );
    });
  }
);

// =========================================================
// Request validation
// =========================================================

test(
  "sends the expected NVIDIA POST request",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();
      const calls: FetchCall[] = [];

      await withMockedFetch(
        (async (
          input: RequestInfo | URL,
          init?: RequestInit
        ) => {
          calls.push({ input, init });

          return new Response(
            JSON.stringify(
              createValidResponse(
                JSON.stringify({ success: true })
              )
            ),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }) as typeof fetch,
        async () => {
          const result =
            await provider.generateJson<{
              success: boolean;
            }>("Generate a test response", "code");

          assert.deepEqual(result, { success: true });
        }
      );

      assert.equal(calls.length, 1);

      const request = calls[0];
      assert.ok(request);

      assert.equal(
        String(request.input),
        `${NVIDIA_BASE_URL}/chat/completions`
      );
      assert.equal(request.init?.method, "POST");
      assert.equal(typeof request.init?.body, "string");

      const headers = new Headers(request.init?.headers);

      assert.equal(
        headers.get("Content-Type"),
        "application/json"
      );
      assert.equal(
        headers.get("Authorization"),
        `Bearer ${NVIDIA_API_KEY}`
      );

      const body = JSON.parse(
        request.init?.body as string
      );

      assert.equal(body.model, NVIDIA_MODEL);
      assert.ok(Array.isArray(body.messages));
      assert.ok(body.messages.length > 0);
      assert.ok(
        body.messages.some(
          (message: { role?: string }) =>
            message.role === "user"
        )
      );
    });
  }
);

// =========================================================
// Successful responses
// =========================================================

test(
  "parses valid NVIDIA JSON successfully",
  serial,
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          createValidResponse(
            JSON.stringify({
              message: "success",
              value: 42,
            })
          )
        ),
        async () => {
          const result =
            await provider.generateJson<{
              message: string;
              value: number;
            }>("Return JSON", "code");

          assert.deepEqual(result, {
            message: "success",
            value: 42,
          });
        }
      );
    });
  }
);

// =========================================================
// Cleanup
// =========================================================

test(
  "restores global fetch after success",
  serial,
  async () => {
    const originalFetch = globalThis.fetch;

    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          createValidResponse('{"ok":true}')
        ),
        async () => {
          await provider.generateJson(
            "Return JSON",
            "code"
          );
        }
      );
    });

    assert.equal(globalThis.fetch, originalFetch);
  }
);

test(
  "restores global fetch after failure",
  serial,
  async () => {
    const originalFetch = globalThis.fetch;

    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await assert.rejects(
        () =>
          withMockedFetch(
            mockFetch({ choices: [] }),
            async () => {
              await provider.generateJson(
                "Return JSON",
                "code"
              );
            }
          )
      );
    });

    assert.equal(globalThis.fetch, originalFetch);
  }
);
