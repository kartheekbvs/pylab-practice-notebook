"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { useEffect, useMemo, useRef } from "react";

export const pylabTheme = createTheme({
  theme: "dark",
  settings: {
    background: "transparent",
    backgroundImage: "",
    foreground: "#dbe7e0",
    caret: "#6ee7b7",
    selection: "rgba(52, 211, 153, 0.28)",
    selectionMatch: "rgba(52, 211, 153, 0.18)",
    lineHighlight: "rgba(52, 211, 153, 0.06)",
    gutterBackground: "transparent",
    gutterForeground: "#4b5f55",
    gutterBorder: "1px solid #1d2a24",
    fontFamily: "var(--font-mono-override), monospace",
  },
  styles: [
    { tag: t.comment, color: "#5c7267", fontStyle: "italic" },
    { tag: [t.keyword, t.modifier], color: "#c4a6ff" },
    { tag: [t.string, t.special(t.string)], color: "#fbbf24" },
    { tag: [t.number, t.bool, t.null], color: "#7dd3fc" },
    { tag: [t.definition(t.variableName), t.function(t.variableName)], color: "#93e6c2" },
    { tag: [t.function(t.propertyName), t.propertyName], color: "#8ad9b8" },
    { tag: t.operator, color: "#9fb8ac" },
    { tag: t.self, color: "#f472b6", fontStyle: "italic" },
    { tag: [t.className, t.typeName], color: "#6ee7b7" },
    { tag: t.bracket, color: "#9fb8ac" },
    { tag: t.punctuation, color: "#88a296" },
    { tag: t.variableName, color: "#dbe7e0" },
    { tag: t.tagName, color: "#f472b6" },
    { tag: t.attributeName, color: "#fbbf24" },
  ],
});

interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  maxHeight?: string;
  ariaLabel?: string;
  language?: "python" | "javascript";
  onRunShortcut?: () => void; // Shift+Enter
  onSubmitShortcut?: () => void; // Ctrl/Cmd+Enter
  autoFocus?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  minHeight = "auto",
  maxHeight,
  ariaLabel,
  language = "python",
  onRunShortcut,
  onSubmitShortcut,
  autoFocus,
}: CodeEditorProps) {
  const runRef = useRef(onRunShortcut);
  const submitRef = useRef(onSubmitShortcut);
  useEffect(() => {
    runRef.current = onRunShortcut;
    submitRef.current = onSubmitShortcut;
  });

  const extensions = useMemo(
    () => [language === "javascript" ? javascript() : python()],
    [language]
  );

  useEffect(() => {
    if (autoFocus) {
      // focus after mount
      const el = document.querySelector<HTMLInputElement>(".cm-content");
      el?.focus();
    }
  }, []);

  return (
    <div
      className="overflow-hidden rounded-md border border-lab-terminal-border/60 bg-lab-terminal/40"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (e.shiftKey) {
            if (runRef.current) {
              e.preventDefault();
              runRef.current();
            }
          } else if (e.metaKey || e.ctrlKey) {
            if (submitRef.current || runRef.current) {
              e.preventDefault();
              (submitRef.current ?? runRef.current)!();
            }
          }
        }
      }}
      role="group"
      aria-label={ariaLabel}
    >
      <CodeMirror
        value={value}
        height="auto"
        minHeight={minHeight}
        maxHeight={maxHeight}
        theme={pylabTheme}
        extensions={extensions}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
          highlightSelectionMatches: false,
        }}
        onChange={onChange}
      />
    </div>
  );
}
