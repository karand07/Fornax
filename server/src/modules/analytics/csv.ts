/**
 * Neutralizes spreadsheet formula injection risks and formats a matrix of strings into RFC 4180 compliant CSV.
 * - If a cell text starts with '=', '+', '-', '@', '\t', or '\r', prefixes it with a single quote.
 * - Wraps fields in double quotes if they contain quotes, commas, or newlines.
 * - Doubles inner quotes per RFC 4180.
 * - Uses CRLF (\r\n) line endings.
 * - Prepends UTF-8 BOM (\uFEFF) so Excel opens UTF-8 characters properly.
 */
export function sanitizeCell(cell: string): string {
  if (typeof cell !== 'string') {
    cell = String(cell ?? '');
  }

  // Formula injection neutralization: =, +, -, @, \t, \r
  // Check if first character is dangerous
  if (
    cell.startsWith('=') ||
    cell.startsWith('+') ||
    cell.startsWith('-') ||
    cell.startsWith('@') ||
    cell.startsWith('\t') ||
    cell.startsWith('\r')
  ) {
    cell = `'${cell}`;
  }

  // RFC 4180 escaping: wrap in quotes if contains comma, quote, or newline
  if (
    cell.includes('"') ||
    cell.includes(',') ||
    cell.includes('\n') ||
    cell.includes('\r')
  ) {
    return `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
}

export function toCsv(rows: string[][]): string {
  const BOM = '\uFEFF';
  const csvBody = rows
    .map((row) => row.map((cell) => sanitizeCell(cell)).join(','))
    .join('\r\n');

  return BOM + csvBody + (rows.length > 0 ? '\r\n' : '');
}
