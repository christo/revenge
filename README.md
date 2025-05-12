# Revenge

Retrocomputing Reverse Engineering Environment

This is a web app for programmers to reverse engineer software written
for 1980s era home computers. It's a work in progress.

<!--suppress HtmlDeprecatedAttribute -->
<img alt="revenge logo" align="right" src="client/public/revenge-logo192.png">

![automated tests](https://github.com/christo/revenge/actions/workflows/workflow.yml/badge.svg)

The grand idea is a web-based reverse engineering environment for retro computers
with very small initial goals: binary file type detection and simple disassembly of
6502 machine code for the Vic-20 and C64. Z80 is a likely future supported architecture.

Beyond the small initial goals lies a vast land of unfulfilled wishes.

**Project Status**: _pre alpha_ (it sort of works with plenty left [TODO](TODO.md))

![revenge screenshot](docs/revenge-screenshot-20250407.png)

Currently the disassembler is fully automatic, although it identifies very few bytes
definitively as data. Binary content type (basic, machine code with basic stub, cart
image, etc.) is detected using heuristics and falls back to a hex dump if it can't
detect the filetype.

Work is in progress to train a classifier (you can call it AI) to recognise
binaries based on statistics collected by various implementations of `FeatureExtractor`.
The model can be trained in `server` with `bun train`. Note that a corpus of binary
files must exist in the `server/data/training/c64` and `server/data/training/vic20`
trees. Based on my current testing, the results are still very poor but I am confident
this method will work once the implementation is good enough. Recognising compressed
files and other container formats like disk images is not yet tested.

## Architecture

Implemented in [TypeScript](https://www.typescriptlang.org/), using [Bun](https://bun.sh/),
[Vite](https://vite.dev/), [MUI](https://mui.com/), [React](https://react.dev/) and
[Mocha](https://mochajs.org/)/[Chai](https://www.chaijs.com/) for testing.

## Quick Start

After checking out this repo, from a shell in the root directory, run the sanity script
to check you have the relevant/recommended tools installed:

```shell
./sanity.sh
```

The main system is a single page web app with an optional server comonent which provides
access to retro binaries stored on the local filesystem a few are included in this
repo. Without the server, you can drag and drop files from your computer into the browser or click
the upload button. The plan for the server is to manage the state of interactive sessions
and provide access to a filetree of binaries for bulk analysis.

Run the server in its own shell from the `server` dir:

```shell
cd server
bun dev
```

Run the client in its own shell from the `client` dir:

```shell
cd client
bun dev
```

The URL to point your browser to is shown in the client console.

## System Design

Build and execution environment is `vite` for the client and `bun` for both client and server.
Node should also work with `npm` or `pnpm`. I'm not sure how to structure the project to be
transparently agnostic about this but if you have opinions and skills, get in touch and I will
accommodate any sane suggestions. To use `npm` or `pnpm`, check the `client/package.json` and
`server/package.json` files to see what scripts are defined.

## Features

* drag and drop file loading
* load file contents into summary view
* hex view (minimal)
* dumb disassembly - exemplary detection of code vs data is a project goal
* file type recognition
  * can recognise at least two types and offer to disassemble if it knows how
  * vic20 raw cartridge image recognition
  * BASIC programs
  * Machine code programs with a [Basic Stub](docs/basic-headers.md).
* representation of a syntax-independent assembler pseudo-op and Dialect can implement
  syntax-specifics
* assembly syntax highlighting
* Trace code paths to build call graph for detecting code vs data.
* Track static addresses written to and read from during trace execution (in progress)
* Decode BASIC programs on VIC-20 and C64
* Test suite
* High quality reference data from the [c64ref](https://github.com/mist64/c64ref) project, initiated
  by [Michael Steil](https://pagetable.com/) of
  [The Ultimate C64 Talk](https://youtu.be/ZsRRCnque2E) fame.
* Stats/summary of file interpretation action taken
  * execution time for disassembly
  * trace time
  * symbol detection count (disassembly)
* System kernal subroutine symbol recognition (VIC-20, C64)
* Visual plot of bi-gram frequency analysis of overlapping byte pairs in a binary. These
  are pretty good at visually distinguishing encrypted or compressed binaries. Machine code looks
  pretty different to BASIC.

## System Support Status

The design aims to reduce the effort of supporting multiple different systems, however at this
stage only VIC-20 and C64 carts, prg files and BASIC files have been tested and there is no
comprehensive test suite yet. Also, I'm not sure how feasible it would be to support some systems.
Within the communities of each system, different assembler tool chains are more prevalent.

In general, project scope includes support for 6502-based and Z80-based 80s Microcomputers and a
generous subset of the more common assembler syntax dialects. Other 80s 8-bit CPUs are possible
but their inclusion would probably be driven by personal interest and the availability of large
software libraries. The following table shows estimations, not promises.

| Machines                     | Status      | CPU Family |
|------------------------------|-------------|------------|
| VIC-20                       | In Progress | 6502       |
| C64                          | In Progress | 6502       |
| Apple II                     | Planned     | 6502       |
| BBC B                        | Planned     | 6502       |
| C128                         | Planned     | 6502       |
| NES                          | Probable    | 6502       |
| Oric                         | Probable    | 6502       | 
| Atari 8-bit                  | Probable    | 6502       | 
| SNES                         | Probable    | 6502       |
| ZX Spectrum & clones         | Planned     | Z80        |
| TRS-80 I-III                 | Probable    | Z80        |
| Microbee                     | Probable    | Z80        |
| CHIP-80                      | Probable    | virtual    |
| VZ-200 / VZ-300 / Laser      | Probable    | Z80        |
| Gameboy, Gameboy Color       | Probable    | Z80 -ish   |
| Gameboy Advance              | Possible    | ARM        |
| Vectrex, TRS-80 Coco, Dragon | Possible    | 6809       |

## File Formats

Info on [binary file formats](docs/file-formats.md) is documented to guide the design of content
detection and disassembly.

## Assembly Dialects

See document about plans and ideas to support various
[assembler dialects](docs/assembler-dialects.md). Supporting a new dialect is a matter of
implementing the **Dialect** interface, possibly subclassing **BaseDialect**.

Currently only one arbitrary custom dialect is implemented while the API is being stabilised.

## Code Detection

It's not hard to make good guesses about what parts of a binary are code or data but it is harder to
do reliably and automatically. Therefore, most reverse engineering tools are interactive; the user
must get involved to interpret and understand the binary and to dictate what is code, text data,
image data, audio etc. and this is even trickier when code is self-modifying, compressed, encrypted,
obfuscated or when bytes are treated as both code and data.

Using a hybrid approach to code detection, some parts of a binary can be confidently identified as
code through a mixture of static and dynamic analysis. A `Tracer` is implemented which follows code
execution paths, including both sides of conditional branches and records which addresses hold
instructions. In many cases this approach can determine parts which are almost certainly code and
also to identify regions of almost certain data.

Work on this is ongoing.

Solving this problem deterministically for all possible programs is equivalent to solving
[The Halting Problem](https://en.wikipedia.org/wiki/Halting_problem) which has been famously proved
to be impossible. Solving it deterministically for certain programs, constrained to a useful subset
of possible instructions is at an early stage of implementation and further work to extend this with
partial evaluation and probabilistic execution could be very useful for accelerating reverse
engineering on small retro systems.

Using a combination of preemptive emulation, detailed machine architecture definitions and static
analytic techniques like program transformation, escape analysis, peephole optimisation and dynamic
techniques like speculative partial execution, combined with a large cross-referenced database built
from a corpus of known software, I hope to give insight to a human reverse engineer about any
software written for these enigmatic retro systems.

Read more notes about [Dynamic Analysis](docs/dynamic-analysis.md).

Read more about how machine learning techniques are being developed to build a
[Classifier](docs/classifier_improvements.md) that may be able to identify salient features
of binaries. This is a work in progress.

## Useful Resources Documented Here

* [Reverse Engineering](docs/reverse-engineering.md) references
* [Retro Assembler Dalects](docs/assembler-dialects.md)
* [Emulators](docs/emulators.md)
* Relevant [file formats](docs/file-formats.md) for retro computing
* [Dynamic Analysis](docs/dynamic-analysis.md) - some thoughts on prospects for runtime techniques for
  automating the detection of code and data and topics like program comprehension and program transformation.
* How [Basic Stubs](docs/basic-headers.md) work on 8-bit Commodore machines.
* [Ideas for the future](docs/ideas.md) of Revenge covering not only reverse engineering but
reengineering and source renovation.