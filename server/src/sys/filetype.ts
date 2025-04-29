import {execFileSync} from "child_process";

/**
 * Returns the stdout of shell executing `file --version` or null if it fails.
 * @returns version of the file command or null
 */
export function getFileVersion(): string | null {
  let versionResult: string | null = null;
  try {
    // will throw on non-zero exit code
    execFileSync(`which file`, {shell: true});
    try {
      versionResult = execFileSync(`file --version`, {shell: true, encoding: "utf8"}).toString();
    } catch (e) {
      console.warn(`error while calling "file --version"`, e);
    }
  } catch (e) {
    console.warn(`Cannot find file command on path`, e);
  }
  return versionResult;
}


/**
 * Returns the description from the system's file command.
 * @param filePath must exist
 */
function filetype(filePath: string): string {
  const output = execFileSync("file", ["-b", filePath], {encoding: "utf8"});
  return output.trim();
}

export {filetype};