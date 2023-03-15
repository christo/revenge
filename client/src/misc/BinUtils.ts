
export const hex16 = (x: number) => (0xffff & x).toString(16).padStart(4, "0").toLowerCase();
export const hex8 = (x: number) => (0xff & x).toString(16).padStart(2, "0").toLowerCase();

export const stringToArray = (s: string) => {
    const prefix = [];
    for (let i = 0; i < s.length; i++) {
        prefix.push(s.charCodeAt(i));
    }
    return prefix;
}