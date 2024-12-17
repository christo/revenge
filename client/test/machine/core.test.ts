import {expect} from "chai";
import {unToSigned} from "../../src/machine/core";

/** Data-driven test of two's complement: input, expected output */
const TC_DATA: [number, number][] = [
    [8, 8],
    [127, 127],
    [0, 0],
    [0xf2, -14],
    [0xff, -1],
    [128, -128],
    [0b11110010, -14],
    [0b11011011, -37],
    [0b10011100, -100]
];

test('twos complement', () => {
    TC_DATA.forEach(x => expect(unToSigned(x[0])).eq(x[1]));
});

export {}