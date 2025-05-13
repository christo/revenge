import {readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {encodeBase64} from "./common/analysis/base64.js";

/*
code generation for binary file to typescript array literal using base 64 encoding
 */

interface RomFile {
  input: string;
  output: string;
  varName: string;
}

const ROM_FILES: RomFile[] = [
  {
    input: '../data/roms/vic20/KERNAL.ROM',
    output: 'common/machine/cbm/vic20Kernal.ts',
    varName: 'VIC20_KERNAL_ROM'
  },
  {
    input: '../data/roms/vic20/BASIC.ROM',
    output: 'common/machine/cbm/vic20Basic.ts',
    varName: 'VIC20_BASIC_ROM'
  },
  {
    input: '../data/roms/vic20/CHAR.ROM',
    output: 'common/machine/cbm/vic20Char.ts',
    varName: 'VIC20_CHAR_ROM'
  },
  {
    input: '../data/roms/c64/KERNAL.ROM',
    output: 'common/machine/cbm/c64Kernal.ts',
    varName: 'C64_KERNAL_ROM'
  },
  {
    input: '../data/roms/c64/BASIC.ROM',
    output: 'common/machine/cbm/c64Basic.ts',
    varName: 'C64_BASIC_ROM'
  },
  {
    input: '../data/roms/c64/CHAR.ROM',
    output: 'common/machine/cbm/c64Char.ts',
    varName: 'C64_CHAR_ROM'
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
    tsContent += `import {decodeBase64} from "../../analysis/base64.js";\n\n`
    tsContent += `export const ${rom.varName}: number[] = Array.from(decodeBase64(\`\n`;

    tsContent += splitStringByLength(encodeBase64(byteArray), 110).join('\n');

    tsContent += "`));\n";
    writeFileSync(join(import.meta.dir, rom.output), tsContent);

    console.log(`Successfully converted ${byteArray.length} bytes from ${rom.input} to ${rom.output}`);
  } catch (error) {
    console.error(`Error processing ${rom.input}:`, error instanceof Error ? error.message : String(error));
  }
}

function generateRomFiles(romFiles: RomFile[] = ROM_FILES) {
  romFiles.forEach(generateRomFile);
}

generateRomFiles();

export {splitStringByLength};