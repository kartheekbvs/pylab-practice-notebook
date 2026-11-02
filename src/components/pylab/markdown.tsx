"use client";

import ReactMarkdown from "react-markdown";
import { memo } from "react";

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="pylab-prose">
      <ReactMarkdown
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
