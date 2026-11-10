import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const path = ".env.local";
let content = existsSync(path)
  ? readFileSync(path, "utf8")
  : readFileSync(".env.example", "utf8");
if (!/^ADMIN_PASSWORD=.+$/m.test(content)) {
  const setting = `ADMIN_PASSWORD=${randomBytes(18).toString("base64url")}`;
  content = /^ADMIN_PASSWORD=.*$/m.test(content)
    ? content.replace(/^ADMIN_PASSWORD=.*$/m, setting)
    : content + "\n" + setting + "\n";
}
writeFileSync(path, content);
console.log(
  "Local configuration ready. Find your staff password under ADMIN_PASSWORD in .env.local.",
);
console.log(
  "Add OPENAI_API_KEY to enable OpenAI. Without it, the app uses its curated offline fallback.",
);
console.log(
  "Restart the server after configuration changes. Run npm run dev to begin.",
);
