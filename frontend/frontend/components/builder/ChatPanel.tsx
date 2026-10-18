{/* AI message content */}
<div className="min-w-0 flex-1">
  <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-4 sm:py-3.5">
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal/10">
        {isUser ? (
          <UserRound
            className="h-3.5 w-3.5 text-ink/70"
            aria-hidden="true"
          />
        ) : (
          <Sparkles
            className="h-3.5 w-3.5 text-teal"
            aria-hidden="true"
          />
        )}
      </div>

      <span className="text-[11px] font-bold tracking-wide text-ink/70 sm:text-xs">
        {isUser ? "You" : "AI Assistant"}
      </span>

      {!isUser && (
        <span className="rounded-full border border-teal/15 bg-teal/5 px-2 py-0.5 text-[9px] font-semibold text-teal">
          AI
        </span>
      )}
    </div>

    <p className="whitespace-pre-wrap break-words text-xs leading-6 text-ink sm:text-[13px] sm:leading-6">
      {message.content}
    </p>
  </div>

  {!isUser && (
    <div className="mt-2 flex min-h-8 flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onCopy(message.id, message.content)}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 ${
          isCopied
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600"
            : copyFailed
              ? "border-red-500/20 bg-red-500/5 text-red-600 hover:bg-red-500/10"
              : "border-line bg-paper text-ink/55 hover:border-teal/30 hover:bg-teal/5 hover:text-teal active:scale-[0.98]"
        }`}
        aria-label={
          isCopied
            ? "Message copied to clipboard"
            : copyFailed
              ? "Copy failed. Try copying again"
              : "Copy AI response to clipboard"
        }
        title={
          isCopied
            ? "Copied!"
            : copyFailed
              ? "Try copying again"
              : "Copy response"
        }
      >
        {isCopied ? (
          <>
            <CheckCheck
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            Copied
          </>
        ) : copyFailed ? (
          <>
            <RotateCcw
              className="h-3.5 w-3.5"
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
          className="inline-flex items-center gap-1 text-[10px] text-red-500"
          role="status"
        >
          <AlertCircle
            className="h-3 w-3"
            aria-hidden="true"
          />
          Clipboard unavailable
        </span>
      )}
    </div>
  )}
</div>

{/* AI thinking indicator */}
function ThinkingIndicator() {
  return (
    <div
      className="flex items-start gap-2.5 sm:gap-3"
      role="status"
      aria-label="AI is working on your website design"
      aria-live="polite"
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
        <span
          className="absolute inset-0 animate-ping rounded-xl bg-teal/10 motion-reduce:animate-none"
          aria-hidden="true"
        />

        <Sparkles
          className="relative h-4 w-4 animate-pulse text-teal motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0 rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 shadow-sm sm:px-4.5">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5"
            aria-hidden="true"
          >
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal motion-reduce:animate-none" />

            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal motion-reduce:animate-none"
              style={{ animationDelay: "120ms" }}
            />

            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal motion-reduce:animate-none"
              style={{ animationDelay: "240ms" }}
            />
          </div>

          <span className="text-[11px] font-semibold text-ink/65 sm:text-xs">
            Working on your design
            <span className="animate-pulse motion-reduce:animate-none">
              ...
            </span>
          </span>

          <Loader2
            className="h-3.5 w-3.5 animate-spin text-teal/70 motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>

        <p className="mt-1.5 text-[10px] leading-4 text-ink/40">
          Generating and applying your requested changes
        </p>
      </div>
    </div>
  );
}