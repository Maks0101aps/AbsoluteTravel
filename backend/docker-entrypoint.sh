#!/bin/sh
set -e

# On first start (empty data volume) copy the migrated + seeded SQLite
# template created during the image build. Existing databases are left alone.
DB_PATH="${DATABASE_URL#file:}"
if [ "$DB_PATH" != "$DATABASE_URL" ] && [ -n "$DB_PATH" ] && [ ! -f "$DB_PATH" ]; then
  echo "No database at $DB_PATH — initializing from seeded template."
  mkdir -p "$(dirname "$DB_PATH")"
  cp /app/prisma/template.db "$DB_PATH"
fi

exec "$@"
