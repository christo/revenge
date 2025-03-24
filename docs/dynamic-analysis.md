# Notes on Using Dynamic Analysis for Automated Reverse Engineering

Purpose: A semi-automated reverse engineering system for retro 6502/Z80 home computer binaries
combining emulation, static analysis, and program transformation techniques.

Implemented in TypeScript primarily running in a browser.

## Architecture Overview

### Client

* UI: Code viewer, annotated disassembly, Control Flow Graphs (CFG), memory maps.
* CPU emulator (WASM or native TS): Executes binaries speculatively.
* Static analysis: Implemented in TS/WebAssembly (performance-heavy parts).
* File I/O: Binary loading/parsing, ROM mapping, heuristics.

### Server

* Heavy analysis fallback: Large-scale speculative execution, project storage, cross-reference database.
* Consider LLM integration for pattern recognition (identifying subroutine semantics).

## Analysis Pipeline

May need to go back or restart pipeline due to late disambiguation of content identity.

### Binary Preprocessing

* Detect file format (cart image, PRG, TAP, snapshot) scored based on filename and contents.
* Extract metadata: load address, entry points, derived from file format.
* Preload known ROMs (e.g., C64 KERNAL, BASIC) to match against calls, after machine identification
  In some cases, machine configurations that affect this determination may not be evident until a
  later stage.

### Static Disassembly Core

Goals: Identify code/data segments, resolve labels, build CFGs.

Techniques:
* Recursive Traversal Disassembly:
  * Start at known entry points.
  * Follow direct branches and calls.
  * Terminate on return instructions or indirect jumps.
* Heuristic Linear Sweep:
  * Fill gaps between known code regions.
  * Detect byte patterns of common instruction sequences.
* Pattern Recognition:
  * Match against a database of known subroutines (e.g., screen print, keyboard scan).
  * Use CRC or fuzzy hashes on instruction sequences.

### Speculative Emulation

Goals: Identify dynamic code paths, indirect branches, code/data separation.

* Emulate execution starting from entry points:
  * Track executed instruction addresses → mark as code.
    * Memory access patterns → distinguish data regions.
    * Detect self-modifying code.
    * Simulate ROM APIs: Provide expected behavior for known OS calls (e.g., JSR $FFD2 on 6502 for CHROUT on C64).

### Data Region Identification

* Use memory access logs from emulation.
* Detect common data types:
  * String heuristics: printable/typical sequences.
  * Table detection: repeated structs, jump tables (esp. for switch-like logic).
  * Annotate with inferred types.

### Control Flow and Call Graph Construction

* Build CFGs from disassembly + emulator trace.
* Identify loops, conditionals, tail calls.
* Resolve indirect jumps using runtime state tracking (e.g. indirect jump with modified address).

### Program Transformation & Annotation

* Generate intermediate annotated IR: label names, code/data tags, comments.
* Support automatic re-labeling and inlining of trivial code blocks - macro synthesis.
* Allow interactive user feedback to:
  * Label functions.
  * Confirm code/data segments.
  * Define symbols.
  * Store all user edicts in editable form to enable speculative exploration

## UI Features

* Interactive Disassembly Browser:
  * Click-to-jump to labels, calls.
  * Hover info from speculative execution (register/memory states).
* Live CFG View:
  * Show flow from selected entry point.
  * Toggle between static + emulated flow.
* Memory Map View: Highlight code, data, I/O regions.
* ROM Call Auto-Comments: Show inline comments for known system routines.

## Optimization Techniques

* Consider [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
  for caching emulator traces and disassembly.
* WASM backends for emulators and analysis (Z80 and 6502 emulators already exist in Rust/C — can compile to WASM).

## Symbolic Execution

* For indirect jumps/calls, run symbolic execution with limited depth.
* E.g., Z80 dispatch tables using JP (HL) or CALL (IX+offset).

## Tooling

* 6502/Z80 CPU cores: Use existing cores (e.g., Fake6502, Z80.js) as baseline.
* Disassembler Libraries consider [Capstone](https://www.capstone-engine.org/) disassembler
  library compiled to WASM
* Disassembly project structure: symbol tables, segment annotations, user notes.
