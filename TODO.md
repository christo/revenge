# TODO

## Next Actions

* [x] tidy up revenge.ts a bit
* [ ] show definitions for used kernal symbols
  * [ ] collect used symbols from trace before rendering disassembly 
  * [x] render source lines that have no address prefix - such as symbol definitions
  * [ ] implement jumping to definition
* [ ] fix mega slow ui rendering
* [ ] vic 20 / c64 hardware register detection
* [ ] FlappyBird.prg 9080 bytes not detected as machine code with basic stub
* [ ] migrate from overgeneralised `Tag` abstraction (ongoing)
* [ ] make separate view components for hex, disassembly, basic
* [ ] top nav source index: jump to entry point and other important locations
* [ ] support importing with `.ts` extension in test source dir
* [x] show symbols instead of address values for JSR to kernal symbols (direct mode only)
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
* [ ] view options - disassembly, basic, hex each should define their own config options
* [ ] better styling for BASIC decoder
* [ ] Render generated comments on the line before if the line is too long to prevent comment and
  code layout clash.
* [ ] plan memory model with: banking, shadowing, overlay, seperate read/write sets,
  read/write permissions, io mapping. Base required features on C128, BBC and Apple II
* [ ] dialect options - layout handles for indenting
* [ ] MOS 8502 C128 support github issue [https://github.com/christo/revenge/issues/2]
* [ ] check out MIT licensed typescript 6502 emulator core https://github.com/6502ts/6502.ts


## Long Term Ideas

* check out [Ramda-Adjunct](https://char0n.github.io/ramda-adjunct/4.0.0/) possible addition to
  Ramda
* check out Haskell Difference List datastructure
* Add readonly memory region support (will help isolate selfmod potential and help with static analysis)
* Kernel subroutines: map the inputs, outputs and register effects of subroutines
* hovertools:
  * dynamically decorate
  * single instruction or selection
  * selection lollypop handles can be expanded using tools (drag extend up or down)
  * extra info
  * edit options
  * branch icon import AltRouteIcon from '@mui/icons-material/AltRoute';
* functional data structure for byte interpretation
  * what is that fp datastructure for strings
  * make random access and modification to disassembled instruction list (lenses?)
  * need to be able to replace a sequence of instructions into a byte declaration
  * Make entire disassembly asynchronous (rather than n-pass)
* improve cart sniffers
  * look at the warm and cold jump vectors to see if they land in-range and at _probable code_
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
* BASIC data statement embedded machine code detection/designation
* bulk back-end corpus
  * slurp tree, content hashing, indexing, duplicate detection, cache-invalidation
* multiple disassembly dialect support
* Test suite coverage measurement / build script
* type possibility list with probabilities etc.
* canonicalisation of code - equivalences (given jump guards and immutable memory blocks, and modulo halting prob,
  natch)
* user accounts
* file back-end
  * store file on back-end
  * recognise already loaded files with content hash
    * keep db details of uploads anyway
  * store file-level notes and byte-offset / byte-range notes
  * unified back-end between bootstrap filetree and uploaded stuff
* petscii view (views abstraction)
  * UI: render text data in machine-original font, derived directly from the character ROM
* content recognition:
  * common data fragments identified between files
  * build database of file content recognition.
  * fragment content hash, db etc.?
  * binary diff two files (linear)
  * automate the similarity detection of files - need an indexing system, maybe use common sub-sequence - ask/research.
* sharing, permissions
* enable multiple people to do analysis of files, to store, share and collaborate on the analysis of files
* Build and test with round-trip to targeted assembler syntax. Verify that the produced assembly listing will
  assemble in the target assembler and reproduce the same binary. Can't figure out if this is easy or hard.
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
