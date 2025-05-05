# Reverse Engineering

Notes about reverse engineering, especially on retro computers.

If these links go dead please create an issue on the repo or submit a pull request.

## Links for Reverse Engineering on Retrocomputers

* [Reverse Engineering Reading List](https://github.com/onethawt/reverseengineering-reading-list)
* https://6502disassembly.com/on-disassembly.html
* https://6502disassembly.com/

## Notable Reverse Engineered Retro Software

People have achieved epic feats of reverse engineering using existing tools usually including a lot of manual work. These provide useful points of comparison for what this project might one day achieve.

* Elite, originally developed for and on the BBC Micro, this code and various ports have been heroically reverse engineered: [Elite on the 6502](https://elite.bbcelite.com/) incorporating versions for BBC Micro, Acorn Electron, Commodore 64, Apple II and NES. Note that original source code has also been published. Apparently the C64 port was developed on BBC with a cross-development hardware system called PDS that sent binary builds to a C64 over a cable.
* Rob Hogan (mwenge) reverse engineered [Gridrunner for VIC-20](https://github.com/mwenge/gridrunner)
* [Bugs and Quirks in the VIC-20 Kernal](https://www.sleepingelephant.com/ipw-web/bulletin/bb/viewtopic.php?t=10804) (also applies to C64) topic on Denial, the VIC-20 forum.
* Reverse engineered C64 source code by the awesome mist64 (Michael Steil)
  https://github.com/mist64/cbmsrc


## Retroprogramming and Reversing

* [C64 cross-dev links](https://codebase64.org/doku.php?id=base:crossdev)
* https://www.nesdev.org/wiki/Tools assemblers and disassemblers with a focus on NES
* https://www.nesdev.org/wiki/Programming_guide good array of NES-focused programming links and
  examples
* ["Awesome Reverse Engineering" resource list](https://github.com/wtsxDev/reverse-engineering)
* Matson Dawson's Dart VIC-20 emulator https://github.com/matsondawson/vic20dart
* C / WASM VIC-20 emulator by Nino Porcino (nippur72) https://github.com/nippur72/vic20-emu
  Also check out the reference software https://github.com/nippur72/vic20-emu/tree/master/software
* Scala commodore multi-system emulator [kernal64](https://github.com/abbruzze/kernal64)

## Reverse Engineering Tools

* [Radare2](https://github.com/radareorg/radare2) Unix-like reverse engineering framework and
  command-line toolset
* [Ghidra](https://github.com/NationalSecurityAgency/ghidra) by NSA (supports 6502 and dozens of
  more contemporary architectures)
* [Cutter](https://github.com/rizinorg/cutter) non-boomer UI
* [Binary Ninja](https://binary.ninja/) proprietary but has free cloud version that claims to
  support 6502 (I couldn't make it work) see my GH
  issue [#152](https://github.com/Vector35/binaryninja-cloud-public/issues/152)
* [IDA Pro](https://hex-rays.com/ida-pro/) classic, proprietary, native
