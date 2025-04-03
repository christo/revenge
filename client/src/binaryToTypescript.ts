import {readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {hex16} from "./machine/core.ts";

/*
code generation for binary file to typescript array literal
 */

interface RomFile {
  input: string;
  output: string;
  varName: string;
}

const romFiles: RomFile[] = [
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

// Process each ROM file
romFiles.forEach((rom: RomFile) => {
  try {
    // @ts-ignore
    const data: Buffer = readFileSync(join(import.meta.dir, rom.input));

    const byteArray: number[] = [...new Uint8Array(data)];

    let tsContent: string = `// Converted from ${rom.input}\n`;
    tsContent += `export const ${rom.varName}: number[] = [\n`;

    const PER_LINE: number = 20;
    for (let i = 0; i < byteArray.length; i += PER_LINE) {
      const line: string = byteArray.slice(i, i + PER_LINE).map(hex16).join(', ');
      tsContent += `  ${line},\n`;
    }

    tsContent += `];\n`;
    // @ts-ignore
    writeFileSync(join(import.meta.dir, rom.output), tsContent);

    console.log(`Successfully converted ${byteArray.length} bytes from ${rom.input} to ${rom.output}`);
  } catch (error) {
    console.error(`Error processing ${rom.input}:`, error instanceof Error ? error.message : String(error));
  }
});