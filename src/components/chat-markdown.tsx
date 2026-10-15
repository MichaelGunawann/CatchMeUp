"use client";

import * as React from "react";

/**
 * Renders the small Markdown subset the AI tutor writes (bold, italic,
 * inline code, headings, bullet/numbered lists, simple tables) as real
 * formatting instead of showing raw "**" asterisks. Builds React elements
 * only - never injects HTML - so model output can't run markup/scripts.
 * `renderSource` turns "[Sumber: ...]" citations into clickable chips.
 */

type InlineRenderer = (text: string, key: string) => React.ReactNode;

function renderInline(text: string, keyBase: string, renderSource?: InlineRenderer): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Order matters: citations, code, bold, italic.
  const re = /(\[Sumber:[^\]]*\])|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (m[1]) out.push(renderSource ? renderSource(tok, key) : tok);
    else if (m[2]) out.push(<code key={key} className="rounded bg-background px-1 py-0.5 text-[0.92em]">{tok.slice(1, -1)}</code>);
    else if (m[3] || m[4]) out.push(<strong key={key} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>);
    else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ChatMarkdown({ content, renderSource }: { content: string; renderSource?: InlineRenderer }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const inline = (t: string) => renderInline(t, `b${k}`, renderSource);

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Heading
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      blocks.push(<p key={k++} className="mt-2 font-bold text-ink first:mt-0">{inline(h[2])}</p>);
      i++; continue;
    }

    // Table (| a | b |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().slice(1, -1).split("|").map(c => c.trim());
        if (!cells.every(c => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push(
        <div key={k++} className="my-1 overflow-x-auto">
          <table className="w-full border-collapse text-[0.95em]">
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={ri === 0 ? "font-semibold" : ""}>
                  {r.map((c, ci) => <td key={ci} className="border border-border px-2 py-1 align-top">{renderInline(c, `t${k}-${ri}-${ci}`, renderSource)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lists
    const bullet = /^[-*•]\s+(.*)$/;
    const numbered = /^(\d+)[.)]\s+(.*)$/;
    if (bullet.test(trimmed) || numbered.test(trimmed)) {
      const ordered = numbered.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const bm = t.match(bullet); const nm = t.match(numbered);
        if (ordered && nm) items.push(nm[2]);
        else if (!ordered && bm) items.push(bm[1]);
        else if (t && /^\s{2,}/.test(lines[i]) && items.length) items[items.length - 1] += " " + t; // wrapped line
        else break;
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={k++} className={ordered ? "my-1 list-decimal space-y-1 pl-5" : "my-1 list-disc space-y-1 pl-5"}>
          {items.map((it, ii) => <li key={ii}>{renderInline(it, `l${k}-${ii}`, renderSource)}</li>)}
        </ListTag>,
      );
      continue;
    }

    // Paragraph (consecutive non-empty, non-special lines)
    // Always consume the current line (guarantees progress), then any
    // following plain lines.
    const para: string[] = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*•]\s|\d+[.)]\s|\|.*\|$)/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={k++} className="my-1 first:mt-0 last:mb-0">{inline(para.join(" "))}</p>);
  }

  return <div className="space-y-1">{blocks}</div>;
}
