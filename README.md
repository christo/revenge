# Revenge

Reverse Engineering Environment

The idea of this project is a web-based reverse engineering environment with very small initial goals.

Starting with simple disassembly of the 6502 for the Vic-20 an C64.

Implemented in TypeScript as a first project for learning the language.

6502 info from https://www.masswerk.at/6502/6502_instruction_set.html

## Design Notes

Machine language basic loaders often use base 10 data sequences of bytes. This is a
low compression format. Higher radix formats can be used as strings, rem comments or
some other transport format and the encoding of the instruction data can be a custom,
variable-length compression format. 

Peep-hole optimiser

Patchy comprehensions - in a given disassembly, is the byte literal treated as a 
zero-page address? If so, or if it is a 16-bit address for, say, a load or store,
is there some kernal symbol for that address or is it a JSR destination?

Run small trial executions in the background to score various areas as code or data.
Detect code sequences that modify code (self-modifying code is harder to understand, 
although if the only change during simulation is to a memory address that is read from,
and not thereafter jumped to or used as an index for a branch, signs point to likely
separation between code and data).

Try to make this multipronged analysis somewhat automatic so the user can just 
confirm simple hunches or heuristic interpretations.

### Canonicalisation

The canonical form of a piece of interpreted data enables divergent yet semantically equivalent
forms to be recognised. In the case of character data, the canonical form might make the reverse 
form equivalent. In the case of code, the canonical form will have equivalences that, for example
use the y register instead of the x register, all else being equal. Canonical forms for code may
execute in a different number of cycles or use a different number of bytes or have instructions
in a different order (some design is required to analyse alternate orderings with preservation
of semantics). Canonicalisation is a form of program transformation where the goal is to identify 
use-case-specific essence. 

## TODO

* dumb disassembly
* reading list
  * https://blog.logrocket.com/promise-chaining-is-dead-long-live-async-await-445897870abc/
  * https://jrsinclair.com/articles/2020/whats-more-fantastic-than-fantasy-land-static-land/
  * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
* file type recognition
    * list of recognised types
    * list of supported types
    * manual choice of file type
    * type possibility list with probabilities etc.
    * build database of file content recognition.
* fragment content hash, db etc.?
* common data fragments identified between files
* canonicalisation of code - equivalences (given jump guards and immutable memory blocks, and modulo halting prob,
natch)
* file back-end
    * store file on back-end
    * recognise already loaded files with content hash
      * keep db details of uploads anyway
    * store file-level notes and byte-offset / byte-range notes
    * unified back-end between bootstrap filetree and uploaded stuff
* petscii view (views abstraction)
* data section detection
* vic 20 / c64 hardware register detection
* binary diff two files (linear)
* user accounts
* sharing, permissions
* enable multiple people to do analysis of files, to store, share and collaborate on the 
analysis of files
* search GitHub and elsewhere for existing databases of software. Maybe model database sources? Try for md5 or sha
content hashes for file identification. archive.org software entries have multiple stored in xml files, e.g.
 see https://archive.org/download/BoloMacintosh which is part of https://archive.org/details/softwarelibrary_mac
* representation of a syntax-independent assembler pseudo-op and Dialect can implement syntax-specifics 

## Done

* drag and drop file loading
* load file contents into summary view
* hex view (minimal)