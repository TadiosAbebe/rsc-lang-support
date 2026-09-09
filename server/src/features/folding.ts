export interface FoldingRange {
    startLine: number;
    endLine: number;
    kind?: 'comment' | 'region';
}

export class FoldingProvider {
    public getFoldingRanges(documentText: string): FoldingRange[] {
        const lines = documentText.split(/\r?\n/);
        const ranges: FoldingRange[] = [];

        // 1. Comment block folding
        let commentStart = -1;
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('#')) {
                if (commentStart === -1) {
                    commentStart = i;
                }
            } else {
                if (commentStart !== -1) {
                    if (i - 1 > commentStart) {
                        ranges.push({
                            startLine: commentStart,
                            endLine: i - 1,
                            kind: 'comment'
                        });
                    }
                    commentStart = -1;
                }
            }
        }
        if (commentStart !== -1 && lines.length - 1 > commentStart) {
            ranges.push({
                startLine: commentStart,
                endLine: lines.length - 1,
                kind: 'comment'
            });
        }

        // 2. Brace matching: { ... } and [ ... ]
        const braceStack: number[] = [];
        const bracketStack: number[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let inString = false;
            let escaped = false;

            for (let j = 0; j < line.length; j++) {
                const ch = line[j];
                if (ch === '#' && !inString && !escaped) break; // comment
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (ch === '\\') {
                    escaped = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (ch === '{') {
                        braceStack.push(i);
                    } else if (ch === '}') {
                        const start = braceStack.pop();
                        if (start !== undefined && i > start) {
                            ranges.push({
                                startLine: start,
                                endLine: i,
                                kind: 'region'
                            });
                        }
                    } else if (ch === '[') {
                        bracketStack.push(i);
                    } else if (ch === ']') {
                        const start = bracketStack.pop();
                        if (start !== undefined && i > start) {
                            ranges.push({
                                startLine: start,
                                endLine: i,
                                kind: 'region'
                            });
                        }
                    }
                }
            }
        }

        // 3. Section / Path folding: e.g. /ip firewall filter ... down to next /... or EOF
        const sectionStarts: { line: number; path: string }[] = [];
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
                // Ignore if inside a block or continuation
                sectionStarts.push({ line: i, path: trimmed });
            }
        }

        for (let s = 0; s < sectionStarts.length; s++) {
            const curr = sectionStarts[s];
            const next = sectionStarts[s + 1];
            const end = next ? next.line - 1 : lines.length - 1;

            // Find last non-empty line before next section
            let actualEnd = end;
            while (actualEnd > curr.line && lines[actualEnd].trim().length === 0) {
                actualEnd--;
            }

            if (actualEnd > curr.line) {
                ranges.push({
                    startLine: curr.line,
                    endLine: actualEnd,
                    kind: 'region'
                });
            }
        }

        return ranges;
    }
}

