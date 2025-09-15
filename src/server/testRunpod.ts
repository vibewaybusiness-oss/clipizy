import { runpodExec } from "./runpodClient";

async function main() {
  const result = await runpodExec("echo connected && uname -a && whoami");
  console.log("EXIT:", result.code);
  console.log("STDOUT:\n" + result.stdout);
  if (result.stderr) {
    console.error("STDERR:\n" + result.stderr);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


















