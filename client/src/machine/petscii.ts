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
    private reg(byte:number, vice:string, unicode?:string, description?:string) {
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
        if (description && description.length == 0) {
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
        C64.reg(33, " ", " ", " ");
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
        C64.reg(92, "£");
        C64.reg(93, "]");
        C64.reg(94, "^");
        C64.reg(95, "{back arrow}", "{back arrow}", "{back arrow}");
        C64.reg(96, "{$60}", "{$60}", "{$60}");
        C64.reg(97, "{$61}", "{$61}", "{$61}");
        C64.reg(98, "{$62}", "{$62}", "{$62}");
        C64.reg(99, "{$63}", "{$63}", "{$63}");
        C64.reg(100, "{$64}", "{$64}", "{$64}");
        C64.reg(101, "{$65}", "{$65}", "{$65}");
        C64.reg(102, "{$66}", "{$66}", "{$66}");
        C64.reg(103, "{$67}", "{$67}", "{$67}");
        C64.reg(104, "{$68}", "{$68}", "{$68}");
        C64.reg(105, "{$69}", "{$69}", "{$69}");
        C64.reg(106, "{$6a}", "{$6a}", "{$6a}");
        C64.reg(107, "{$6b}", "{$6b}", "{$6b}");
        C64.reg(108, "{$6c}", "{$6c}", "{$6c}");
        C64.reg(109, "{$6d}", "{$6d}", "{$6d}");
        C64.reg(110, "{$6e}", "{$6e}", "{$6e}");
        C64.reg(111, "{$6f}", "{$6f}", "{$6f}");
        C64.reg(112, "{$70}", "{$70}", "{$70}");
        C64.reg(113, "{$71}", "{$71}", "{$71}");
        C64.reg(114, "{$72}", "{$72}", "{$72}");
        C64.reg(115, "{$73}", "{$73}", "{$73}");
        C64.reg(116, "{$74}", "{$74}", "{$74}");
        C64.reg(117, "{$75}", "{$75}", "{$75}");
        C64.reg(118, "{$76}", "{$76}", "{$76}");
        C64.reg(119, "{$77}", "{$77}", "{$77}");
        C64.reg(120, "{$78}", "{$78}", "{$78}");
        C64.reg(121, "{$79}", "{$79}", "{$79}");
        C64.reg(122, "{$7a}", "{$7a}", "{$7a}");
        C64.reg(123, "{$7b}", "{$7b}", "{$7b}");
        C64.reg(124, "{$7c}", "{$7c}", "{$7c}");
        C64.reg(125, "{$7d}", "{$7d}", "{$7d}");
        C64.reg(126, "{$7e}", "{$7e}", "{$7e}");
        C64.reg(127, "{$7f}", "{$7f}", "{$7f}");
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
        C64.reg(160, "{$a0}", "{$a0}", "{$a0}");
        C64.reg(161, "{CBM-K}", "{CBM-K}", "{CBM-K}");
        C64.reg(162, "{CBM-I}", "{CBM-I}", "{CBM-I}");
        C64.reg(163, "{CBM-T}", "{CBM-T}", "{CBM-T}");
        C64.reg(164, "{CBM-@}", "{CBM-@}", "{CBM-@}");
        C64.reg(165, "{CBM-G}", "{CBM-G}", "{CBM-G}");
        C64.reg(166, "{CBM-+}", "{CBM-+}", "{CBM-+}");
        C64.reg(167, "{CBM-M}", "{CBM-M}", "{CBM-M}");
        C64.reg(168, "{shft pound}", "{shft pound}", "{shft pound}");
        C64.reg(169, "{ctrl pound}", "{ctrl pound}", "{ctrl pound}");
        C64.reg(170, "{CBM-N}", "{CBM-N}", "{CBM-N}");
        C64.reg(171, "{CBM-Q}", "{CBM-Q}", "{CBM-Q}");
        C64.reg(172, "{CBM-D}", "{CBM-D}", "{CBM-D}");
        C64.reg(173, "{CBM-Z}", "{CBM-Z}", "{CBM-Z}");
        C64.reg(174, "{CBM-S}", "{CBM-S}", "{CBM-S}");
        C64.reg(175, "{CBM-P}", "{CBM-P}", "{CBM-P}");
        C64.reg(176, "{CBM-A}", "{CBM-A}", "{CBM-A}");
        C64.reg(177, "{CBM-E}", "{CBM-E}", "{CBM-E}");
        C64.reg(178, "{CBM-R}", "{CBM-R}", "{CBM-R}");
        C64.reg(179, "{CBM-W}", "{CBM-W}", "{CBM-W}");
        C64.reg(180, "{CBM-H}", "{CBM-H}", "{CBM-H}");
        C64.reg(181, "{CBM-J}", "{CBM-J}", "{CBM-J}");
        C64.reg(182, "{CBM-L}", "{CBM-L}", "{CBM-L}");
        C64.reg(183, "{CBM-Y}", "{CBM-Y}", "{CBM-Y}");
        C64.reg(184, "{CBM-U}", "{CBM-U}", "{CBM-U}");
        C64.reg(185, "{CBM-O}", "{CBM-O}", "{CBM-O}");
        C64.reg(186, "{SHIFT-@}", "{SHIFT-@}", "{SHIFT-@}");
        C64.reg(187, "{CBM-F}", "{CBM-F}", "{CBM-F}");
        C64.reg(188, "{CBM-C}", "{CBM-C}", "{CBM-C}");
        C64.reg(189, "{CBM-X}", "{CBM-X}", "{CBM-X}");
        C64.reg(190, "{CBM-V}", "{CBM-V}", "{CBM-V}");
        C64.reg(191, "{CBM-B}", "{CBM-B}", "{CBM-B}");
        C64.reg(192, "{SHIFT-*}", "{SHIFT-*}", "{SHIFT-*}");
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
        C64.reg(219, "{SHIFT-+}", "{SHIFT-+}", "{SHIFT-+}");
        C64.reg(220, "{CBM--}", "{CBM--}", "{CBM--}");
        C64.reg(221, "{SHIFT--}", "{SHIFT--}", "{SHIFT--}");
        C64.reg(222, "{$de}", "{$de}", "{$de}");
        C64.reg(223, "{CBM-*}", "{CBM-*}", "{CBM-*}");
        C64.reg(224, "{$e0}", "{$e0}", "{$e0}");
        C64.reg(225, "{$e1}", "{$e1}", "{$e1}");
        C64.reg(226, "{$e2}", "{$e2}", "{$e2}");
        C64.reg(227, "{$e3}", "{$e3}", "{$e3}");
        C64.reg(228, "{$e4}", "{$e4}", "{$e4}");
        C64.reg(229, "{$e5}", "{$e5}", "{$e5}");
        C64.reg(230, "{$e6}", "{$e6}", "{$e6}");
        C64.reg(231, "{$e7}", "{$e7}", "{$e7}");
        C64.reg(232, "{$e8}", "{$e8}", "{$e8}");
        C64.reg(233, "{$e9}", "{$e9}", "{$e9}");
        C64.reg(234, "{$ea}", "{$ea}", "{$ea}");
        C64.reg(235, "{$eb}", "{$eb}", "{$eb}");
        C64.reg(236, "{$ec}", "{$ec}", "{$ec}");
        C64.reg(237, "{$ed}", "{$ed}", "{$ed}");
        C64.reg(238, "{$ee}", "{$ee}", "{$ee}");
        C64.reg(239, "{$ef}", "{$ef}", "{$ef}");
        C64.reg(240, "{$f0}", "{$f0}", "{$f0}");
        C64.reg(241, "{$f1}", "{$f1}", "{$f1}");
        C64.reg(242, "{$f2}", "{$f2}", "{$f2}");
        C64.reg(243, "{$f3}", "{$f3}", "{$f3}");
        C64.reg(244, "{$f4}", "{$f4}", "{$f4}");
        C64.reg(245, "{$f5}", "{$f5}", "{$f5}");
        C64.reg(246, "{$f6}", "{$f6}", "{$f6}");
        C64.reg(247, "{$f7}", "{$f7}", "{$f7}");
        C64.reg(248, "{$f8}", "{$f8}", "{$f8}");
        C64.reg(249, "{$f9}", "{$f9}", "{$f9}");
        C64.reg(250, "{$fa}", "{$fa}", "{$fa}");
        C64.reg(251, "{$fb}", "{$fb}", "{$fb}");
        C64.reg(252, "{$fc}", "{$fc}", "{$fc}");
        C64.reg(253, "{$fd}", "{$fd}", "{$fd}");
        C64.reg(254, "{$fe}", "{$fe}", "{$fe}");
        C64.reg(255, "~", "pi", "pi");
        return C64;
    }
    static C64:Petscii = Petscii.makeC64();

}

export {Petscii}