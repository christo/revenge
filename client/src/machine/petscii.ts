class Petscii {

    /**
     * Byte-value-indexed array of character or printable form the way VICE does it.
     */
    vice: string[] = [];

    /**
     * Byte-value indexed array of unicode character equivalent. May be empty if no char makes sense.
     */
    unicode: string[] = [];

    /**
     * Description of the character or the unicode if .
     */
    description: string[] = [];

    /**
     * Register the character with the given byte value. If the byte is already registered, this replaces its value.
     *
     * @param byte the byte value
     * @param vice the commonly used vice printable string
     * @param unicode the unicode equivalent character (approximates graphics), defaults to vice.
     * @param description explanation of the meaning of the character, defaults to unicode.
     */
    private reg(byte: number, vice: string, unicode?: string, description?: string) {
        // paranoia = on
        if (byte < 0 || byte > 255) {
            throw Error(`not a byte: ${byte}`);
        }
        if (vice.length === 0) {
            throw Error("vice was empty");
        }
        if (unicode && unicode.length === 0) {
            throw Error("unicode was empty");
        }
        if (description && description.length === 0) {
            throw Error("description was empty");
        }
        unicode = unicode || vice;

        this.vice[byte] = vice;
        this.unicode[byte] = unicode;
        this.description[byte] = description || unicode;
    }

    /** Apparently slightly different to Vic-20. Uses VICE format codes. */
    private static makeC64() {
        const C64 = new Petscii();
        C64.reg(0, "{null}", "{null}", "{null}");
        C64.reg(1, "{CTRL-A}", "{CTRL-A}", "{CTRL-A}");
        C64.reg(2, "{CTRL-B}", "{CTRL-B}", "{CTRL-B}");
        C64.reg(3, "{stop}", "{stop}", "{stop}");
        C64.reg(4, "{CTRL-D}", "{CTRL-D}", "{CTRL-D}");
        C64.reg(5, "{wht}", "{wht}", "{wht}");
        C64.reg(6, "{CTRL-F}", "{CTRL-F}", "{CTRL-F}");
        C64.reg(7, "{CTRL-G}", "{CTRL-G}", "{CTRL-G}");
        C64.reg(8, "{dish}", "{dish}", "{dish}");
        C64.reg(9, "{ensh}", "{ensh}", "{ensh}");
        C64.reg(10, "{$0a}", "{$0a}", "{$0a}");
        C64.reg(11, "{CTRL-K}", "{CTRL-K}", "{CTRL-K}");
        C64.reg(12, "{\\f}", "\\f", "form feed");
        C64.reg(13, "{\\n}", "\\n", "newline");
        C64.reg(14, "{swlc}", "{swlc}", "{swlc}");
        C64.reg(15, "{CTRL-O}", "{CTRL-O}", "{CTRL-O}");
        C64.reg(16, "{CTRL-P}", "{CTRL-P}", "{CTRL-P}");
        C64.reg(17, "{down}", "{down}", "{down}");
        C64.reg(18, "{rvon}", "{rvon}", "{rvon}");
        C64.reg(19, "{home}", "{home}", "{home}");
        C64.reg(20, "{del}", "{del}", "{del}");
        C64.reg(21, "{CTRL-U}", "{CTRL-U}", "{CTRL-U}");
        C64.reg(22, "{CTRL-V}", "{CTRL-V}", "{CTRL-V}");
        C64.reg(23, "{CTRL-W}", "{CTRL-W}", "{CTRL-W}");
        C64.reg(24, "{CTRL-X}", "{CTRL-X}", "{CTRL-X}");
        C64.reg(25, "{CTRL-Y}", "{CTRL-Y}", "{CTRL-Y}");
        C64.reg(26, "{CTRL-Z}", "{CTRL-Z}", "{CTRL-Z}");
        C64.reg(27, "{$1b}", "{$1b}", "{$1b}");
        C64.reg(28, "{red}", "{red}", "{red}");
        C64.reg(29, "{right}", "{right}", "{right}");
        C64.reg(30, "{green}", "{green}", "{green}");
        C64.reg(31, "{blue}", "{blue}", "{blue}");
        C64.reg(32, "{space}", " ", "space");
        C64.reg(33, "!", "!", "exclamation mark");
        C64.reg(34, "\"");
        C64.reg(35, "#");
        C64.reg(36, "$");
        C64.reg(37, "%");
        C64.reg(38, "&");
        C64.reg(39, "'");
        C64.reg(40, "(");
        C64.reg(41, ")");
        C64.reg(42, "*");
        C64.reg(43, "+");
        C64.reg(44, ",");
        C64.reg(45, "-");
        C64.reg(46, ".");
        C64.reg(47, "/");
        C64.reg(48, "0");
        C64.reg(49, "1");
        C64.reg(50, "2");
        C64.reg(51, "3");
        C64.reg(52, "4");
        C64.reg(53, "5");
        C64.reg(54, "6");
        C64.reg(55, "7");
        C64.reg(56, "8");
        C64.reg(57, "9");
        C64.reg(58, ":");
        C64.reg(59, ";");
        C64.reg(60, "<");
        C64.reg(61, "=");
        C64.reg(62, ">");
        C64.reg(63, "?");
        C64.reg(64, "@");
        C64.reg(65, "a");
        C64.reg(66, "b");
        C64.reg(67, "c");
        C64.reg(68, "d");
        C64.reg(69, "e");
        C64.reg(70, "f");
        C64.reg(71, "g");
        C64.reg(72, "h");
        C64.reg(73, "i");
        C64.reg(74, "j");
        C64.reg(75, "k");
        C64.reg(76, "l");
        C64.reg(77, "m");
        C64.reg(78, "n");
        C64.reg(79, "o");
        C64.reg(80, "p");
        C64.reg(81, "q");
        C64.reg(82, "r");
        C64.reg(83, "s");
        C64.reg(84, "t");
        C64.reg(85, "u");
        C64.reg(86, "v");
        C64.reg(87, "w");
        C64.reg(88, "x");
        C64.reg(89, "y");
        C64.reg(90, "z");
        C64.reg(91, "[");
        C64.reg(92, "£", "\u00A3");
        C64.reg(93, "]");
        C64.reg(94, "^", "\u2191", "up arrow");
        C64.reg(95, "{back arrow}", "\u2190", "left arrow");
        C64.reg(96, "{$60}", "\u2500", "non-breaking space");
        C64.reg(97, "{$61}", "\u2660", "spades");
        C64.reg(98, "{$62}", "\u2502", "{$62}");
        C64.reg(99, "{$63}", "\u2500", "{$63}");
        C64.reg(100, "{$64}", "{$64}", "{$64}");
        C64.reg(101, "{$65}", "{$65}", "{$65}");
        C64.reg(102, "{$66}", "{$66}", "{$66}");
        C64.reg(103, "{$67}", "{$67}", "{$67}");
        C64.reg(104, "{$68}", "{$68}", "{$68}");
        C64.reg(105, "{$69}", "\u256E", "{$69}");
        C64.reg(106, "{$6a}", "\u2570'", "{$6a}");
        C64.reg(107, "{$6b}", "\u256F", "{$6b}");
        C64.reg(108, "{$6c}", "{$6c}", "{$6c}");
        C64.reg(109, "{$6d}", "\u2572", "{$6d}");
        C64.reg(110, "{$6e}", "\u2571", "{$6e}");
        C64.reg(111, "{$6f}", "{$6f}", "{$6f}");
        C64.reg(112, "{$70}", "{$70}", "{$70}");
        C64.reg(113, "{$71}", "\u25CF", "filled circle");
        C64.reg(114, "{$72}", "{$72}", "{$72}");
        C64.reg(115, "{$73}", "\u2665", "{$73}");
        C64.reg(116, "{$74}", "{$74}", "{$74}");
        C64.reg(117, "{$75}", "\u256D", "{$75}");
        C64.reg(118, "{$76}", "\u2573", "x mark");
        C64.reg(119, "{$77}", "\u2573", "outlined circle");
        C64.reg(120, "{$78}", "\u2663", "clubs");
        C64.reg(121, "{$79}", "{$79}", "{$79}");
        C64.reg(122, "{$7a}", "\u2666", "diamonds");
        C64.reg(123, "{$7b}", "\u253C", "cross");
        C64.reg(124, "{$7c}", "{$7c}", "{$7c}");
        C64.reg(125, "{$7d}", "\u2502", "bar");
        C64.reg(126, "{$7e}", "\u03C0", "{$7e}");
        C64.reg(127, "{$7f}", "\u25E5", "top right half");
        C64.reg(128, "{$80}", "{$80}", "{$80}");
        C64.reg(129, "{orng}", "{orng}", "{orng}");
        C64.reg(130, "{$82}", "{$82}", "{$82}");
        C64.reg(131, "{$83}", "{$83}", "{$83}");
        C64.reg(132, "{$84}", "{$84}", "{$84}");
        C64.reg(133, "{f1}", "{f1}", "{f1}");
        C64.reg(134, "{f3}", "{f3}", "{f3}");
        C64.reg(135, "{f5}", "{f5}", "{f5}");
        C64.reg(136, "{f7}", "{f7}", "{f7}");
        C64.reg(137, "{f2}", "{f2}", "{f2}");
        C64.reg(138, "{f4}", "{f4}", "{f4}");
        C64.reg(139, "{f6}", "{f6}", "{f6}");
        C64.reg(140, "{f8}", "{f8}", "{f8}");
        C64.reg(141, "{stret}", "{stret}", "{stret}");
        C64.reg(142, "{swuc}", "{swuc}", "{swuc}");
        C64.reg(143, "{$8f}", "{$8f}", "{$8f}");
        C64.reg(144, "{blk}", "{blk}", "{blk}");
        C64.reg(145, "{up}", "{up}", "{up}");
        C64.reg(146, "{rvof}", "{rvof}", "{rvof}");
        C64.reg(147, "{clr}", "{clr}", "{clr}");
        C64.reg(148, "{inst}", "{inst}", "{inst}");
        C64.reg(149, "{brn}", "{brn}", "{brn}");
        C64.reg(150, "{lred}", "{lred}", "{lred}");
        C64.reg(151, "{gry1}", "{gry1}", "{gry1}");
        C64.reg(152, "{gry2}", "{gry2}", "{gry2}");
        C64.reg(153, "{lgrn}", "{lgrn}", "{lgrn}");
        C64.reg(154, "{lblu}", "{lblu}", "{lblu}");
        C64.reg(155, "{gry3}", "{gry3}", "{gry3}");
        C64.reg(156, "{pur}", "{pur}", "{pur}");
        C64.reg(157, "{left}", "{left}", "{left}");
        C64.reg(158, "{yel}", "{yel}", "{yel}");
        C64.reg(159, "{cyn}", "{cyn}", "{cyn}");
        C64.reg(160, "{$a0}", "\u00A0");
        C64.reg(161, "{CBM-K}", "\u258C");
        C64.reg(162, "{CBM-I}", "\u2584");
        C64.reg(163, "{CBM-T}", "\u2594");
        C64.reg(164, "{CBM-@}", "\u2581");
        C64.reg(165, "{CBM-G}", "\u258F");
        C64.reg(166, "{CBM-+}", "\u2592");
        C64.reg(167, "{CBM-M}", "\u2595");
        C64.reg(168, "{shft pound}");
        C64.reg(169, "{ctrl pound}", "\u25E4");
        C64.reg(170, "{CBM-N}");
        C64.reg(171, "{CBM-Q}", "\u251C");
        C64.reg(172, "{CBM-D}", "\u2597");
        C64.reg(173, "{CBM-Z}", "\u2514");
        C64.reg(174, "{CBM-S}", "\u2510");
        C64.reg(175, "{CBM-P}", "\u2582");
        C64.reg(176, "{CBM-A}", "\u250C");
        C64.reg(177, "{CBM-E}", "\u2534");
        C64.reg(178, "{CBM-R}", "\u252C");
        C64.reg(179, "{CBM-W}", "\u2524");
        C64.reg(180, "{CBM-H}", "\u258E");
        C64.reg(181, "{CBM-J}", "\u258D");
        C64.reg(182, "{CBM-L}");
        C64.reg(183, "{CBM-Y}");
        C64.reg(184, "{CBM-U}");
        C64.reg(185, "{CBM-O}", "\u2583");
        C64.reg(186, "{SHIFT-@}"); // shifted, checkmark (\u2713)
        C64.reg(187, "{CBM-F}", "\u2596", "{CBM-F}");
        C64.reg(188, "{CBM-C}", "\u259D", "{CBM-C}");
        C64.reg(189, "{CBM-X}", "\u2518", "{CBM-X}");
        C64.reg(190, "{CBM-V}", "\u2598", "{CBM-V}");
        C64.reg(191, "{CBM-B}", "\u259A", "{CBM-B}");
        C64.reg(192, "{SHIFT-*}", "\u2500", "{SHIFT-*}");
        C64.reg(193, "A");
        C64.reg(194, "B");
        C64.reg(195, "C");
        C64.reg(196, "D");
        C64.reg(197, "E");
        C64.reg(198, "F");
        C64.reg(199, "G");
        C64.reg(200, "H");
        C64.reg(201, "I");
        C64.reg(202, "J");
        C64.reg(203, "K");
        C64.reg(204, "L");
        C64.reg(205, "M");
        C64.reg(206, "N");
        C64.reg(207, "O");
        C64.reg(208, "P");
        C64.reg(209, "Q");
        C64.reg(210, "R");
        C64.reg(211, "S");
        C64.reg(212, "T");
        C64.reg(213, "U");
        C64.reg(214, "V");
        C64.reg(215, "W");
        C64.reg(216, "X");
        C64.reg(217, "Y");
        C64.reg(218, "Z");
        C64.reg(219, "{SHIFT-+}", "\u253C", "{SHIFT-+}");
        C64.reg(220, "{CBM--}", "{CBM--}", "{CBM--}");
        C64.reg(221, "{SHIFT--}", "\u2502", "{SHIFT--}");
        C64.reg(222, "{$de}", "\u03C0", "{$de}");
        C64.reg(223, "{CBM-*}", "\u25E5", "{CBM-*}");
        C64.reg(224, "{$e0}", "\u00A0", "{$e0}");
        C64.reg(225, "{$e1}", "\u258C", "{$e1}");
        C64.reg(226, "{$e2}", "\u2584", "{$e2}");
        C64.reg(227, "{$e3}", "\u2594", "{$e3}");
        C64.reg(228, "{$e4}", "\u2581", "{$e4}");
        C64.reg(229, "{$e5}", "\u258F", "{$e5}");
        C64.reg(230, "{$e6}", "\u2592", "{$e6}");
        C64.reg(231, "{$e7}", "\u2595", "{$e7}");
        C64.reg(232, "{$e8}", "{$e8}", "{$e8}");
        C64.reg(233, "{$e9}", "\u25E4", "{$e9}");
        C64.reg(234, "{$ea}", "{$ea}", "{$ea}");
        C64.reg(235, "{$eb}", "\u251C", "{$eb}");
        C64.reg(236, "{$ec}", "\u2597", "{$ec}");
        C64.reg(237, "{$ed}", "\u2514", "{$ed}");
        C64.reg(238, "{$ee}", "\u2510", "{$ee}");
        C64.reg(239, "{$ef}", "\u2582", "{$ef}");
        C64.reg(240, "{$f0}", "\u250C", "{$f0}");
        C64.reg(241, "{$f1}", "\u2534", "{$f1}");
        C64.reg(242, "{$f2}", "\u252C", "{$f2}");
        C64.reg(243, "{$f3}", "\u2524", "{$f3}");
        C64.reg(244, "{$f4}", "\u258E", "{$f4}");
        C64.reg(245, "{$f5}", "\u258D", "{$f5}");
        C64.reg(246, "{$f6}");
        C64.reg(247, "{$f7}");
        C64.reg(248, "{$f8}");
        C64.reg(249, "{$f9}", "\u2583", "{$f9}");
        C64.reg(250, "{$fa}");
        C64.reg(251, "{$fb}", "\u2596", "{$fb}");
        C64.reg(252, "{$fc}", "\u259D", "{$fc}");
        C64.reg(253, "{$fd}", "\u2518", "{$fd}");
        C64.reg(254, "{$fe}", "\u2598", "{$fe}");
        C64.reg(255, "~", "\u03C0", "pi");
        return C64;
    }

    static C64: Petscii = Petscii.makeC64();

/*
#
#    Name:                PETSCII VIC-20 English Uppercase to Unicode Table
#    Unicode version:        3.0
#    Table version:        1.00
#    Table format:        Format A
#    Date:                12/03/00
#    Authors:                Linus Walleij <triad@df.lth.se>
#    General notes:        Licensed under the GNU GPL, version 2
#
#    Format: Three tab-separated columns
#        Column #1 is the PETSCII VIC-20 Uppercase code (in hex)
#        Column #2 is the Unicode (in hex as 0xXXXX)
#        Column #3 is the Unicode name (follows a comment sign, '#')
#
#    The entries are in PETSCII order
#
0x00                #UNDEFINED
0x01                #UNDEFINED
0x02                #UNDEFINED
0x03                #UNDEFINED
0x04                #UNDEFINED
0x05        0xF100        #WHITE COLOR SWITCH (CUS)
0x06                #UNDEFINED
0x07                #UNDEFINED
0x08        0xF118        #DISABLE CHARACTER SET SWITCHING (CUS)
0x09        0xF119        #ENABLE CHARACTER SET SWITCHING (CUS)
0x0A                #UNDEFINED
0x0B                #UNDEFINED
0x0C                #UNDEFINED
0x0D        0x000D        #CARRIAGE RETURN
0x0E        0x000E        #SHIFT OUT
0x0F                #UNDEFINED
0x10                #UNDEFINED
0x11        0xF11C        #CURSOR DOWN (CUS)
0x12                #UNDEFINED
0x13        0xF120        #HOME (CUS)
0x14        0x007F        #DELETE
0x15                #UNDEFINED
0x16                #UNDEFINED
0x17                #UNDEFINED
0x18                #UNDEFINED
0x19                #UNDEFINED
0x1A                #UNDEFINED
0x1B                #UNDEFINED
0x1C        0xF101        #RED COLOR SWITCH (CUS)
0x1D        0xF11D        #CURSOR RIGHT (CUS)
0x1E        0xF102        #GREEN COLOR SWITCH (CUS)
0x1F        0xF103        #BLUE COLOR SWITCH (CUS)
0x20        0x0020        #SPACE
0x21        0x0021        #EXCLAMATION MARK
0x22        0x0022        #QUOTATION MARK
0x23        0x0023        #NUMBER SIGN
0x24        0x0024        #DOLLAR SIGN
0x25        0x0025        #PERCENT SIGN
0x26        0x0026        #AMPERSAND
0x27        0x0027        #APOSTROPHE
0x28        0x0028        #LEFT PARENTHESIS
0x29        0x0029        #RIGHT PARENTHESIS
0x2A        0x002A        #ASTERISK
0x2B        0x002B        #PLUS SIGN
0x2C        0x002C        #COMMA
0x2D        0x002D        #HYPHEN-MINUS
0x2E        0x002E        #FULL STOP
0x2F        0x002F        #SOLIDUS
0x30        0x0030        #DIGIT ZERO
0x31        0x0031        #DIGIT ONE
0x32        0x0032        #DIGIT TWO
0x33        0x0033        #DIGIT THREE
0x34        0x0034        #DIGIT FOUR
0x35        0x0035        #DIGIT FIVE
0x36        0x0036        #DIGIT SIX
0x37        0x0037        #DIGIT SEVEN
0x38        0x0038        #DIGIT EIGHT
0x39        0x0039        #DIGIT NINE
0x3A        0x003A        #COLON
0x3B        0x003B        #SEMICOLON
0x3C        0x003C        #LESS-THAN SIGN
0x3D        0x003D        #EQUALS SIGN
0x3E        0x003E        #GREATER-THAN SIGN
0x3F        0x003F        #QUESTION MARK
0x40        0x0040        #COMMERCIAL AT
0x41        0x0041        #LATIN CAPITAL LETTER A
0x42        0x0042        #LATIN CAPITAL LETTER B
0x43        0x0043        #LATIN CAPITAL LETTER C
0x44        0x0044        #LATIN CAPITAL LETTER D
0x45        0x0045        #LATIN CAPITAL LETTER E
0x46        0x0046        #LATIN CAPITAL LETTER F
0x47        0x0047        #LATIN CAPITAL LETTER G
0x48        0x0048        #LATIN CAPITAL LETTER H
0x49        0x0049        #LATIN CAPITAL LETTER I
0x4A        0x004A        #LATIN CAPITAL LETTER J
0x4B        0x004B        #LATIN CAPITAL LETTER K
0x4C        0x004C        #LATIN CAPITAL LETTER L
0x4D        0x004D        #LATIN CAPITAL LETTER M
0x4E        0x004E        #LATIN CAPITAL LETTER N
0x4F        0x004F        #LATIN CAPITAL LETTER O
0x50        0x0050        #LATIN CAPITAL LETTER P
0x51        0x0051        #LATIN CAPITAL LETTER Q
0x52        0x0052        #LATIN CAPITAL LETTER R
0x53        0x0053        #LATIN CAPITAL LETTER S
0x54        0x0054        #LATIN CAPITAL LETTER T
0x55        0x0055        #LATIN CAPITAL LETTER U
0x56        0x0056        #LATIN CAPITAL LETTER V
0x57        0x0057        #LATIN CAPITAL LETTER W
0x58        0x0058        #LATIN CAPITAL LETTER X
0x59        0x0059        #LATIN CAPITAL LETTER Y
0x5A        0x005A        #LATIN CAPITAL LETTER Z
0x5B        0x005B        #LEFT SQUARE BRACKET
0x5C        0x00A3        #POUND SIGN
0x5D        0x005D        #RIGHT SQUARE BRACKET
0x5E        0x2191        #UPWARDS ARROW
0x5F        0x2190        #LEFTWARDS ARROW
0x60        0x2501        #BOX DRAWINGS LIGHT HORIZONTAL
0x61        0x2660        #BLACK SPADE SUIT
0x62        0x2502        #BOX DRAWINGS LIGHT VERTICAL
0x63        0x2501        #BOX DRAWINGS LIGHT HORIZONTAL
0x64        0xF122        #BOX DRAWINGS LIGHT HORIZONTAL ONE QUARTER UP (CUS)
0x65        0xF123        #BOX DRAWINGS LIGHT HORIZONTAL TWO QUARTERS UP (CUS)
0x66        0xF124        #BOX DRAWINGS LIGHT HORIZONTAL ONE QUARTER DOWN (CUS)
0x67        0xF126        #BOX DRAWINGS LIGHT VERTICAL ONE QUARTER LEFT (CUS)
0x68        0xF128        #BOX DRAWINGS LIGHT VERTICAL ONE QUARTER RIGHT (CUS)
0x69        0x256E        #BOX DRAWINGS LIGHT ARC DOWN AND LEFT
0x6A        0x2570        #BOX DRAWINGS LIGHT ARC UP AND RIGHT
0x6B        0x256F        #BOX DRAWINGS LIGHT ARC UP AND LEFT
0x6C        0xF12A        #ONE EIGHTH BLOCK UP AND RIGHT (CUS)
0x6D        0x2572        #BOX DRAWINGS LIGHT DIAGONAL UPPER LEFT TO LOWER RIGHT
0x6E        0x2571        #BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT
0x6F        0xF12B        #ONE EIGHTH BLOCK DOWN AND RIGHT (CUS)
0x70        0xF12C        #ONE EIGHTH BLOCK DOWN AND LEFT (CUS)
0x71        0x25CF        #BLACK CIRCLE
0x72        0xF125        #BOX DRAWINGS LIGHT HORIZONTAL TWO QUARTERS DOWN (CUS)
0x73        0x2665        #BLACK HEART SUIT
0x74        0xF127        #BOX DRAWINGS LIGHT VERTICAL TWO QUARTERS LEFT (CUS)
0x75        0x256D        #BOX DRAWINGS LIGHT ARC DOWN AND RIGHT
0x76        0x2573        #BOX DRAWINGS LIGHT DIAGONAL CROSS
0x77        0x25CB        #WHITE CIRCLE
0x78        0x2663        #BLACK CLUB SUIT
0x79        0xF129        #BOX DRAWINGS LIGHT VERTICAL TWO QUARTERS RIGHT (CUS)
0x7A        0x2666        #BLACK DIAMOND SUIT
0x7B        0x253C        #BOX DRAWINGS LIGHT VERTICAL AND HORIZONTAL
0x7C        0xF12E        #LEFT HALF BLOCK MEDIUM SHADE (CUS)
0x7D        0x2502        #BOX DRAWINGS LIGHT VERTICAL
0x7E        0x03C0        #GREEK SMALL LETTER PI
0x7F        0x25E5        #BLACK UPPER RIGHT TRIANGLE
0x80                #UNDEFINED
0x81                #UNDEFINED
0x82                #UNDEFINED
0x83                #UNDEFINED
0x84                #UNDEFINED
0x85        0xF110        #FUNCTION KEY 1 (CUS)
0x86        0xF112        #FUNCTION KEY 3 (CUS)
0x87        0xF114        #FUNCTION KEY 5 (CUS)
0x88        0xF116        #FUNCTION KEY 7 (CUS)
0x89        0xF111        #FUNCTION KEY 2 (CUS)
0x8A        0xF113        #FUNCTION KEY 4 (CUS)
0x8B        0xF115        #FUNCTION KEY 6 (CUS)
0x8C        0xF117        #FUNCTION KEY 8 (CUS)
0x8D        0x000A        #LINE FEED
0x8E        0x000F        #SHIFT IN
0x8F                #UNDEFINED
0x90        0xF105        #BLACK COLOR SWITCH (CUS)
0x91        0xF11E        #CURSOR UP (CUS)
0x92                #UNDEFINED
0x93        0x000C        #FORM FEED
0x94        0xF121        #INSERT (CUS)
0x95                #UNDEFINED
0x96                #UNDEFINED
0x97                #UNDEFINED
0x98                #UNDEFINED
0x99                #UNDEFINED
0x9A                #UNDEFINED
0x9B                #UNDEFINED
0x9C        0xF10D        #PURPLE COLOR SWITCH (CUS)
0x9D        0xF11D        #CURSOR LEFT (CUS)
0x9E        0xF10E        #YELLOW COLOR SWITCH (CUS)
0x9F        0xF10F        #CYAN COLOR SWITCH (CUS)
0xA0        0x00A0        #NO-BREAK SPACE
0xA1        0x258C        #LEFT HALF BLOCK
0xA2        0x2584        #LOWER HALF BLOCK
0xA3        0x2594        #UPPER ONE EIGHTH BLOCK
0xA4        0x2581        #LOWER ONE EIGHTH BLOCK
0xA5        0x258F        #LEFT ONE EIGHTH BLOCK
0xA6        0x2592        #MEDIUM SHADE
0xA7        0x2595        #RIGHT ONE EIGHTH BLOCK
0xA8        0xF12F        #LOWER HALF BLOCK MEDIUM SHADE (CUS)
0xA9        0x25E4        #BLACK UPPER LEFT TRIANGLE
0xAA        0xF130        #RIGHT ONE QUARTER BLOCK (CUS)
0xAB        0x251C        #BOX DRAWINGS LIGHT VERTICAL AND RIGHT
0xAC        0xF134        #BLACK SMALL SQUARE LOWER RIGHT (CUS)
0xAD        0x2514        #BOX DRAWINGS LIGHT UP AND RIGHT
0xAE        0x2510        #BOX DRAWINGS LIGHT DOWN AND LEFT
0xAF        0x2582        #LOWER ONE QUARTER BLOCK
0xB0        0x250C        #BOX DRAWINGS LIGHT DOWN AND RIGHT
0xB1        0x2534        #BOX DRAWINGS LIGHT UP AND HORIZONTAL
0xB2        0x252C        #BOX DRAWINGS LIGHT DOWN AND HORIZONTAL
0xB3        0x2524        #BOX DRAWINGS LIGHT VERTICAL AND LEFT
0xB4        0x258E        #LEFT ONE QUARTER BLOCK
0xB5        0x258D        #LEFT THREE EIGTHS BLOCK
0xB6        0xF131        #RIGHT THREE EIGHTHS BLOCK (CUS)
0xB7        0xF132        #UPPER ONE QUARTER BLOCK (CUS)
0xB8        0xF133        #UPPER THREE EIGHTS BLOCK (CUS)
0xB9        0x2583        #LOWER THREE EIGHTHS BLOCK
0xBA        0xF12D        #ONE EIGHTH BLOCK UP AND LEFT (CUS)
0xBB        0xF135        #BLACK SMALL SQUARE LOWER LEFT (CUS)
0xBC        0xF136        #BLACK SMALL SQUARE UPPER RIGHT (CUS)
0xBD        0x2518        #BOX DRAWINGS LIGHT UP AND LEFT
0xBE        0xF137        #BLACK SMALL SQUARE UPPER LEFT (CUS)
0xBF        0xF138        #TWO SMALL BLACK SQUARES DIAGONAL LEFT TO RIGHT (CUS)
0xC0        0x2501        #BOX DRAWINGS LIGHT HORIZONTAL
0xC1        0x2660        #BLACK SPADE SUIT
0xC2        0x2502        #BOX DRAWINGS LIGHT VERTICAL
0xC3        0x2501        #BOX DRAWINGS LIGHT HORIZONTAL
0xC4        0xF122        #BOX DRAWINGS LIGHT HORIZONTAL ONE QUARTER UP (CUS)
0xC5        0xF123        #BOX DRAWINGS LIGHT HORIZONTAL TWO QUARTERS UP (CUS)
0xC6        0xF124        #BOX DRAWINGS LIGHT HORIZONTAL ONE QUARTER DOWN (CUS)
0xC7        0xF126        #BOX DRAWINGS LIGHT VERTICAL ONE QUARTER LEFT (CUS)
0xC8        0xF128        #BOX DRAWINGS LIGHT VERTICAL ONE QUARTER RIGHT (CUS)
0xC9        0x256E        #BOX DRAWINGS LIGHT ARC DOWN AND LEFT
0xCA        0x2570        #BOX DRAWINGS LIGHT ARC UP AND RIGHT
0xCB        0x256F        #BOX DRAWINGS LIGHT ARC UP AND LEFT
0xCC        0xF12A        #ONE EIGHTH BLOCK UP AND RIGHT (CUS)
0xCD        0x2572        #BOX DRAWINGS LIGHT DIAGONAL UPPER LEFT TO LOWER RIGHT
0xCE        0x2571        #BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT
0xCF        0xF12B        #ONE EIGHTH BLOCK DOWN AND RIGHT (CUS)
0xD0        0xF12C        #ONE EIGHTH BLOCK DOWN AND LEFT (CUS)
0xD1        0x25CF        #BLACK CIRCLE
0xD2        0xF125        #BOX DRAWINGS LIGHT HORIZONTAL TWO QUARTERS DOWN (CUS)
0xD3        0x2665        #BLACK HEART SUIT
0xD4        0xF127        #BOX DRAWINGS LIGHT VERTICAL TWO QUARTERS LEFT (CUS)
0xD5        0x256D        #BOX DRAWINGS LIGHT ARC DOWN AND LEFT
0xD6        0x2573        #BOX DRAWINGS LIGHT DIAGONAL CROSS
0xD7        0x25CB        #WHITE CIRCLE
0xD8        0x2663        #BLACK CLUB SUIT
0xD9        0xF129        #BOX DRAWINGS LIGHT VERTICAL TWO QUARTERS RIGHT (CUS)
0xDA        0x2666        #BLACK DIAMOND SUIT
0xDB        0x253C        #BOX DRAWINGS LIGHT VERTICAL AND HORIZONTAL
0xDC        0xF12E        #LEFT HALF BLOCK MEDIUM SHADE (CUS)
0xDD        0x2502        #BOX DRAWINGS LIGHT VERTICAL
0xDE        0x03C0        #GREEK SMALL LETTER PI
0xDF        0x25E5        #BLACK UPPER RIGHT TRIANGLE
0xE0        0x00A0        #NO-BREAK SPACE
0xE1        0x258C        #LEFT HALF BLOCK
0xE2        0x2584        #LOWER HALF BLOCK
0xE3        0x2594        #UPPER ONE EIGHTH BLOCK
0xE4        0x2581        #LOWER ONE EIGHTH BLOCK
0xE5        0x258F        #LEFT ONE EIGHTH BLOCK
0xE6        0x2592        #MEDIUM SHADE
0xE7        0x2595        #RIGHT ONE EIGHTH BLOCK
0xE8        0xF12F        #LOWER HALF BLOCK MEDIUM SHADE (CUS)
0xE9        0x25E4        #BLACK UPPER LEFT TRIANGLE
0xEA        0xF130        #RIGHT ONE QUARTER BLOCK (CUS)
0xEB        0x251C        #BOX DRAWINGS LIGHT VERTICAL AND RIGHT
0xEC        0xF134        #BLACK SMALL SQUARE LOWER RIGHT (CUS)
0xED        0x2514        #BOX DRAWINGS LIGHT UP AND RIGHT
0xEE        0x2510        #BOX DRAWINGS LIGHT DOWN AND LEFT
0xEF        0x2582        #LOWER ONE QUARTER BLOCK
0xF0        0x250C        #BOX DRAWINGS LIGHT DOWN AND RIGHT
0xF1        0x2534        #BOX DRAWINGS LIGHT UP AND HORIZONTAL
0xF2        0x252C        #BOX DRAWINGS LIGHT DOWN AND HORIZONTAL
0xF3        0x2524        #BOX DRAWINGS LIGHT VERTICAL AND LEFT
0xF4        0x258E        #LEFT ONE QUARTER BLOCK
0xF5        0x258D        #LEFT THREE EIGTHS BLOCK
0xF6        0xF131        #RIGHT THREE EIGHTHS BLOCK (CUS)
0xF7        0xF132        #UPPER ONE QUARTER BLOCK (CUS)
0xF8        0xF133        #UPPER THREE EIGHTS BLOCK (CUS)
0xF9        0x2583        #LOWER THREE EIGHTHS BLOCK
0xFA        0xF12D        #ONE EIGHTH BLOCK UP AND LEFT (CUS)
0xFB        0xF135        #BLACK SMALL SQUARE LOWER LEFT (CUS)
0xFC        0xF136        #BLACK SMALL SQUARE UPPER RIGHT (CUS)
0xFD        0x2518        #BOX DRAWINGS LIGHT UP AND LEFT
0xFE        0xF137        #BLACK SMALL SQUARE UPPER LEFT (CUS)
0xFF        0x03C0        #GREEK SMALL LETTER PI


 */

}

export {Petscii}