/**
 * Validates that a filename has a .pdf extension (case-insensitive).
 *
 * @param filename - The filename string to validate
 * @returns true if the filename ends with .pdf (case-insensitive), false otherwise
 */
export function validateExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}
