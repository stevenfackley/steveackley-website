# Implementation Plan - Production Stability & R2 Integration

## Objective
Fix the "Permission Denied" deployment crashes, restore missing images via R2 integration, and resolve the 500 Internal Server Error.

## Key Files
- `.github/workflows/deploy.yml`: Add `chmod +x` for the entrypoint.
- `docker-compose.yml`: Add persistent `uploads` volume mount.
- `packages/shared/src/db/schema.ts`: Investigate `Post` table mapping.
- `web.env` (Server): Inject R2 credentials.

## Implementation Steps

### 1. Fix CI/CD & Infrastructure (DONE locally, needs commit)
- [x] Update `docker-compose.yml` to include `./uploads:/app/uploads`.
- [x] Update `deploy.yml` to include `chmod +x docker/entrypoint.sh` before starting containers.

### 2. Configure R2 Environment Variables
The user should add the following secrets to GitHub Actions to ensure `web.env` is populated correctly on every deploy:
- `R2_ACCOUNT_ID`: `7c2523de841058b55de07942589f8bf5`
- `R2_ACCESS_KEY_ID`: [User to provide]
- `R2_SECRET_ACCESS_KEY`: [User to provide]
- `R2_BUCKET`: `steve-ackley-org-live`
- `R2_PUBLIC_URL`: [User to provide - e.g., https://pub-xyz.r2.dev]

### 3. Update Database Image References
Once the R2 URL is known, execute the following on the production server to fix the broken image:
```bash
docker exec -i steveackley-db psql -U steveackley -d steveackleydb <<EOF
UPDATE "SiteSetting" 
SET value = 'https://<YOUR_R2_PUBLIC_URL>/stevebrookeavatar.png' 
WHERE key = 'couple_photo_url';
EOF
```

### 4. Resolve 500 Error (Post Table)
- Inspect `packages/shared/src/db/schema.ts` to see if the `Post` table is defined as `"Post"` (quoted) or `post`.
- If Drizzle is generating `SELECT * FROM post` but the table is `Post`, update the schema definition to enforce the correct casing.

## Verification & Testing
- **Deployment**: Run the GitHub Action and verify `steveackley-web` stays `Up` (no permission errors).
- **Images**: Check the homepage and verify the "Couple Photo" loads from the R2 URL.
- **Data**: Verify the blog list page (or wherever `Post` is used) no longer returns a 500 error.
