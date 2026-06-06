#!/usr/bin/env bash
# PostToolUse: after an Edit/Write/MultiEdit to a TypeScript file, run the repo's
# strict type check so the model gets immediate feedback.
#
# Conventions:
#   exit 0 = ok / no-op (also fail-open on missing tooling)
#   exit 2 = type check failed; tsc output written to stderr is shown to the model

set -u

REPO="/home/grimm/code/portfolio"

# Fail-open if jq is unavailable.
command -v jq >/dev/null 2>&1 || exit 0

INPUT="$(cat 2>/dev/null)"
[ -z "$INPUT" ] && exit 0

FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)" || exit 0
[ -z "$FILE_PATH" ] && exit 0

# Only act on TypeScript files.
case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Fail-open if npx is unavailable.
command -v npx >/dev/null 2>&1 || exit 0

# Run the repo's strict type check (no per-file tsc available in this project).
OUTPUT="$(cd "$REPO" && npx tsc --noEmit 2>&1)"
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  {
    echo "Type check failed (npx tsc --noEmit) after editing:"
    echo "  $FILE_PATH"
    echo ""
    echo "$OUTPUT"
  } >&2
  exit 2
fi

exit 0
