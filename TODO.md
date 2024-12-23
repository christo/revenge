# TODO

* [x] migrate project to bun
* [x] migrate tests to mocha/chai
* [ ] implement Tracer and tests
  * [x] Tracer can execute simplest instruction traces, recording executed indices
  * [x] Disassemble line in tracer to identify jumps
  * [ ] Disassemble line in tracer to identify conditional branches 
  * [ ] Tracer needs memory recorder (read, write, execute)
  * [ ] plan memory model with: banking, shadowing, overlay, seperate read/write sets, read/write permissions, io mapping
* [ ] migrate to NodeNext in client to standardise on `.ts` extension in imports (vite config)

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
* check out Ramda-Adjunct possible addition to Ramda https://char0n.github.io/ramda-adjunct/4.0.0/
* check out Haskell Difference List datastructure
* vic 20 / c64 hardware register detection
* Add readonly memory region support (will help isolate selfmod potential and help with static analysis)
* Render comments on the line before if the line is too long to prevent comment and code clash. Also format long byte
  declarations on multiple physical lines.
* Kernel subroutines: map the inputs, outputs and register effects of subroutines
* render source lines that have no address prefix - such as symbol definitions
* view options - disassembly, basic, hex each should define their own config options
  * dialect options - layout handles for indenting
* Handle trailing machine code in hybrid BASIC/machine code (e.g. Myriad)
  * Sniffer / hybrid disassembler/basic decoder
* better styling for BASIC decoder
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
