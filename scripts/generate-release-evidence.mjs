#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";

function command(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const formulaRegistry = await fs.readFile(
  new URL("../src/financial/formula-registry.v1.json", import.meta.url),
);
const evidence = {
  generatedAt: new Date().toISOString(),
  gitSha: command("git", ["rev-parse", "HEAD"]),
  branch: command("git", ["rev-parse", "--abbrev-ref", "HEAD"]),
  formulaRegistrySha256: createHash("sha256").update(formulaRegistry).digest("hex"),
  requiredGates: {
    unitTests: "UNVERIFIED",
    propertyTests: "UNVERIFIED",
    mutationTests: "UNVERIFIED",
    goldenCases: "UNVERIFIED",
    reportArtifactTests: "UNVERIFIED",
    productionCanary: "UNVERIFIED",
  },
};
console.log(JSON.stringify(evidence, null, 2));
