import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ParseResult } from '../types';

interface ParseResultContextValue {
  parseResult: ParseResult | null;
  setParseResult: (result: ParseResult | null) => void;
}

const ParseResultContext = createContext<ParseResultContextValue | undefined>(undefined);

export function ParseResultProvider({ children }: { children: ReactNode }) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  return (
    <ParseResultContext.Provider value={{ parseResult, setParseResult }}>
      {children}
    </ParseResultContext.Provider>
  );
}

export function useParseResult(): ParseResultContextValue {
  const context = useContext(ParseResultContext);
  if (!context) {
    throw new Error('useParseResult must be used within a ParseResultProvider');
  }
  return context;
}

export { ParseResultContext };
