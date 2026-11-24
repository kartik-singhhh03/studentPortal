#!/bin/sh
set -eu

# Migrations use DATABASE_URL_UNPOOLED (direct). App runtime uses DATABASE_URL (pooled).
./node_modules/.bin/prisma migrate deploy
exec node server.js
