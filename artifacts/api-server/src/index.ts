import app from "./app";
import { seedAdmin } from "./lib/seed";

// Run seed once on cold start (non-blocking)
seedAdmin().catch(console.error);

export default app;
