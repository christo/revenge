# Revenge

Reverse Engineering Environment

The idea of this project is a web-based reverse engineering environment with very small initial goals.

Starting with simple disassembly of the 6502 for the Vic-20 an C64.

Implemented in TypeScript as a first project for learning the language.


## TODO

* reading list
  * https://blog.logrocket.com/promise-chaining-is-dead-long-live-async-await-445897870abc/
  * https://jrsinclair.com/articles/2020/whats-more-fantastic-than-fantasy-land-static-land/
  * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
* file type recognition
    * list of recognised types
    * list of supported types
    * manual choice of file type
* file back-end
    * store file on back-end
    * recognise already loaded files with content hash
      * keep db details of uploads anyway
    * store file-level notes and byte-offset / byte-range notes
    * unified back-end between bootstrap filetree and uploaded stuff
* petscii view
* dumb disassembly
* data section detection
* vic 20 / c64 hardware register detection
* binary diff two files (linear)
* user accounts
* sharing, permissions

## Done

* drag and drop file loading
* load file contents into summary view
* hex view (minimal)