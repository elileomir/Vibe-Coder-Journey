"use client";

import { useState, useRef, useCallback } from "react";

/* ────────────────────────────────────────────
   Interactive Code Block
   
   Features:
   - Syntax-highlighted code display
   - Copy-to-clipboard with feedback
   - Editable mode for "try it yourself"
   - Simulated run output
   ──────────────────────────────────────────── */

interface InteractiveCodeBlockProps {
  code: string;
  language?: string;
  editable?: boolean;
  expectedOutput?: string;
  caption?: string;
}

/* Minimal keyword highlighting — no external deps */
function highlightSyntax(code: string, lang: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (!lang || lang === "text") return escaped;

  let highlighted = escaped;

  /* Strings */
  highlighted = highlighted.replace(
    /(&quot;|"|'|`)([^"'`]*?)(\1)/g,
    '<span class="code-string">$1$2$3</span>'
  );

  /* Comments */
  highlighted = highlighted.replace(
    /(\/\/.*$)/gm,
    '<span class="code-comment">$1</span>'
  );

  /* Keywords */
  const jsKeywords =
    /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g;
  const htmlKeywords =
    /\b(html|head|body|div|span|p|h[1-6]|a|img|ul|ol|li|script|style|link|meta|title)\b/g;
  const cssKeywords =
    /\b(color|background|margin|padding|border|display|flex|grid|position|font|width|height|top|left|right|bottom)\b/g;

  if (["js", "javascript", "jsx", "ts", "typescript", "tsx"].includes(lang)) {
    highlighted = highlighted.replace(
      jsKeywords,
      '<span class="code-keyword">$1</span>'
    );
  } else if (["html", "xml"].includes(lang)) {
    highlighted = highlighted.replace(
      htmlKeywords,
      '<span class="code-keyword">$1</span>'
    );
  } else if (["css", "scss"].includes(lang)) {
    highlighted = highlighted.replace(
      cssKeywords,
      '<span class="code-keyword">$1</span>'
    );
  }

  /* Numbers */
  highlighted = highlighted.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="code-number">$1</span>'
  );

  return highlighted;
}

export default function InteractiveCodeBlock({
  code,
  language = "javascript",
  editable = false,
  expectedOutput,
  caption,
}: InteractiveCodeBlockProps) {
  const [currentCode, setCurrentCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Fallback for older browsers */
      const textarea = document.createElement("textarea");
      textarea.value = currentCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentCode]);

  const handleRun = useCallback(() => {
    setShowOutput(true);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentCode(code);
    setShowOutput(false);
    setIsEditing(false);
  }, [code]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setShowOutput(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  return (
    <div className="content-block">
      <div className="interactive-code">
        {/* Header bar */}
        <div className="interactive-code-header">
          <div className="interactive-code-lang">
            <span className="interactive-code-dot" />
            <span className="interactive-code-dot" />
            <span className="interactive-code-dot" />
            <span>{language}</span>
          </div>
          <div className="interactive-code-actions">
            {editable && !isEditing && (
              <button
                className="interactive-code-btn"
                onClick={handleEdit}
                title="Edit code"
              >
                ✏️ Edit
              </button>
            )}
            {isEditing && (
              <button
                className="interactive-code-btn"
                onClick={handleReset}
                title="Reset code"
              >
                ↺ Reset
              </button>
            )}
            {expectedOutput && (
              <button
                className="interactive-code-btn interactive-code-run"
                onClick={handleRun}
                title="Run code"
              >
                ▶ Run
              </button>
            )}
            <button
              className="interactive-code-btn"
              onClick={handleCopy}
              title="Copy code"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
        </div>

        {/* Code area */}
        <div className="interactive-code-body">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              className="interactive-code-editor mono"
              value={currentCode}
              onChange={(e) => setCurrentCode(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          ) : (
            <pre className="interactive-code-pre">
              <code
                className="mono"
                dangerouslySetInnerHTML={{
                  __html: highlightSyntax(currentCode, language),
                }}
              />
            </pre>
          )}
        </div>

        {/* Output panel */}
        {showOutput && expectedOutput && (
          <div className="interactive-code-output">
            <div className="interactive-code-output-header">
              <span>📤 Output</span>
            </div>
            <pre className="interactive-code-output-body mono">
              {expectedOutput}
            </pre>
          </div>
        )}
      </div>
      {caption && (
        <div className="caption" style={{ marginTop: "0.5rem" }}>
          {caption}
        </div>
      )}
    </div>
  );
}
