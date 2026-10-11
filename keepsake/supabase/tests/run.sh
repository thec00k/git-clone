#!/usr/bin/env bash
# Applies the migrations to a scratch database and runs the policy tests.
# Needs psql and a Postgres 15+ server. Usage: PGHOST=... PGPORT=... PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="keepsake_test_$$"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "create database $db"
trap 'psql -q -d postgres -c "drop database if exists $db" >/dev/null' EXIT
run() { psql -v ON_ERROR_STOP=1 -q -X -o /dev/null -d "$db" -f "$1"; }
run "$here/harness.sql"
for f in "$here"/../migrations/*.sql; do echo "migrate $(basename "$f")"; run "$f"; done
for f in "$here"/test_*.sql; do echo "test $(basename "$f")"; run "$f"; done
echo "All database tests passed."
