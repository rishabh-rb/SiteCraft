
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProvider,
  ProviderError,
} from "@sitecraft/ml";

const NVIDIA_API_KEY = "super-secret-nvidia-key";
const NVIDIA_MODEL = "working-model";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

type ProviderErrorShape = {
  code: string;
  model: string;
  provider: string;
  message: string;
};

function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
): typeof fetch {
  return (async () => {
    return new Response(
      typeof body === "string" ? body : JSON.stringify(body),
      { status, headers }
    );
  }) as typeof fetch;
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
  const originalEnv = { ...process.env };

  process.env.NVIDIA_API_KEY = NVIDIA_API_KEY;
  process.env.NVIDIA_MODEL = NVIDIA_MODEL;
  process.env.NVIDIA_BASE_URL = NVIDIA_BASE_URL;

  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.BYNARA_API_KEY;

  try {
    return await callback();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function createValidResponse(content = '{"ok":true}') {
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

function assertProviderError(
  action: () => Promise<unknown>,
  expectedCode: string,
  expectedModel = NVIDIA_MODEL
): Promise<void> {
  return assert.rejects(
    action,
    (error: unknown) => {
      assert.ok(
        error instanceof ProviderError,
        "Expected ProviderError"
      );

      const providerError = error as ProviderErrorShape;

      assert.equal(providerError.code, expectedCode);
      assert.equal(providerError.model, expectedModel);
      assert.equal(providerError.provider, "nvidia");
      assert.ok(providerError.message.length > 0);

      return true;
    }
  );
}

test(
  "throws MODEL_UNAVAILABLE when the NVIDIA model is unavailable",
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
          await assertProviderError(
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
  "includes configuration guidance for an unavailable model",
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
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(error instanceof ProviderError);
              assert.equal(error.code, "MODEL_UNAVAILABLE");
              assert.match(error.message, /NVIDIA_MODEL/i);
              assert.ok(error.message.includes(NVIDIA_MODEL));

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when the HTTP response is invalid JSON",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch("{ this is not valid JSON"),
        async () => {
          await assertProviderError(
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
  "throws MALFORMED_RESPONSE when the generated content is not JSON",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(createValidResponse("not-json")),
        async () => {
          await assertProviderError(
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
    name: "choices is missing",
    body: {
      id: "test-response",
      object: "chat.completion",
    },
  },
  {
    name: "choices is null",
    body: { choices: null },
  },
  {
    name: "choices is empty",
    body: { choices: [] },
  },
  {
    name: "message is missing",
    body: { choices: [{}] },
  },
  {
    name: "message content is missing",
    body: {
      choices: [{ message: {} }],
    },
  },
  {
    name: "message content is empty",
    body: {
      choices: [{ message: { content: "" } }],
    },
  },
];

for (const response of malformedResponses) {
  test(
    `throws MALFORMED_RESPONSE when ${response.name}`,
    async () => {
      await withNvidiaEnvironment(async () => {
        const provider = createProvider();

        await withMockedFetch(
          mockFetch(response.body),
          async () => {
            await assertProviderError(
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

const httpErrors: Array<{
  name: string;
  status: number;
  message: string;
}> = [
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
    name: "invalid API key",
    status: 401,
    message: "Invalid API key",
  },
];

for (const httpError of httpErrors) {
  test(
    `returns a ProviderError for ${httpError.name}`,
    async () => {
      await withNvidiaEnvironment(async () => {
        const provider = createProvider();

        await withMockedFetch(
          mockFetch(
            {
              error: {
                message: httpError.message,
              },
            },
            httpError.status
          ),
          async () => {
            await assert.rejects(
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
              (error: unknown) => {
                assert.ok(error instanceof ProviderError);
                assert.equal(error.provider, "nvidia");
                assert.equal(error.model, NVIDIA_MODEL);
                assert.ok(error.message.length > 0);

                return true;
              }
            );
          }
        );
      });
    }
  );
}

test(
  "handles network failures without exposing the API key",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        (async () => {
          throw new Error("connect ECONNREFUSED");
        }) as typeof fetch,
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(error instanceof Error);
              assert.ok(
                !error.message.includes(NVIDIA_API_KEY),
                "API key must not appear in the error message"
              );

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "never exposes the NVIDIA API key in provider errors",
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
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(error instanceof Error);
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
  }
);

test(
  "sends the correct NVIDIA request",
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
          const result = await provider.generateJson<{
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

      const body = JSON.parse(request.init.body as string);

      assert.equal(body.model, NVIDIA_MODEL);
      assert.ok(Array.isArray(body.messages));
      assert.ok(body.messages.length > 0);
      assert.ok(
        body.messages.some(
          (message: { role?: string }) =>
            message.role === "user"
        )
      );

      const headers = new Headers(request.init?.headers);

      assert.equal(
        headers.get("Content-Type"),
        "application/json"
      );

      assert.equal(
        headers.get("Authorization"),
        `Bearer ${NVIDIA_API_KEY}`
      );
    });
  }
);

test(
  "parses a valid NVIDIA JSON response",
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
          const result = await provider.generateJson<{
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

test(
  "restores fetch after a successful request",
  async () => {
    const originalFetch = globalThis.fetch;

    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          createValidResponse(
            JSON.stringify({ ok: true })
          )
        ),
        async () => {
          await provider.generateJson("Return JSON", "code");

          assert.notEqual(globalThis.fetch, originalFetch);
        }
      );
    });

    assert.equal(globalThis.fetch, originalFetch);
  }
);

test(
  "restores fetch after a failed request",
  async () => {
    const originalFetch = globalThis.fetch;

    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch({ choices: [] }),
        async () => {
          await assert.rejects(
            provider.generateJson("Return JSON", "code")
          );

          assert.notEqual(globalThis.fetch, originalFetch);
        }
      );
    });

    assert.equal(globalThis.fetch, originalFetch);
  }
);
