# TODO

## Next Actions

* [ ] many C64 binaries are not detected correctly. investigate
  * [ ] add test case
  * `80columns.prg` and `Gridrunner.prg` detected as C64 BASIC instead of MC with a BASIC stub
  * `gamepack.prg` is detected as C64 BASIC but rendered in the BASIC tab as a hex dump
* [ ] Myriad basic stub does not show symbol definitions (some others too?)
* [ ] FlappyBird.prg 9080 bytes not detected as machine code with basic stub
* [ ] more feature vector extractor implementations
  * [ ] precise length feature extractor
    * empirically determine n most common fixed sizes in corpus
    * create specific instances of fixed size feature extractor - binary outcome
  * [ ] index value feature extractor - rom images can start with a load address
    * feature is an index, value and length (maybe just 1 or 2?)
  * [ ] convert bigram to feature extractor
    * [ ] 256^2 may be too many features so consider:
      * How to decide how many features are too many?
      * Only include the top N most frequent bigrams
      * Use dimensionality reduction techniques (PCA, t-SNE)
      * Apply feature selection to identify the most discriminative bigrams
* [ ] write CBM BASIC tokeniser and detokeniser (maybe later generalise to other BASICs)
  * enable defining explicit basic stub in assembly
  * help future rendering of BASIC syntax
* [ ] treat zip files in corpus as directories by doing transparent contents unzipping
  * try [adm-zip](https://www.npmjs.com/package/adm-zip) - it supports decompressing to buffer
  * many emulators expect to support single file zipped versions of the true binary (spectrum
    binaries seems to be distributed as a single `rom` file inside a zip file)
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
  * [ ] Find usable game database info to identify binaries from checksums or content
    hashes. MAME seems to have one such database 
    for [VIC-20](https://github.com/riley110/mame/blob/7187bc958d2b7e069fee7d57f599bb04a171678e/hash/vic20_cass_tosec.xml) 
    among many others (licensed CC0) organised by system under the `hash/` directory that includes
    CRC32 and SHA1 for the few files I checked.
  * Gamebase 64 also seems to have a big database and there is evidence of many github projects that
    make use of the database. 
  * Design some kind of system with a multi-authority claim of fact. The idea is that a given
    authority claims that a binary of a given size, with a given hash etc. has a given name and runs
    on a given system etc. The content of the claim will not be homogenous however each claimable
    field should be consistently defined.
  * End users and known published sources can be authorities. When a binary matches a claim by
    low-collision hash (even MD5 would probably never collide) the database entry can be surfaced in
    the user interface like this: "MAME v12345 claims this binary is XXX" and some citation would be
    ideal at that point. The user can take it or leave it.
  * Such claims might be accepted as a hint or fact with which to guide a reverse engineering
    session.
  * Could be used for machine learning tuning of a classifier
* [ ] distinguishing data and code:
  * [ ] designation of interpretation of a line should have a confidence score
  * [ ] executed lines should be detected as code with high confidence score
  * [ ] line interpretation can be multiple in theory
  * [ ] in-binary locations that were statically read from or written to and not executed would
    have a reasonably high confidence detection as data
  * [ ] identity as data can go deeper to data types: bytes, words, strings, graphics, sound etc.
  * [ ] the session should store any choices or overrides by the user:
    * interpreting binary bytes
    * naming symbols
    * configuring disassembly options
    * adding annotations
    * identifying the target machine configuration (impacts memory layout, instruction set etc.)
* [ ] Support zipped files
  * automatically unzip
  * if contains multiple, show contents for selection of single item to load
  * if simgle file contents, just load it with its own filename
* [ ] support tape and disk image formats
  * if multiple contents show list for selection and loading
  * if single item just load it
* [ ] Add to sniffer for CBM files the "smart attach" filename tag system that VICE and TheC64 understands e.g.:
  * (PAL), (NTSC) - TV system
  * (Cart) - Cartridge type
  * (8) - Drive number
  * (BASIC) - ROM requirement
  * Machine model indicators like (C64), (C128), etc.
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
    looks like this is not working for all example cases. NEED TEST CASE
  * [ ] Tracer loads kernal and basic ROMs into locations based on detected machine memory map
  * [ ] Tracer records path graph
    * [ ] implement thread stack for path-accurate `JSR`/`RTS` pairs, also then detect unpaired  
  * [x] Detect and report currently unsupported instructions, e.g. indirect jump `JMP ($1337)`
  * [ ] report disassembly/trace errors to ui in some nice note
* [ ] view options - disassembly, basic, hex each should define their own config options
* [ ] better styling for BASIC decoder
* [ ] Render generated comments on the line before if the line is too long to prevent comment and
  code layout clash.
* [ ] MOS 8502 C128 support github issue [https://github.com/christo/revenge/issues/2]
* [ ] BASIC data statements embedded machine code detection/designation
* [ ] Subroutines: map the inputs, outputs and register effects of subroutines
  * [ ] For kernel subroutines, wait until full kernel trace is done and add this in stages
  * [ ] full mapping is best done by hybrid static/dynamic analysis and reused for user
    routines using the same code path
* [ ] petscii view (views abstraction)
  * UI: render text data in machine-original font, derived directly from the character ROM
* [ ] find a suitable minimal system like CHIP-8 to add as a second machine architecture family

## Reading List

* [x] [Solving BIT Magic](https://rosenzweig.io/blog/solving-bit-magic.html) by Alyssa Rosenzweig
* [ ] [Statically Recompiling NES Games into Native Executables with LLVM and Go](https://andrewkelley.me/post/jamulator.html)
  by Andrew Kelley

## Long Term Ideas

* [ ] plan memory model with: banking, shadowing, overlay, seperate read/write sets,
  read/write permissions, io mapping. Base required features on C128, BBC and Apple II
* [ ] dialect translation: source -> source
* [ ] execution harness for automatically running generated source:
  * multiple assemblers installed on the server
  * check exit status
  * capture output (possibly matching important output info)
  * analyse files produced
  * determine test/failure on multiple points
  * what kind of round-trip makes sense here? 
    * existing-source -> binary -> gen-source -> binary
    * binary -> gen-source -> binary
* content recognition:
  * common data fragments identified between files
  * build database of file content recognition.
  * fragment content hash, db etc.?
  * binary diff two files (linear)
  * automate the similarity detection of files - need an indexing system, maybe use common
    sub-sequence - ask/research.
* [ ] mechanism for testing or reengineering:
  * take a source project (with or without built binaries)
  * build the binary from it
  * reverse the binary to produce source
  * compare the source to the real source for ideas on interpretation
  * identify platform and tool-specific idioms
* interpret source code examples to produce a theory of the dialect
  * recognise dialect by syntax / platform etc.
  * use an LLM to help categorise the dialect or build a dialect with revenge api
  * build test suite for this
* [ ] Broaden code detection to fuller emulation
  * [ ] check out MIT licensed typescript 6502 emulator
    core https://github.com/6502ts/6502.ts
  * [ ] check out full js/ts system emulators - need to be able to support multiple emulators
    at some point so ensure the multi-emulator context exists in the speculative binary detection
    and code detection code path
* check out [Ramda-Adjunct](https://char0n.github.io/ramda-adjunct/4.0.0/) possible addition to Ramda
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
