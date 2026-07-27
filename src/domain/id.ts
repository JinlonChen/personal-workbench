interface RandomSource {
  randomUUID?: () => string;
  getRandomValues?: (bytes: Uint8Array) => Uint8Array;
}

function runtimeCrypto(): RandomSource {
  if (typeof globalThis.crypto === "undefined") return {};
  return {
    randomUUID: typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
      : undefined,
    getRandomValues: typeof globalThis.crypto.getRandomValues === "function"
      ? globalThis.crypto.getRandomValues.bind(globalThis.crypto)
      : undefined,
  };
}

export function createId(source: RandomSource = runtimeCrypto()) {
  if (typeof source.randomUUID === "function") return source.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof source.getRandomValues === "function") {
    source.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
