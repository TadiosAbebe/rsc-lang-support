export const DiagnosticSeverity = {
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4
} as const;

export type DiagnosticSeverity = typeof DiagnosticSeverity[keyof typeof DiagnosticSeverity];

export interface Diagnostic {
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    severity: DiagnosticSeverity;
    message: string;
    source: string;
}

export class DiagnosticsProvider {
    public validate(documentText: string): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];
        const lines = documentText.split(/\r?\n/);

        const braceStack: { line: number; char: number; ch: string }[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let inString = false;
            let stringStartChar = 0;
            let escaped = false;

            for (let j = 0; j < line.length; j++) {
                const ch = line[j];

                if (escaped) {
                    escaped = false;
                    continue;
                }

                if (ch === '\\') {
                    escaped = true;
                    // Check if backslash is at end of line (continuation)
                    const rest = line.substring(j + 1);
                    if (rest.trim().length > 0 && !inString) {
                        diagnostics.push({
                            range: {
                                start: { line: i, character: j },
                                end: { line: i, character: j + 1 }
                            },
                            severity: DiagnosticSeverity.Warning,
                            message: 'Trailing characters after backslash (\\). In RouterOS, line continuation backslash should be followed immediately by newline.',
                            source: 'RouterOS'
                        });
                    }
                    continue;
                }

                if (ch === '"') {
                    if (!inString) {
                        inString = true;
                        stringStartChar = j;
                    } else {
                        inString = false;
                    }
                    continue;
                }

                if (inString) {
                    continue;
                }

                // Comment terminates line analysis
                if (ch === '#') {
                    break;
                }

                // Track delimiters
                if (ch === '{' || ch === '[' || ch === '(') {
                    braceStack.push({ line: i, char: j, ch });
                } else if (ch === '}' || ch === ']' || ch === ')') {
                    if (braceStack.length === 0) {
                        diagnostics.push({
                            range: {
                                start: { line: i, character: j },
                                end: { line: i, character: j + 1 }
                            },
                            severity: DiagnosticSeverity.Error,
                            message: `Unmatched closing delimiter '${ch}'`,
                            source: 'RouterOS'
                        });
                    } else {
                        const top = braceStack.pop()!;
                        const matching =
                            (top.ch === '{' && ch === '}') ||
                            (top.ch === '[' && ch === ']') ||
                            (top.ch === '(' && ch === ')');
                        if (!matching) {
                            diagnostics.push({
                                range: {
                                    start: { line: i, character: j },
                                    end: { line: i, character: j + 1 }
                                },
                                severity: DiagnosticSeverity.Error,
                                message: `Mismatched delimiter: expected closing for '${top.ch}' but found '${ch}'`,
                                source: 'RouterOS'
                            });
                        }
                    }
                }
            }

            // Unclosed string at newline (unless line ends with \)
            if (inString && !line.trim().endsWith('\\')) {
                diagnostics.push({
                    range: {
                        start: { line: i, character: stringStartChar },
                        end: { line: i, character: line.length }
                    },
                    severity: DiagnosticSeverity.Error,
                    message: 'Unterminated string literal. Strings must be closed with a double quote (") before newline unless continued with backslash (\\).',
                    source: 'RouterOS'
                });
            }
        }

        // Unclosed open braces/brackets
        while (braceStack.length > 0) {
            const top = braceStack.pop()!;
            diagnostics.push({
                range: {
                    start: { line: top.line, character: top.char },
                    end: { line: top.line, character: top.char + 1 }
                },
                severity: DiagnosticSeverity.Error,
                message: `Unclosed delimiter '${top.ch}'`,
                source: 'RouterOS'
            });
        }

        return diagnostics;
    }
}

