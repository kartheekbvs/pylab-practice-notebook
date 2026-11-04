"use client";

import ReactMarkdown from "react-markdown";
import { memo } from "react";
import { ArchDiagram } from "./visuals";
import { ArchSpec } from "@/lib/content/types";

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="pylab-prose">
      <ReactMarkdown
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
          pre: ({ children }) => {
            // ```arch fences render as network architecture diagrams
            const child = (Array.isArray(children) ? children[0] : children) as
              | { props?: { className?: string; children?: unknown } }
              | undefined;
            const cls = child?.props?.className;
            if (typeof cls === "string" && cls.includes("language-arch")) {
              const raw = String(child?.props?.children ?? "").replace(/\n$/, "");
              try {
                const spec = JSON.parse(raw) as ArchSpec;
                if (spec && Array.isArray(spec.layers)) {
                  return <ArchDiagram spec={spec} />;
                }
              } catch {
                /* fall through to plain <pre> */
              }
            }
            return <pre>{children}</pre>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
