import {Petscii} from "../machine/petscii";


test("petscii sanity test", () => {
    let bad = [];
    Petscii.C64_MAPPING.forEach((t:[number, string], i:number, a:[number, string][]) => {
        if (t[0] !== i) {
            console.log(`[${t[0]},${t[1]}] -> ${i}`);
            bad.push(t);
        }
    });
    expect(bad.length).toBe(0);
    expect(Petscii.C64_MAPPING.length).toBe(255);
    expect(Petscii.PETSCII_C64.length).toBe(255);
})

export {}