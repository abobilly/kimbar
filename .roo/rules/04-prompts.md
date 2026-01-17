# Roo Quick-Action Prompts

## READ FIRST probe (run once per session)

Before doing anything else, list every rules file you loaded (full relative paths) and summarize the top 5 binding invariants you will enforce. If you did not load any, say "NO RULES LOADED" and stop.

## Task preamble (use for every task)

READ FIRST: include the exact rules files you loaded (full relative paths) before acting.

## Refactor prompt

Use plain markdown with no fenced code blocks and no “Copy code” artifacts. Paste this:

Refactor the following code safely in the kimbar repo.

Source: ${filePath}:${startLine}-${endLine}

Goal (from user notes):
${userInput}

Code:
${selectedText}

Constraints:

Minimal diff; no behavior change unless explicitly requested.

Preserve invariants: Tiled layer contract; registry-driven asset loading; generated/ vs public/ separation; no new hardcoded paths.

If you split files, update imports and add verification command(s).

Output:

Refactor intent (1–2 sentences)

Diff blocks (only the changed hunks; include file paths)

Commands to verify
