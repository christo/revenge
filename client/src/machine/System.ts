/*
 Metadata root model for all possibly supportable systems.
 */

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
  new System("VIC-20", "Commodore VIC-20"),
  new System("C64", "Commodore C64"),
  new System("C128", "Commodore 128"),
  new System("ZX Spectrum", "Sinclair ZX Spectrum"),
  new System("ZX Spectrum+", "Sinclair ZX Spectrum+"),
  new System("ZX Spectrum 128", "Sinclair ZX Spectrum 128"),
  new System("BBC", "BBC Micro Model B"),
  new System("VZ-300", "Dick Smith VZ-300"),
  new System("Oric Atmos"),
  new System("MicroBee", "MicroBee 32k"),
  new System("GBA", "Nintendo GameBoy Advance"),
  new System("GameBoy", "Nintendo GameBoy"),
  new System("NES", "Nintendo Entertainment System"),
  new System("SNES", "Super Nintendo Entertainment System"),
  new System("Apple IIc"),
];