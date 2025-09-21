import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export type RunpodResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export function getRunpodConfig() {
  let userHost = process.env.RUNPOD_SSH_USERHOST;
  if (!userHost) {
    const filePath = path.resolve(process.cwd(), ".runpod_userhost");
    if (fs.existsSync(filePath)) {
      userHost = fs.readFileSync(filePath, "utf8").toString().trim();
    }
  }
  if (!userHost) {
    userHost = "0amy1t8x5822bl-644117a0@ssh.runpod.io";
  }
  const keyPathRaw = process.env.RUNPOD_SSH_KEY_PATH ?? path.resolve(process.cwd(), "runpod_api_key");
  const keyPath = expandHomePath(keyPathRaw);
  return { userHost, keyPath };
}

function expandHomePath(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath.startsWith("~")) {
    const home = os.homedir();
    return path.join(home, inputPath.slice(1));
  }
  return inputPath;
}

export async function runpodExec(command: string, extraSshArgs: string[] = []): Promise<RunpodResult> {
  const { userHost, keyPath } = getRunpodConfig();
  if (!fs.existsSync(keyPath)) {
    throw new Error(`RunPod key not found at path: ${keyPath}`);
  }

  const baseArgs = [
    "-i",
    keyPath,
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ConnectTimeout=20",
    "-tt",
  ];

  const sshArgs = [...baseArgs, ...extraSshArgs, userHost, "bash", "-lc", command];

  return new Promise<RunpodResult>((resolve) => {
    const child = spawn("ssh", sshArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    if (child.stdout) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (data: Buffer | string) => {
        stdout += data.toString();
      });
    }
    if (child.stderr) {
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (data: Buffer | string) => {
        stderr += data.toString();
      });
    }
    child.on("close", (code) => {
      resolve({ code: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

export default { runpodExec, getRunpodConfig };



