import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// This app is fully static (no ISR, no on-demand revalidation, no tag cache),
// so OpenNext runs fine with its default (no-op) caches.
//
// If you later add ISR / revalidation, wire up a real cache, e.g.:
//   import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: kvIncrementalCache });
export default defineCloudflareConfig({});
