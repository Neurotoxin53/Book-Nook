export function normalizeIsbn(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase().replace(/[^0-9X]/g, '');
  if (normalized.length === 10 && isValidIsbn10(normalized)) return normalized;
  if (normalized.length === 13 && isValidIsbn13(normalized)) return normalized;
  return undefined;
}

export function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  const sum = [...value].reduce((total, character, index) => {
    const digit = character === 'X' ? 10 : Number(character);
    return total + digit * (10 - index);
  }, 0);
  return sum % 11 === 0;
}

export function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const sum = [...value.slice(0, 12)].reduce(
    (total, character, index) => total + Number(character) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  const check = (10 - (sum % 10)) % 10;
  return check === Number(value[12]);
}

export function isbn10To13(value: string | undefined): string | undefined {
  const isbn10 = normalizeIsbn(value);
  if (!isbn10 || isbn10.length !== 10) return undefined;
  const base = `978${isbn10.slice(0, 9)}`;
  const sum = [...base].reduce(
    (total, character, index) => total + Number(character) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return `${base}${(10 - (sum % 10)) % 10}`;
}

export function isbn13To10(value: string | undefined): string | undefined {
  const isbn13 = normalizeIsbn(value);
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith('978')) return undefined;
  const base = isbn13.slice(3, 12);
  const sum = [...base].reduce((total, character, index) => total + Number(character) * (10 - index), 0);
  const remainder = (11 - (sum % 11)) % 11;
  const check = remainder === 10 ? 'X' : String(remainder);
  return `${base}${check}`;
}

export function pickIsbns(values: string[] = []) {
  const normalized = values.flatMap((value) => normalizeIsbn(value) ?? []);
  const isbn13 = normalized.find((value) => value.length === 13)
    ?? isbn10To13(normalized.find((value) => value.length === 10));
  const isbn10 = normalized.find((value) => value.length === 10)
    ?? isbn13To10(isbn13);
  return { isbn10, isbn13 };
}
