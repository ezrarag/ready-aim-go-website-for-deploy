"use client"

import { Fragment, type ReactNode } from "react"

// A small, dependency-free markdown renderer for the admin Guides section.
// Supports the subset used by our guide files: headings, bold, inline code,
// fenced code blocks, ordered/unordered lists, blockquotes, links, and rules.

function renderLinks(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (match) {
      return (
        <a
          key={`${keyPrefix}-l${i}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {match[1]}
        </a>
      )
    }
    return <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>
  })
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split out inline code first (literal), then bold, then links.
  return text.split(/(`[^`]+`)/g).flatMap((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return [
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>,
      ]
    }
    return part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return (
          <strong key={`${keyPrefix}-b${i}-${j}`} className="font-semibold text-foreground">
            {renderLinks(seg.slice(2, -2), `${keyPrefix}-b${i}-${j}`)}
          </strong>
        )
      }
      return <Fragment key={`${keyPrefix}-s${i}-${j}`}>{renderLinks(seg, `${keyPrefix}-s${i}-${j}`)}</Fragment>
    })
  })
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 text-sm">
          <code className="font-mono text-foreground">{code.join("\n")}</code>
        </pre>
      )
      continue
    }

    // Blank line
    if (line.trim() === "") {
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-6 border-border" />)
      i++
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const cls =
        level <= 1
          ? "mt-6 mb-3 text-xl font-semibold text-foreground"
          : level === 2
          ? "mt-6 mb-2 text-lg font-semibold text-foreground"
          : "mt-4 mb-2 text-base font-semibold text-foreground"
      blocks.push(
        <p key={key++} className={cls}>
          {renderInline(heading[2], `h${key}`)}
        </p>
      )
      i++
      continue
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quote: string[] = []
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""))
        i++
      }
      blocks.push(
        <blockquote key={key++} className="my-3 border-l-2 border-primary/40 pl-4 text-muted-foreground">
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""))
        i++
      }
      blocks.push(
        <ul key={key++} className="my-3 list-disc space-y-1 pl-6 text-foreground">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `ul${key}-${idx}`)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""))
        i++
      }
      blocks.push(
        <ol key={key++} className="my-3 list-decimal space-y-1 pl-6 text-foreground">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `ol${key}-${idx}`)}</li>
          ))}
        </ol>
      )
      continue
    }

    // Paragraph (gather consecutive non-empty, non-special lines)
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !lines[i].startsWith(">") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed text-foreground">
        {renderInline(para.join(" "), `p${key}`)}
      </p>
    )
  }

  return <div className="text-sm">{blocks}</div>
}
