import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../", import.meta.url));
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
for (const args of [
  ["types"],
  ["types", "tiktok-secrets.d.ts", "--config", "wrangler.tiktok-types.jsonc", "--env-interface", "TikTokSecrets", "--include-runtime", "false"],
]) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: directory, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Make this generated interface an isolated module, so it cannot augment the
// production Cloudflare.Env namespace with mandatory feature secrets.
appendFileSync(new URL("../tiktok-secrets.d.ts", import.meta.url), "\nexport type { TikTokSecrets };\n");
