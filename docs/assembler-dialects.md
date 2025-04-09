# Assembly Dialects and Revenge

Dialects should define equivalent alternative generation options for particular parts and the user
can choose which suits the given part. Also, guesses should be smart.

A command line required to assemble the file in a given assembler should be provided in a comment at
the top of the generated output (this implies the filename must also be specified). CPU designation
and, system symbol imports etc. can only be specified on the command line or by environment
variables on some assemblers as opposed to having assembler directives for them. While trying not to
get into OS-specifics, command-lines are necessarily going to be OS-specific.

Within a dialect, different options may be selectable in a config form, so preferred output
styling can be tweaked.

The disassembly of the C64 Kernal and friends

Assembler dialects being considered:

## Vasm "Oldstyle"

[Oldstyle](http://sun.hasenbraten.de/vasm/release/vasm_6.html) is one of the supported dialects in
vasm, Ben Eater's choice.

* Top of docs: http://sun.hasenbraten.de/vasm/release/vasm.html
* Very simple syntax, like ancient 6502 source code
* strict-columnar syntax compared to its _Standard Syntax_
* Within this style, various syntax options are available, as per
  [the documentation](http://sun.hasenbraten.de/vasm/release/vasm_6.html)
  which permit some deviations from the default oldstyle syntax. Of the
  options that affect correct parsing, most vary the syntax towards
  common assembly syntax found in the most popular assemblers such as Kick.

Some noteworthy features of Vasm "oldstyle":

* Supports Z80 but there are a few constraints on certain directives
* Many directives have several variants and aliases
* labels must begin in the first column and the trailing `:` is optional,
  however in Vasm's `Standard` syntax, labels do not have to start on the first
  column but **must** have a trailing `:`, therefore conform to both by
  generating labels at column 0 and always adding the `:`
* Anonymous labels, which can be more legible for local refs
* Section protection - most useful for read-only for carts and roms
* operands must be separated from the mnemonic by whitespace
* line comment prefix is `;`
* hex literals are denoted by a `$` prefix
* PC assignment on 6502 can be done as `* = $12af` (Z80 uses `$`), matching
  general symbol assignment (also `org` form)
* `.addr $1234` is a 16 bit data declaration that respects target endianness
* `.blk $01,$ff` fills 256 bytes with the value $01
* String and word literals
* Binary includes (useful for designated or detected binary blocks like `.sid`
  chunks) or common graphics formats.
* Macro definition and invocation
* `repeat expr` and `endrepeat` will repeat a given block of code `expr` times

## Kick Assembler

[Kick Assembler](http://theweb.dk/KickAssembler/Main.html) by Mads Nielsen is free, although closed
source, it
is free to use and it one of the most popular assemblers in the C64 community mostly for its rich
scripting-language-like assembler directives and macros.

* closed source
* very complex, inconsistent and non-orthogonal syntax variations. The author claims parsers must be
  hand-coded rather than generated

## Most Popular Assemblers on NES

From [NesDev Forums Answer by Tokumaru](https://forums.nesdev.org/viewtopic.php?p=243479#p243479)

> NESASM: common among beginners, due to it having been used in a popular tutorial series (Nerdy Nights). It's a very straightforward assembler, takes assembly code as input and outputs a binary ROM file. Uses non-standard syntax for some things, and has a few weird bugs/quirks that sometimes creates problems that are hard to debug.
>
> ASM6: Just as straightforward as NESASM, also taking assembly code and spitting out a binary file. Has very few built-in functionalities, only covering the basics. Being a multi-pass assembler means it offers a lot of versatility when it comes to organizing banks and variables. Also has it's share of little bugs/quirks, but these are normally less problematic than the ones in NESASM.
>
> ca65: The most "professional" one. After the assembly step, it needs to link the intermediary code in order to generate the final binary, which requires a memory configuration file, which is normally what you use to define the ROM/RAM layout. Has a very extensive set of built-in directives and an advanced macro system that combined allow the implementation of all sorts of custom functionalities. Some versatility is lost sure to the fact it's a single pass assembler.

NESASM3 is used in NES tutorial [Nerdy Nights](https://taywee.github.io/NerdyNights/nerdynights.html) 

## Others:

* [ca65](https://cc65.github.io/doc/ca65.html) (part of [cc65](https://www.cc65.org/)) used in tutorial series for NES/Famicon called [Famicon Party](https://github.com/kzurawel/famicomparty-book) and a [translation of Nerdy Nights for ca65](https://github.com/JamesSheppardd/Nerdy-Nights-ca65-Translation)
* [64tass](https://tass64.sourceforge.net/)
* [xa65](http://www.floodgap.com/retrotech/xa/)
* [DASM](https://dasm-assembler.github.io/) Popular with Atari 2600 Community
* [Acme](https://sourceforge.net/projects/acme-crossass/)
* [Easy6502](http://skilldrick.github.io/easy6502/) [GitHub](https://github.com/skilldrick/easy6502)
* [GAS](https://wiki.osdev.org/GAS) (Gnu Assembler) - works with [llvm-mos](https://llvm-mos.org/wiki/Welcome) and The Compiler Explorer (aka [goldbolt.org](https://godbolt.org/)); see this [small c64 example](https://godbolt.org/z/WGa169Kve)

### Common Dialect Variations

Assemblers may accept a lot of syntax beyond the minimum required for generating disassembly, for
example, macros and includes. Ultimately it would be great to be able to synthesise macros from
binaries, but at first, only the minimum necessary syntax may be supported.

* line comment prefix character
* legal label rules, e.g.:
  * no mnemonic prefix allowed
  * must start on column 0 and mnemonics must be indented
  * must end in a colon (or not)
* program counter assignment:
  * `ORG $8000` or
  * `* = $8000`
* hex/bin/oct/dec/ascii/petscii literals syntax/support
* data declaration
  * individual bytes
  * word support etc.
  * block fill
