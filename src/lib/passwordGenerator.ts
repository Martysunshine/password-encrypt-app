const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}";
const CHARSET = `${UPPERCASE}${LOWERCASE}${DIGITS}${SYMBOLS}`;
const MIN_LENGTH = 12;

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error("maxExclusive must be greater than 0");
  }

  const limit = Math.floor(256 / maxExclusive) * maxExclusive;
  const randomByte = new Uint8Array(1);

  while (true) {
    crypto.getRandomValues(randomByte);
    const byte = randomByte[0];
    if (byte === undefined) {
      continue;
    }

    if (byte < limit) {
      return byte % maxExclusive;
    }
  }
}

function pickRandom(source: string): string {
  const character = source[randomInt(source.length)];
  if (character === undefined) {
    throw new Error("Failed to select a random character.");
  }
  return character;
}

function shuffle(values: string[]): string[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const source = output[index];
    const target = output[swapIndex];
    if (source === undefined || target === undefined) {
      continue;
    }
    output[index] = target;
    output[swapIndex] = source;
  }
  return output;
}

export function generateSecurePassword(length: number = 20): string {
  const targetLength = Math.max(length, MIN_LENGTH);
  const generated: string[] = [
    pickRandom(UPPERCASE),
    pickRandom(LOWERCASE),
    pickRandom(DIGITS),
    pickRandom(SYMBOLS),
  ];

  while (generated.length < targetLength) {
    generated.push(pickRandom(CHARSET));
  }

  return shuffle(generated).join("");
}
