/*
 Metadata root model for all possibly supportable systems.
 */

/**
 * Represents a type of file on a retro system with an optional spec url.
 */
type FileType = {
  ext: string, desc: string, url?: string;
}

type UrlRef = {
  name: string,
  url: string,
  blurb?: string
}

// future: introduce variant and configuration specification api based on software requirements, especially
//  those that can be detected from software binaries, automated manual reading or automated on-screen
//  instruction reading

/**
 * Identifies a computer model or family of models.
 */
class System {
  shortName: string;
  fullName: string;
  readonly filetypes: FileType[];
  readonly urls: UrlRef[];

  constructor(shortName: string, longName: string = shortName) {
    this.shortName = shortName;
    this.fullName = longName;
    this.filetypes = [];
    this.urls = [];
  }

  addFiletype(ext: string, desc: string, url?: string) {
    this.filetypes.push({ext: ext.toLowerCase(), desc, url});
    return this;
  }

  addUrl(name: string, url: string, blurb?: string,) {
    this.urls.push({name, url, blurb});
    return this;
  }
}

// future: probably belongs in a config file
// TODO generate a page using this info
const SYSTEMS = [
  new System("VIC-20", "Commodore VIC-20"),
  new System("C64", "Commodore 64"),
  new System("C128", "Commodore 128"),
  new System("BBC", "BBC Micro Model B")
      .addUrl(
          "Beeb Wiki",
          "https://beebwiki.mdfs.net/Main_Page",
          "articles relating to the Acorn BBC Microcomputer and related computers")
      .addUrl("Stardot Forums", "https://www.stardot.org.uk/forums/")
      .addFiletype("dsd", "BBC double-sided disk image", "https://beebwiki.mdfs.net/Acorn_DFS_disc_format")
      .addFiletype("ssd", "BBC single-sided disk image", "https://beebwiki.mdfs.net/Acorn_DFS_disc_format"),
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

export {SYSTEMS, System, type FileType, type UrlRef};