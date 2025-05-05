# File Formats

## Commodore

Notes on existing file formats might be loaded, some of which ought to be detectable:

Section 17 of the VICE manual contains a [detailed summary file formats](https://vice-emu.sourceforge.io/vice_17.html)

* p00 program format - emulator snapshot (save state)
* CBM original prg format, first two bytes are load address

### Disk image file formats

* d64 very popular single sided 1541 disk image spec by [Wolfgang Moser](http://unusedino.de/ec64/technical/formats/d64.html)
  * 256 byte sectors, arranged by track.
  * 35 tracks
  * no magic number or metadata, content detection depends on format adherence
* d71 
* d81
* x64
* g64 GCR-encoded disk format, developed by emulator community to be better than d64
 
* t64 tape image

### TAP files

(via VICE manual)

* contains metadata such as computer platform and video standard (from which tape pulse clock
timer frequency is determined)
* pulse stream representing audio of a physical cassette tape ([original spec](https://ist.uwaterloo.ca/~schepers/formats/TAP.TXT))

### Supported File Formats in VICE

From [VICE Manual Chapter 1](https://vice-emu.sourceforge.io/vice_toc.html#TOC43)

Seems most likely these file formats are also filename extensions.

* `X64` or `D64` disk image files; Used by the 1541, 2031, 3040, 4040 drives.
* `G64` GCR-encoded 1541 disk image files
* `P64` lowlevel NRZI flux pulse disk image files
* `D67` CBM2040 (DOS1) disk image format
* `D71` VC1571 disk image format
* `D81` VC1581 disk image format
* `D80` CBM8050 disk image format
* `D82` CBM8250/1001 disk image format
* `D90` CBM D9090/60 disk image format
* `D1M` FD2000/FD4000 DD disk image format
* `D2M` FD2000/FD4000 HD disk image format
* `D4M` FD4000 ED disk image format
* `DHD` CMD HD disk image format
* `T64` tape container files (read-only)
* `TAP` lowlevel tape image files
* `P00` program files
* `CRT` C64 cartridge image files
* `TCRT` tapecart image files