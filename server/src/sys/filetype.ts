import { execFileSync } from "child_process";

function filetype(filePath: string): string {
  const output = execFileSync("file", ["-b", filePath], { encoding: "utf8" });
  return output.trim();
}

export { filetype };