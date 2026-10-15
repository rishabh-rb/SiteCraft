
const url = new URL(request.url);

assert.equal(
  url.origin,
  NVIDIA_BASE_URL,
  `Request ${index + 1} should use the configured NVIDIA base URL`,
);

assert.equal(
  url.pathname,
  "/chat/completions",
  `Request ${index + 1} should target chat completions`,
);

assert.equal(
  request.method,
  "POST",
  `Request ${index + 1} should use POST`,
);

assert.equal(
  request.headers.get("Authorization"),
  "Bearer nvidia-key",
  `Request ${index + 1} should contain the NVIDIA API key`,
);

assert.match(
  request.headers.get("Content-Type") ?? "",
  /application\/json/i,
);

assert.match(
  request.headers.get("Accept") ?? "",
  /application\/json/i,
);
