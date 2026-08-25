#!/bin/bash
set -e

set -a
source .env
set +a

if [ -z "$DATABASE_URL_TEST" ]; then
    echo "FAIL: DATABASE_URL_TEST not set."
    exit 1
fi

if [ "$DATABASE_URL" == "$DATABASE_URL_TEST" ]; then
    echo "FAIL: DATABASE_URL and DATABASE_URL_TEST match. Aborting."
    exit 1
fi

echo "Isolation verified. Proceeding with migration."

export DATABASE_URL=$DATABASE_URL_TEST
export JWT_SECRET="test_e2e_secret"
export PORT=3002

echo "Running migrate deploy..."
npx prisma migrate deploy

echo "Starting test server..."
npx tsx server.ts > test_server.log 2>&1 &
SERVER_PID=$!

sleep 5

echo "Test server PID: $SERVER_PID"

echo "Running test script..."
npx tsx phase3.5-test.ts

echo "Cleaning up..."
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true

echo "Done."
