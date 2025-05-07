import {Cpu} from "./Cpu.js";
import {Endian} from "./Endian.js";
import {Memory} from "./Memory.js";
import {MemoryConfiguration} from "./MemoryConfiguration.js";
import {RomImage} from "./RomImage.js";

/**
 * Stateful instance of a specific computer with memory, cpu, etc.
 * TODO implement method to load ROMs
 */
abstract class Computer {
  private _memory: Memory<Endian>;
  private readonly roms: RomImage[];
  private readonly _memoryConfig: MemoryConfiguration;
  private readonly _name: string;
  private readonly _tags: string[];
  private readonly _cpu: Cpu<Endian>;

  protected constructor(
      name: string,
      cpu: Cpu<Endian>,
      memory: Memory<Endian>,
      memoryConfig: MemoryConfiguration,
      roms: RomImage[],
      tags: string[]) {
    this.roms = roms;
    this._name = name;
    this._cpu = cpu;
    this._memory = memory;
    this._memoryConfig = memoryConfig;
    this._tags = tags;
  }

  get cpu() {
    return this._cpu;
  }

  memory() {
    return this._memoryConfig;
  }

  name() {
    return this._name;
  }

  // noinspection JSUnusedGlobalSymbols
  tags() {
    return this._tags;
  }

  pushWordBytes(ba: number[], word: number) {
    return this._memory.endianness().pushWordBytes(ba, word);
  }

  /**
   * Load configured ROM images into their respective locations.
   */
  loadRoms() {
    if (this._memory.writeable()) {
      this.roms.forEach(rom => this._memory.load(rom.getBytes(), rom.getLoadAddress()));
    } else {
      throw Error("Memory is not writeable");
    }
  }
}

export {Computer};