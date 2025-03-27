# Reverse Engineering Basic Stubs

When reverse engineering machine code programs, data can have complex embedded meaning. Not only embedded data representing graphics, sound and text, but also BASIC code.

On C64 and VIC-20, machine code programs are often saved to disk or tape with a short BASIC program at the beginning, such that when loaded into RAM where BASIC programs live, the machine code simply follows the bytes of the BASIC program. The BASIC program typically contains a single line like `2020 SYS 4110` which, when run, executes machine code at address `4110`. One modern convention is to use a BASIC line number signifying the year of publication.

Machine code binaries must ensure that the specified address in the BASIC program matches the intended entry point for the main machine code program. Assembly source to achieve this often simply specifies the BASIC program defined as a sequence of cryptic bytes. 

Each line of basic is defined first with a two byte word representing the address of the next line of BASIC or to the address of the two zero bytes that mark the end of a BASIC program. Line numbers are two byte words and BASIC keywords are represented by a single byte token, distinct from normal character bytes because the former always have their high bit set. Such tokenisation is typical in Microsoft BASIC and in Commodore's case, the tokens are enumerated in the venerable _Programmer's Reference Guide_. 

Lawrence Woodman on [techtinkering.com](https://techtinkering.com/articles/basic-line-storage-on-the-vic-20/) demonstrates a nice annotated technique below. Also check out his [TechTinkering YouTube Video](https://www.youtube.com/watch?v=Bh380PVz-LY) about this:

```
TOK_SYS   = $9E               ; SYS token

            .byt  $01, $10    ; Load address ($1001)

            * = $1001
            .word basicEnd    ; Next Line link, here end of Basic program
            .word 2020        ; The line number for the SYS statement
            .byt  TOK_SYS     ; SYS token
            .asc  " "
            .asc  "4110"      ; Start of machine language
            .byt  0           ; End of Basic line
basicEnd    .word 0           ; End of Basic program
```


On the VIC-20 there are three possible load addresses for BASIC programs, depending on memory expansions: unexpanded `$1001`, 3k `$401` and 8+k `$1201`, one load address for the C64 `$801` and one for the C128 `$1C01`. The load address should be specified as the first two bytes of the output binary and in typical assemblers this is done by setting the program counter after the load address in the source with syntax like `* = $1001` or `ORG $1001` with the `$` signifying hexadecimal here. Some assemblers settled on different conventions for hexadecimal like `1001h` or `0x1001`.

Given the strict byte structure of BASIC programs and having a machine code entry point labelled in the assembly source, the BASIC source code depends on the memory location of the entry point. It must include a PETSCII representation of the decimal number for the entry point address.

While this value can be hand-calculated and written into the assembly source in some form of text literal, `.asc "4110"` as Lawrence did, if the address of the entry point were to change during development of the machine code program, this literal value would have to be recalculated.

As a convenience, `Kick Assembler` provides a built-in _special feature_ called [BasicUpstart](https://theweb.dk/KickAssembler/webhelp/content/ch14s02.html) that results in assembly code like this minimal program for the C64 which changes the screen colours in an infinite loop:

```
        * = $0801 "Basic Upstart"
        BasicUpstart(start)    // 10 sys$0810

        *= $0810 "Program"
start:  inc $d020
        inc $d021
        jmp start
```

`BasicUpstart(start)` is a kind of build-time function that resolves the parameter as a label and inserts the BASIC program bytes to jump to the final address of the label in the assembly code. 

While this is cool and compact, it lacks control of the BASIC program that Lawrence goes on to elaborate in [his article](https://techtinkering.com/articles/basic-line-storage-on-the-vic-20/). Embedding backspace characters in the BASIC program enables a hack which can prevent your BASIC loader program from properly printing when the user enters the `LIST` command. Lawrence is able to make this command merely print out a message of his choosing, obscuring the SYS command altogether!

Many assemblers provide macro definition capabilities that could be used to make the BASIC program code clear in the assembly source and assuming certain build-time expression evaluation faculties, implement all these tricks together so that the result is something like this:

```
  * = VIC_20_LOAD_ADDRESS_UNEXPANDED
  .basic_erase(2025, SYS, start, "WHY YOU LIST MY PROGRAM?")
start:
   inc $d020
   inc $d021
   jmp start   
```

The point is, depending on the assembler syntax, how all these things are achieved produces very different results when attempting to disassemble a binary. Making reverse engineering of binaries convenient and producing literate assembly code targeting a range of assemblers could help with ergonomic reengineering work as well.

As Lawrence points out, the BASIC code could dynamically calculate the address of the machine code in the SYS command so long as it knows the offset from the BASIC program to the entry point. The load address of the program binary will be ignored on Commodore machines if it is loaded from disk without a trailing `,1` parameter.