#!/bin/bash
set -e

echo "Applying initial migration (0000)..."
docker exec -i steveackleyorg-db-1 psql -U steveackley -d steveackleydb < drizzle/0000_typical_carlie_cooper.sql

echo "Applying new migration (0001)..."
docker exec -i steveackleyorg-db-1 psql -U steveackley -d steveackleydb < drizzle/0001_shiny_gressill.sql

echo "✅ Migrations applied successfully!"
