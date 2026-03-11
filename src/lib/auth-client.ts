import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  // By omitting baseURL, the client will automatically use the current window origin.
  // This ensures it works on both localhost:3000 and your production domain without rebuilds.
});
