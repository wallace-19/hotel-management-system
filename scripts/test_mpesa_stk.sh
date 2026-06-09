#!/usr/bin/env bash
# Usage: ID_TOKEN=... ./scripts/test_mpesa_stk.sh [amount] [phone]
set -e
ID_TOKEN=${ID_TOKEN:-}
if [ -z "$ID_TOKEN" ]; then
  echo "Set ID_TOKEN env var (get it via scripts/get_id_token.js)"
  exit 1
fi
AMOUNT=${1:-100}
PHONE=${2:-+2547XXXXXXXX}

curl -i -sS -X POST http://127.0.0.1:3001/api/mpesa/pay \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":$AMOUNT,\"phone\":\"$PHONE\"}"

echo
