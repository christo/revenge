
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encodes binary data to a base64 string
 * @param data - The binary data to encode
 * @returns The base64 encoded string
 */
export function encodeBase64(data: Uint8Array): string {
  let result = '';

  // Process every 3 bytes
  for (let i = 0; i < data.length; i += 3) {
    const byte1 = data[i] || 0;
    const byte2 = i + 1 < data.length ? data[i + 1] : 0;
    const byte3 = i + 2 < data.length ? data[i + 2] : 0;

    // Convert 3 bytes to 4 base64 characters
    const triplet = (byte1 << 16) | (byte2 << 8) | byte3;

    result += CHARS[(triplet >> 18) & 0x3F];
    result += CHARS[(triplet >> 12) & 0x3F];
    result += i + 1 < data.length ? CHARS[(triplet >> 6) & 0x3F] : '=';
    result += i + 2 < data.length ? CHARS[triplet & 0x3F] : '=';
  }

  return result;
}

/**
 * Decodes a base64 string to binary data
 * @param input - The base64 encoded string
 * @returns The decoded binary data
 */
export function decodeBase64(input: string): Uint8Array {

  // Remove padding and non-base64 characters
  input = input.replace(/=+$/, '').replace(/[^A-Za-z0-9+/]/g, '');

  // Calculate output size
  const len = Math.floor(input.length * 3 / 4);
  const result = new Uint8Array(len);

  let pos = 0;

  // Process every 4 characters
  for (let i = 0; i < input.length; i += 4) {
    // Convert 4 base64 characters to values
    const values = [
      CHARS.indexOf(input[i]),
      CHARS.indexOf(input[i + 1]),
      i + 2 < input.length ? CHARS.indexOf(input[i + 2]) : 0,
      i + 3 < input.length ? CHARS.indexOf(input[i + 3]) : 0
    ];

    const triplet = (values[0] << 18) | (values[1] << 12) | (values[2] << 6) | values[3];

    if (pos < len) result[pos++] = (triplet >> 16) & 0xFF;
    if (pos < len) result[pos++] = (triplet >> 8) & 0xFF;
    if (pos < len) result[pos++] = triplet & 0xFF;
  }

  return result;
}