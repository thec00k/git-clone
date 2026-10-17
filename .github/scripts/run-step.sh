#!/usr/bin/env bash
# Usage: run-step.sh <name> <command...>
# Runs a command, keeps its output, and on failure turns the useful lines into
# GitHub annotations so a failure can be read without downloading the log.
name="$1"; shift
log="${RUNNER_TEMP:-/tmp}/step-${name}.log"
set -o pipefail
"$@" 2>&1 | tee "$log"
status=$?
if [ "$status" -ne 0 ]; then
  grep -E "error|Error|FAIL|failed|✖|×|✗|Assertion|Expected|expected" "$log" | grep -v "^npm warn" | sed -E 's/\x1b\[[0-9;]*m//g' | sort -u | head -25 | while IFS= read -r line; do
    echo "::error title=${name}::${line//%/%25}"
  done
  tail=$(tail -20 "$log" | sed -E 's/\x1b\[[0-9;]*m//g; s/%/%25/g' | tr '\n' '|' | cut -c1-3500)
  echo "::error title=${name}-tail::${tail}"
fi
exit "$status"
