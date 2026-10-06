const numberFormatterCache = new Map<number, Intl.NumberFormat>();
let currencyFormatter: Intl.NumberFormat | undefined;

type NumericInputValue = string | number | undefined | null;

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

export const parsePtBrNumber = (value: NumericInputValue) => {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return NaN;

  const sign = text.startsWith('-') ? '-' : '';
  const unsigned = text.replace(/^[+-]/, '');
  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');

  // Aceita os dois padrões de planilha: 1.234,56 e 1,234.56.
  // O último separador é o decimal quando ambos aparecem.
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIndex = Math.max(lastComma, lastDot);
    const integerPart = unsigned.slice(0, decimalIndex).replace(/[.,]/g, '');
    const fractionPart = unsigned.slice(decimalIndex + 1).replace(/[.,]/g, '');
    return Number(`${sign}${integerPart || '0'}.${fractionPart}`);
  }

  if (lastComma >= 0) {
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

const groupIntegerDigits = (value: string) => {
  const normalized = value.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatPtBrNumberWhileTyping = (value: string, maximumFractionDigits = 3) => {
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return '';

  const sign = text.startsWith('-') ? '-' : '';
  const unsigned = text.replace(/^[+-]/, '');
  let integerDigits = '';
  let fractionDigits = '';
  let hasDecimalSeparator = false;

  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);
  const dotParts = unsigned.split('.');
  const isGroupedDotValue = lastComma < 0
    && dotParts.length > 2
    && dotParts.slice(1).every(part => part.length === 3);

  if (isGroupedDotValue) {
    integerDigits = unsigned.replace(/\D/g, '');
  } else if (decimalIndex >= 0) {
    integerDigits = unsigned.slice(0, decimalIndex).replace(/\D/g, '');
    fractionDigits = unsigned.slice(decimalIndex + 1).replace(/\D/g, '');
    hasDecimalSeparator = true;
  } else {
    integerDigits = unsigned.replace(/\D/g, '');
  }

  if (!integerDigits && !hasDecimalSeparator) return '';
  const integerPart = groupIntegerDigits(integerDigits || '0');
  const fractionPart = fractionDigits.slice(0, Math.max(0, maximumFractionDigits));
  return `${sign}${integerPart}${hasDecimalSeparator ? `,${fractionPart}` : ''}`;
};

export const formatPtBrNumberInput = (value: NumericInputValue, maximumFractionDigits = 3) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '';
  const parsed = parsePtBrNumber(value);
  return Number.isFinite(parsed) ? getFormatter(maximumFractionDigits).format(parsed) : String(value);
};

export const formatPtBrCurrencyInput = (value: NumericInputValue) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '';
  const parsed = parsePtBrNumber(value);
  if (!Number.isFinite(parsed)) return String(value);
  currencyFormatter ||= new Intl.NumberFormat('pt-BR', {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currencyFormatter.format(parsed);
};
