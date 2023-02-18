export function hexByte(v: number) {
    return (0xff & v).toString(16).padStart(2, '0');
}