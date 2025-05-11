## Ideas for the Future

Patchy comprehensions - in a given disassembly, is the byte literal treated as a zero-page address?
If so, or if it is a 16-bit address for, say, a load or store, is there some reused purpose for that
address that makes it deserving of a symbol name or is it a JSR destination making it deserving
of a subroutine label?

### Pattern Recogniser and Macro Synthesiser

* The long conditional branch, [64tass supports it](https://tass64.sourceforge.net/#branch-long)
* Register stack save, restore
* Infinite unconditional loop
* Block of zeroes
* Block of pattern repeat

### Canonicalisation

There are different ways to represent data and code which are equivalent. A canonical form functions
as a single representation into which any variation can be transformed for the purpose of deciding
equivalence and should help in identifying behaviour, optimisation, deobfuscation and porting.

The canonical form of a piece of interpreted data enables divergent yet semantically equivalent
forms to be recognised. In the case of character data, the canonical form might make the reverse
form equivalent. In the case of code, the canonical form will have equivalences that, for example
use the y register instead of the x register, all else being equal. Canonical forms for code may
execute in a different number of cycles or use a different number of bytes or have instructions in a
different order (some design is required to analyse alternate orderings with preservation of
semantics).

## Interactive Disassembly

While as much _automated_ detection as possible is ideal, it can't be perfect and all designation
options should be selectable by the user.

* Mark self-modifying code
* Mark block or line
* Macro extraction
* Expression synthesis
* Symbol definition
* Comments, labels, alternate literal forms including escape characters
