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
  hand-coded rather than generated.

## Others:

* [64tass](https://tass64.sourceforge.net/)
* [Acme](https://sourceforge.net/projects/acme-crossass/)
* [DASM](https://dasm-assembler.github.io/)
* [Easy6502](http://skilldrick.github.io/easy6502/) [GitHub](https://github.com/skilldrick/easy6502)
* [xa65](http://www.floodgap.com/retrotech/xa/)
* [ca65](https://cc65.github.io/doc/ca65.html) (part of [cc65](https://www.cc65.org/))

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
