# TODO

## Next Actions

* [ ] many C64 binaries are not detected correctly - investigate
  * `80columns.prg` and `Gridrunner.prg` detected as C64 BASIC instead of MC with a BASIC stub
  * `gamepack.prg` is detected as C64 BASIC but rendered in the BASIC tab as a hex dump
* [ ] hovertools for exploration and interactive reversing:
  * [ ] symbol usage should show an inline popup preview of the definition
  * [ ] jump addresses should show an inline popup preview of the destination code
  * [ ] dynamically decorate
  * [ ] single instruction or selection
  * [ ] selection lollypop handles can be expanded using tools (drag extend up or down)
  * [ ] extra info
  * [ ] edit options
  * [ ] branch icon import AltRouteIcon from '@mui/icons-material/AltRoute';
* [ ] bulk back-end corpus
  * test-time analysis for tuning detectors
  * incorporate `file` output - it does a reasonable job for many files
  * slurp tree, content hashing, indexing, duplicate detection, cache-invalidation
  * train some kind of statistical thing, bayesian or full ml (baby steps grasshopper)
* [ ] fix mega slow ui rendering
  * [ ] learn devtools profiling
  * [ ] learn react devtools profiling (very confusing and crashy on current page)
* [ ] FlappyBird.prg 9080 bytes not detected as machine code with basic stub
* [ ] migrate from overgeneralised `Tag` abstraction (ongoing)
  * [x] introduce convenience methods on Tag at current call sites to reduce api noise (currently
    only using constants for magic keys in stringland)
* [ ] consult published reverse engineering work on retro binaries I have as relevant ground truth
  * [ ] https://github.com/mwenge/gridrunner
  * [ ] Matson Dawson's published version of Lee Davison's VIC-20
    [kernal disassembly](https://www.mdawson.net/vic20chrome/vic20/docs/kernel_disassembly.txt)
* [ ] make separate view components for hex, disassembly, basic
* [ ] top nav source index: jump to entry point and other important locations
* [ ] Distinguish between code and data mostly automatically
  * [x] Implement a code path Tracer for a generous subset of instructions that follows
    execution from detected entry point.
  * [x] Tracer can execute simplest instruction traces, recording executed instruction addresses
  * [x] Disassemble line in tracer to identify jumps
  * [x] Disassemble line in tracer to identify conditional branches
  * [ ] If a trace is available, all executed instructions should be disassembled consistently
    with the execution trace - maybe store all disassembled instructions as a result of the trace?
    looks like this is not working for all example cases.
  * [ ] Tracer loads kernal and basic ROMs into locations based on detected machine memory map
  * [ ] Tracer records path graph
  * [ ] Tracer records memory read and write sequence
  * [ ] Use read heuristics to detect evidence of data
  * [x] Detect and report currently unsupported instructions, e.g. indirect jump `JMP ($1337)`
  * [ ] report disassembly/trace errors to ui in some nice note
* [ ] view options - disassembly, basic, hex each should define their own config options
* [ ] better styling for BASIC decoder
* [ ] Render generated comments on the line before if the line is too long to prevent comment and
  code layout clash.
* [ ] plan memory model with: banking, shadowing, overlay, seperate read/write sets,
  read/write permissions, io mapping. Base required features on C128, BBC and Apple II
* [ ] dialect options - layout handles for indenting
* [ ] MOS 8502 C128 support github issue [https://github.com/christo/revenge/issues/2]
* [ ] BASIC data statements embedded machine code detection/designation
* [ ] Subroutines: map the inputs, outputs and register effects of subroutines
  * [ ] For kernel subroutines, wait until full kernel trace is done and add this in stages
  * [ ] full mapping is best done by hybrid static/dynamic analysis and reused for user
    routines using the same code path
* content recognition:
  * common data fragments identified between files
  * build database of file content recognition.
  * fragment content hash, db etc.?
  * binary diff two files (linear)
  * automate the similarity detection of files - need an indexing system, maybe use common
    sub-sequence - ask/research.
* [ ] petscii view (views abstraction)
  * UI: render text data in machine-original font, derived directly from the character ROM
* improve cart sniffers and basic stub machine code PRGs
  * look at the warm and cold jump vectors to see if they land in-range and at _probable code_

## Reading List

* [x] [Solving BIT Magic](https://rosenzweig.io/blog/solving-bit-magic.html) by Alyssa Rosenzweig
* [ ] [Statically Recompiling NES Games into Native Executables with LLVM and Go](https://andrewkelley.me/post/jamulator.html)
  by Andrew Kelley

## Long Term Ideas

* [ ] Broaden code detection to fuller emulation
  * [ ] check out MIT licensed typescript 6502 emulator
    core https://github.com/6502ts/6502.ts
  * [ ] check out full js/ts system emulators - need to be able to support multiple emulators
    at some point so ensure the multi-emulator context exists in the speculative binary detection
    and code detection code path
* check out [Ramda-Adjunct](https://char0n.github.io/ramda-adjunct/4.0.0/) possible addition to
  Ramda
* check out Haskell Difference List datastructure
* Add readonly memory region support (will help isolate selfmod potential and help with static
  analysis)
* functional data structure for byte interpretation
  * what is that fp datastructure for strings
  * make random access and modification to disassembled instruction list (lenses?)
  * need to be able to replace a sequence of instructions into a byte declaration
  * Make entire disassembly asynchronous (rather than n-pass)
* data section detection - probabilistic
  * human-designated
  * detected score
* use ts-md5 for md5 hash generation? unless there's an easy way to support SHA1 also?
  * what do online software databases prefer? Probably md5 or sha1
* handle file uploads in the background
  * only bother with files that have an unseen hash
* use c64ref submodule for petscii rendering
  * build-time petscii mapping
  * test coverage
  * charset
  * rewrite BASIC decoder using c64ref data
* manual choice of file type
* introduce user abstraction well before multiple user accounts or permissions
* database persistence
* interactive choice of data/code regions
* multiple disassembly dialect support
* type possibility list with probabilities etc.
* canonicalisation of code - equivalences (given jump guards and immutable memory blocks, and modulo
  halting prob,
  natch)
* user accounts
* file back-end
  * store file on back-end
  * recognise already loaded files with content hash
    * keep db details of uploads anyway
  * store file-level notes and byte-offset / byte-range notes
  * unified back-end between bootstrap filetree and uploaded stuff
* sharing, permissions
* enable multiple people to do analysis of files, to store, share and collaborate on the analysis of
  files
* Build and test with round-trip to targeted assembler syntax. Verify that the produced assembly
  listing will
  assemble in the target assembler and reproduce the same binary. Can't figure out if this is easy
  or hard.
* useful material icons:
  * ManageHistory (reverse engineering)
  * DragIndicator
  * ForkLeft
  * ForkRight
  * Link (jump address)
  * LocalOffer or Sell (hashtag)
  * Message (annotation for binary)
  * PlayArrow (entry point?)
  * Radar
  * Report
  * ReportProblem
  * RocketLaunch
  * Science
  * Star
  * Tag
  * Token (logo?)
