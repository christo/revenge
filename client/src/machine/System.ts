/*
 Metadata root model for all possibly supportable systems.
 */

import {C64} from "./cbm/c64.ts";
import {Vic20} from "./cbm/vic20.ts";

class System {
  shortName: string;
  fullName: string;
  url?: string;

  constructor(shortName: string, longName: string = shortName) {
    this.shortName = shortName;
    this.fullName = longName;
  }

}

export const SYSTEMS = [
  new System(Vic20.NAME, Vic20.LONG_NAME),
  new System(C64.NAME, C64.LONG_NAME),
  new System("C128", "Commodore 128"),
  new System("BBC", "BBC Micro Model B"),
  new System("ZX Spectrum", "Sinclair ZX Spectrum"),
  new System("ZX Spectrum+", "Sinclair ZX Spectrum+"),
  new System("ZX Spectrum 128", "Sinclair ZX Spectrum 128"),
  new System("VZ-300", "Dick Smith VZ-300"),
  new System("Oric Atmos"),
  new System("MicroBee", "MicroBee 32k"),
  new System("NES", "Nintendo Entertainment System"),
  new System("Apple IIc"),
  new System("GBA", "Nintendo GameBoy Advance"),
  new System("GameBoy", "Nintendo GameBoy"),
  new System("SNES", "Super Nintendo Entertainment System"),
  new System("TRS-80", "Radio Shack TRS-80 Model 1"),
];