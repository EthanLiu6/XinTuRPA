import readline from "node:readline";
import { stdout } from "node:process";

export async function waitForEnter(promptText) {
  stdout.write(promptText + "\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  try {
    await new Promise((resolve) => rl.question("", () => resolve()));
  } finally {
    rl.close();
  }
}

