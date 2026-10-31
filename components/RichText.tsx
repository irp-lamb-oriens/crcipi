import type { ReactNode } from "react";

// Renders member-written plain text safely (never as HTML). Supported:
// blank-line paragraphs, "## " / "### " headings, and "- " bullet lists.
export default function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const chunks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  chunks.forEach((chunk, i) => {
    const lines = chunk.split("\n").map((line) => line.trimEnd()).filter(Boolean);
    if (lines.length === 0) return;

    if (lines.every((line) => /^\s*[-*•]\s+/.test(line))) {
      blocks.push(
        <ul key={i}>
          {lines.map((line, j) => (
            <li key={j}>{line.replace(/^\s*[-*•]\s+/, "")}</li>
          ))}
        </ul>
      );
      return;
    }
    if (lines.length === 1 && lines[0].startsWith("### ")) {
      blocks.push(<h3 key={i}>{lines[0].slice(4)}</h3>);
      return;
    }
    if (lines.length === 1 && lines[0].startsWith("## ")) {
      blocks.push(<h2 key={i}>{lines[0].slice(3)}</h2>);
      return;
    }
    blocks.push(
      <p key={i}>
        {lines.map((line, j) => (
          <span key={j}>
            {j > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
    );
  });

  return <div className={className}>{blocks}</div>;
}
