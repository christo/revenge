# Revenge

Reverse Engineering Environment

The idea of this project is a web-based reverse engineering environment with very small initial goals.

Starting with simple disassembly of the 6502 for the Vic-20 an C64.

Implemented in TypeScript as a first project for learning the language.


## TODO

* drag and drop file loading
* file type recognition
    * list of recognised types
    * list of supported types
    * manual choice of file type
* load file contents into summary view
* file back-end
    * store file on back-end
    * recognise already loaded files with content hash
    * store file-level notes and byte-offset / byte-range notes 
* hex view
* petscii view
* dumb disassembly
* data section detection
* vic 20 / c64 hardware register detection
* binary diff two files (linear)
