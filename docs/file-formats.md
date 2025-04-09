# File Formats

Notes on existing file formats might be loaded, some of which ought to be detectable:

Section 17 of the VICE manual contains a [detailed summary file formats](https://vice-emu.sourceforge.io/vice_17.html)

* p00 program format - emulator snapshot (save state)
* CBM original prg format, first two bytes are load address

## Disk image file formats

* d64 very popular single sided 1541 disk image spec by [Wolfgang Moser](http://unusedino.de/ec64/technical/formats/d64.html)
  * 256 byte sectors, arranged by track.
  * 35 tracks
  * no magic number or metadata, content detection depends on format adherence
* d71 
* d81
* x64
* g64 GCR-encoded disk format, developed by emulator community to be better than d64
 
* t64 tape image

# TAP files

(via VICE manual)

* contains metadata such as computer platform and video standard (from which tape pulse clock
timer frequency is determined)
* pulse stream representing audio of a physical cassette tape ([original spec](https://ist.uwaterloo.ca/~schepers/formats/TAP.TXT))
* 