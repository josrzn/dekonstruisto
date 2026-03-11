import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function runCli(args: string[]) {
  const command = process.execPath;
  const cliArgs = ["--import", "tsx", "src/index.ts", ...args];

  try {
    const result = await execFileAsync(command, cliArgs, {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: failed.code ?? 1,
      stdout: failed.stdout ?? "",
      stderr: failed.stderr ?? "",
    };
  }
}

describe("CLI integration", () => {
  it("prints help", async () => {
    const result = await runCli(["help"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Paper Deconstructor CLI");
    expect(result.stdout).toContain("triage <paper.pdf>");
    expect(result.stdout).toContain("--debug");
  });

  it("fails when paper path is missing", async () => {
    const result = await runCli(["triage"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Error: Missing paper path.");
  });
});
