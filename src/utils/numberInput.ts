const numberFormatterCache = new Map<number, Intl.NumberFormat>();
let currencyFormatter: Intl.NumberFormat | undefined;

const getFormatter = (maximumFractionDigits: number) => {
  const cached = numberFormatterCache.get(maximumFractionDigits);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat('pt-BR', {
    useGrouping: true,
    maximumFractionDigits,
  });
  numberFormatterCache.set(maximumFractionDigits, formatter);
  return formatter;
};

export const parsePtBrNumber = (value: string | number | undefined | null) => {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return NaN;

  const sign = text.startsWith('-') ? '-' : '';
  const unsigned = text.replace(/^[+-]/, '');
  if (unsigned.includes(',')) {
    return Number(`${sign}${unsigned.replace(/\./g, '').replace(',', '.')}`);
  }

  const dotParts = unsigned.split('.');
  if (dotParts.length > 2 && dotParts.slice(1).every(part => part.length === 3)) {
    return Number(`${sign}${dotParts.join('')}`);
  }
  if (dotParts.length === 2 && dotParts[1].length === 3 && dotParts[0] !== '0') {
    return Number(`${sign}${dotParts[0]}${dotParts[1]}`);
  }

  return Number(`${sign}${unsigned}`);
};

export const formatPtBrNumberInput = (value: string, maximumFractionDigits = 3) => {
  if (!value.trim()) return '';
  const parsed = parsePtBrNumber(value);
  return Number.isFinite(parsed) ? getFormatter(maximumFractionDigits).format(parsed) : value;
};

export const formatPtBrCurrencyInput = (value: string) => {
  if (!value.trim()) return '';
  const parsed = parsePtBrNumber(value);
  if (!Number.isFinite(parsed)) return value;
  currencyFormatter ||= new Intl.NumberFormat('pt-BR', {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currencyFormatter.format(parsed);
};
