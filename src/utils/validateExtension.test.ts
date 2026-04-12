import { describe, it, expect } from 'vitest';
import { validateExtension } from './validateExtension';

describe('validateExtension', () => {
  it('accepts lowercase .pdf extension', () => {
    expect(validateExtension('statement.pdf')).toBe(true);
  });

  it('accepts uppercase .PDF extension', () => {
    expect(validateExtension('statement.PDF')).toBe(true);
  });

  it('accepts mixed case .Pdf extension', () => {
    expect(validateExtension('statement.Pdf')).toBe(true);
  });

  it('rejects non-pdf extensions', () => {
    expect(validateExtension('statement.txt')).toBe(false);
    expect(validateExtension('statement.doc')).toBe(false);
    expect(validateExtension('statement.xlsx')).toBe(false);
  });

  it('rejects files with no extension', () => {
    expect(validateExtension('statement')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateExtension('')).toBe(false);
  });

  it('accepts filename that is just .pdf', () => {
    expect(validateExtension('.pdf')).toBe(true);
  });

  it('rejects .pdf appearing in the middle of the filename', () => {
    expect(validateExtension('file.pdf.txt')).toBe(false);
  });
});
