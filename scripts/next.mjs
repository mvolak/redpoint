// Starts the Next.js CLI for apps/redcord-web directly with Node — no nested pnpm process.
//
// Why: on Windows, Node/libuv aborts with
//   "Assertion failed: process_title, file ...\uv\src\win\util.c"
// when something reads process.title while the console title is empty (seen in some
// Git Bash setups). Setting a title first gives the console a non-empty title, which
// child processes (the Next.js server and its workers) inherit.
//
// Usage: node scripts/next.mjs <dev|build|start> [next options]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

try {
  process.title = "redcord-web";
} catch {
  // Not fatal: some environments do not allow changing the title.
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(root, "apps/redcord-web");
const nextBin = createRequire(resolve(appDir, "package.json")).resolve("next/dist/bin/next");

const [command = "dev", ...rest] = process.argv.slice(2);
if (!["dev", "build", "start"].includes(command)) {
  console.error(`Unknown command "${command}". Use dev, build or start.`);
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, command, ...rest], { cwd: appDir, stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
