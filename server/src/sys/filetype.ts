import { execFileSync } from "child_process";

/**
 * Returns the description from the system's file command.
 * @param filePath must exist
 */
function filetype(filePath: string): string {
  const output = execFileSync("file", ["-b", filePath], { encoding: "utf8" });
  return output.trim();
}

export { filetype };