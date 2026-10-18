className="h-3 w-3"
                  aria-hidden="true"
                />
                AI Assistant
              </>
            )}
          </div>

          <p className="whitespace-pre-wrap break-words text-xs leading-5 text-ink sm:text-[13px] sm:leading-6">
            {message.content}
          </p>
        </div>

        {!isUser && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onCopy(message.id, message.content)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold text-ink/45 transition-colors hover:bg-ink/[0.04] hover:text-ink/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
              aria-label={
                isCopied
                  ? "Message copied"
                  : copyFailed
                    ? "Copy failed, try again"
                    : "Copy AI response"
              }
            >
              {isCopied ? (
                <>
                  <CheckCheck
                    className="h-3.5 w-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                  Copied
                </>
              ) : copyFailed ? (
                <>
                  <RotateCcw
                    className="h-3.5 w-3.5 text-red-500"
                    aria-hidden="true"
                  />
                  Try again
                </>
              ) : (
                <>
                  <Clipboard
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Copy response
                </>
              )}
            </button>

            {copyFailed && (
              <span
                className="text-[10px] text-red-500"
                role="status"
              >
                Clipboard unavailable
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div
      className="flex items-start gap-2.5 sm:gap-3"
      role="status"
      aria-label="AI is applying website changes"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-teal/15 bg-teal/10">
        <Sparkles
          className="h-4 w-4 animate-pulse text-teal"
          aria-hidden="true"
        />
      </div>

      <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal" />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
            style={{ animationDelay: "120ms" }}
          />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
            style={{ animationDelay: "240ms" }}
          />

          <span className="ml-1.5 text-[10px] font-semibold text-ink/50">
            Working on your design...
          </span>

          <Loader2
            className="ml-1 h-3 w-3 animate-spin text-teal/60"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}