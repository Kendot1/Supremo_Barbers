import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(filename) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [filename] : [];
  });
}

function resolveImport(filename, specifier) {
  const target = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : path.resolve(path.dirname(filename), specifier);
  return [target, ...[".ts", ".tsx", ".js", ".json", "/index.ts", "/index.tsx"].map((extension) => target + extension)]
    .find((candidate) => existsSync(candidate));
}

test("source root contains application entry points, not duplicate project scaffolding", () => {
  const files = readdirSync(path.join(root, "src"), { withFileTypes: true })
    .filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  assert.deepEqual(files, ["App.tsx", "main.tsx"]);
  assert.ok(existsSync(path.join(root, "supabase/functions/server/appointmentRules.ts")));
});

test("application screens are grouped by feature rather than mixed into shared components", () => {
  for (const feature of ["admin", "auth", "barber", "booking", "customer", "legal", "marketing", "notifications", "payments", "chat"]) {
    assert.ok(existsSync(path.join(root, "src/features", feature)), `Missing feature: ${feature}`);
  }
  assert.ok(existsSync(path.join(root, "src/types/domain.ts")));
  assert.ok(existsSync(path.join(root, "src/components/layout/RoleShell.tsx")));
});

test("every local import reachable from the browser entry point resolves", () => {
  const visited = new Set();
  const queue = [path.join(root, "src/main.tsx")];
  while (queue.length) {
    const filename = queue.pop();
    if (visited.has(filename) || !/\.[jt]sx?$/.test(filename)) continue;
    visited.add(filename);
    const content = readFileSync(filename, "utf8");
    const imports = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])([^"']+)\1/g;
    for (const match of content.matchAll(imports)) {
      const specifier = match[2];
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue;
      const target = resolveImport(filename, specifier);
      assert.ok(target, `${path.relative(root, filename)}: unresolved ${specifier}`);
      queue.push(target);
    }
  }
  assert.ok(visited.size > 10, "Import traversal should cover the application, not just its entry point");
});

test("feature and shared modules do not depend on the application composition root", () => {
  const violations = sourceFiles(path.join(root, "src"))
    .filter((filename) => path.basename(filename) !== "App.tsx" && path.basename(filename) !== "main.tsx")
    .filter((filename) => /from\s*["'](?:[^"']*\/)?App["']/.test(readFileSync(filename, "utf8")));
  assert.deepEqual(violations.map((filename) => path.relative(root, filename)), []);
});
