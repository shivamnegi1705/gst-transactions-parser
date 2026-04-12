import { useState, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { validateExtension } from '../utils/validateExtension';
import { validateBankStatement } from '../utils/validateBankStatement';
import { useParseResult } from '../context/ParseResultContext';
import { parseBankStatement } from '../utils/parseBankStatement';
import type { ParseResult, ParseError } from '../types';

// Set up the PDF.js worker
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Extracts all text content from a PDF file using pdfjs-dist.
 * Uses Y-coordinate tracking to insert newlines when text moves to a new row.
 */
async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!('str' in item) || !('transform' in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = textItem.transform[5]; // Y-coordinate from transform matrix

      if (lastY !== null && Math.abs(y - lastY) > 2) {
        // Y changed significantly — new line
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = textItem.str;
      } else {
        currentLine += (currentLine ? ' ' : '') + textItem.str;
      }
      lastY = y;
    }
    // Push the last line
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    textParts.push(lines.join('\n'));
  }

  return textParts.join('\n');
}

export default function UploadPage() {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { setParseResult } = useParseResult();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    // Step 1: Extension validation
    if (!validateExtension(file.name)) {
      setError('Only PDF files are accepted. Please select a .pdf file.');
      // Reset the file input so the user can re-select
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);

    try {
      // Step 2: Extract text from PDF
      const pdfText = await extractPdfText(file);

      // Step 3: Validate bank statement structure
      const validation = validateBankStatement(pdfText);
      if (!validation.valid) {
        setError(validation.reason);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Step 4: Parse the extracted text
      const result: ParseResult = parseBankStatement(pdfText);

      // Step 5: Store result in context
      setParseResult(result);

      // Step 6: Navigate to processing page
      navigate('/processing');
    } catch (err) {
      // Handle ParseError objects (which have message + location) and standard Errors
      const parseErr = err as ParseError;
      const message = parseErr.message
        ? (parseErr.location ? `${parseErr.message} (at ${parseErr.location})` : parseErr.message)
        : 'An unexpected error occurred while processing the PDF.';
      setError(message);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="upload-page">
      <h1>GST Statement Processor</h1>
      <p>Upload a bank statement PDF to extract and view transactions.</p>

      <div className="upload-dropzone">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
          aria-label="Upload bank statement PDF"
        />
      </div>

      {isProcessing && <p className="processing-indicator">Processing PDF...</p>}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
