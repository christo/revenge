import {Petscii} from "./petscii";

test("petscii sanity test", () => {
    expect(Petscii.C64.vice.length).toBe(256);
    expect(Petscii.C64.unicode.length).toBe(256);
    expect(Petscii.C64.description.length).toBe(256);
})

export {}