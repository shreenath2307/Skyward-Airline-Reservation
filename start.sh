#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -f .env ] || { cp .env.example .env; echo "Created .env - set DB_PASSWORD in it, then run ./start.sh again."; exit 1; }
[ -d node_modules ] || npm install
node server/index.js
