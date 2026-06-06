#!/usr/bin/env bash
# PreToolUse guard: block Edit/Write/MultiEdit to SOURCE/site files when the new
# content contains a secret (AWS/Google/Stripe key) or an email address.
#
# Scope: only enforce on source/site files (paths containing "/src/" or the repo
# root site entry "index.html"). docs/, .claude/, *.md, lefthook.yml, etc. are
# skipped because they legitimately contain emails (per CLAUDE.md security rules).
#
# Conventions:
#   exit 0 = allow (also used as fail-open on any infra error)
#   exit 2 = block; reason written to stderr is shown to the model

set -u

# Fail-open if jq is unavailable.
command -v jq >/dev/null 2>&1 || exit 0

INPUT="$(cat 2>/dev/null)"
[ -z "$INPUT" ] && exit 0

# Parse fields defensively; jq parse failure => fail-open.
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)" || exit 0
FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"

[ -z "$FILE_PATH" ] && exit 0

# --- Scope check: only enforce on source/site files ---------------------------
# Enforce when path contains "/src/" OR is a repo-root index.html site entry.
case "$FILE_PATH" in
  */src/*) ;;                      # source tree -> enforce
  */index.html|index.html) ;;      # site entry  -> enforce
  *) exit 0 ;;                     # everything else (docs/, .claude/, *.md, etc.) -> skip
esac

# --- Collect the new/added text for the relevant tool -------------------------
case "$TOOL_NAME" in
  Write)
    NEW_TEXT="$(printf '%s' "$INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null)"
    ;;
  Edit)
    NEW_TEXT="$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // empty' 2>/dev/null)"
    ;;
  MultiEdit)
    NEW_TEXT="$(printf '%s' "$INPUT" | jq -r '[.tool_input.edits[]?.new_string // empty] | join("\n")' 2>/dev/null)"
    ;;
  *)
    exit 0
    ;;
esac

# Include the file_path itself in the scanned text (an email could hide in a name).
SCAN_TEXT="$(printf '%s\n%s' "$NEW_TEXT" "$FILE_PATH")"

# --- Regex (same patterns as lefthook.yml secrets-check) ----------------------
# NOTE: lefthook's literal pattern writes the Google-key class as
#   [0-9A-Za-z-_]
# where the trailing "-_" is parsed by GNU `grep -E` as a (reversed) RANGE and
# aborts with "grep: Invalid range end". We move the hyphen to the end of the
# class -> [0-9A-Za-z_-], which is the IDENTICAL character set (digits, letters,
# underscore, literal hyphen) but a valid ERE. All other alternatives are
# byte-for-byte identical to lefthook's regex.
REGEX='(AKIA|AIza[0-9A-Za-z_-]{35}|sk_live_[0-9a-zA-Z]{24}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'

# Use `command grep` to bypass any shell `grep` function (e.g. an interactive
# profile that aliases grep to ugrep) that could change matching behavior.
MATCH="$(printf '%s' "$SCAN_TEXT" | command grep -oE "$REGEX" 2>/dev/null | head -n1)"

if [ -n "$MATCH" ]; then
  {
    echo "BLOCKED by block-secrets hook: a forbidden pattern was found in the new content for:"
    echo "  $FILE_PATH"
    echo ""
    echo "Matched pattern: \"$MATCH\""
    echo ""
    echo "Per CLAUDE.md 'Security requirements (CRITICAL)', source/site files must NEVER contain"
    echo "email addresses, phone numbers, API keys, or secrets (AWS AKIA*, Google AIza*, Stripe sk_live_*)."
    echo "Remove the email/secret. Contact is form-only; secrets belong in AWS Secrets Manager / build-time"
    echo "VITE_WAF_* vars, never hardcoded in source."
  } >&2
  exit 2
fi

exit 0
