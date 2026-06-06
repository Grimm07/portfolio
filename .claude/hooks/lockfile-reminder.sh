#!/usr/bin/env bash
# PostToolUse: after an Edit/Write/MultiEdit to package.json, surface a NON-BLOCKING
# advisory reminder about the Vite 8 / Rolldown @emnapi lockfile gotcha.
#
# Conventions:
#   exit 0 always (non-blocking / advisory only; also fail-open on missing tooling).
#   When package.json was touched, print a PostToolUse additionalContext JSON object
#   to stdout so Claude Code injects the reminder into the model's context.

set -u

# Fail-open if jq is unavailable.
command -v jq >/dev/null 2>&1 || exit 0

INPUT="$(cat 2>/dev/null)"
[ -z "$INPUT" ] && exit 0

FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)" || exit 0
[ -z "$FILE_PATH" ] && exit 0

# Only act on package.json (exact basename match).
[ "$(basename "$FILE_PATH")" = "package.json" ] || exit 0

MSG="package.json was modified. Per the Vite 8 / Rolldown @emnapi lockfile gotcha, do not rely on an incremental \`npm install\` (it drops optional @emnapi/* native deps from package-lock.json and breaks CI \`npm ci\`). Regenerate the lockfile cleanly with: rm -rf node_modules package-lock.json && npm install, before running \`npm ci\`."

jq -nc --arg c "$MSG" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$c}}' 2>/dev/null || exit 0

exit 0
