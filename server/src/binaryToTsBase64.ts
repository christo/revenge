import {readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {encodeBase64} from "./common/analysis/base64.ts";

/*
code generation for binary file to typescript array literal
 */

interface RomFile {
  input: string;
  output: string;
  varName: string;
}

// TODO take these as parameters and move this into server/src/common
const ROM_FILES: RomFile[] = [
  {
    input: '../../roms/vic20/KERNAL.ROM',
    output: 'machine/cbm/vic20Kernal.ts',
    varName: 'VIC20_KERNAL_ROM'
  },
  {
    input: '../../roms/vic20/BASIC.ROM',
    output: 'machine/cbm/vic20Basic.ts',
    varName: 'VIC20_BASIC_ROM'
  }
];

function splitStringByLength(str: string, length: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < str.length; i += length) {
    result.push(str.slice(i, i + length));
  }
  return result;
}

function generateRomFile(rom: RomFile) {
  try {
    const data: Buffer = readFileSync(join(import.meta.dir, rom.input));

    const byteArray = new Uint8Array(data);

    let tsContent: string = `// Converted from ${rom.input}\n\n`;
    tsContent += `import {decodeBase64} from "../../../../server/src/common/analysis/base64.ts";\n\n`
    tsContent += `export const ${rom.varName}: number[] = Array.from(decodeBase64(\`\n`;

    tsContent += splitStringByLength(encodeBase64(byteArray), 110).join('\n');

    tsContent += "`));\n";
    writeFileSync(join(import.meta.dir, rom.output), tsContent);

    console.log(`Successfully converted ${byteArray.length} bytes from ${rom.input} to ${rom.output}`);
  } catch (error) {
    console.error(`Error processing ${rom.input}:`, error instanceof Error ? error.message : String(error));
  }
}

function generateRomFiles(romFiles: RomFile[]) {
  romFiles.forEach(generateRomFile);
}

export {splitStringByLength};