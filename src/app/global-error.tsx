"use client";

// Global error boundary — surfaces client-side exceptions with the actual
// message instead of a blank screen, and offers a recovery path.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          background: "#0d1512",
          color: "#dbe7e0",
          fontFamily: "var(--font-mono-override), monospace",
          padding: "48px 24px",
          margin: 0,
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f87171" }}>
            ⚠ Something crashed
          </h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#101b16",
              border: "1px solid #1d2a24",
              borderRadius: 8,
              padding: 16,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "#fca5a5",
            }}
          >
            {error.name}: {error.message}
            {"\n\n"}
            {error.stack?.slice(0, 1600)}
          </pre>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#34d399",
              color: "#0d1512",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
