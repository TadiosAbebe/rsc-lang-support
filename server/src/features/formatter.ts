export interface FormattingOptions {
    tabSize: number;
    insertSpaces: boolean;
    insertEmptyLineBetweenSections?: boolean;
    indentSectionCommands?: boolean;
}

export class Formatter {
    public format(documentText: string, options: FormattingOptions): string {
        const indentUnit = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
        const lines = documentText.split(/\r?\n/);
        const result: string[] = [];

        const indentSectionCommands = options.indentSectionCommands !== false;

        let braceDepth = 0;
        let isContinuingLine = false;
        let previousWasEmpty = false;
        let previousWasCommandOrBlock = false;
        let inSectionScope = false;

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const trimmed = rawLine.trim();

            // Handle empty line
            if (trimmed.length === 0) {
                if (!previousWasEmpty && result.length > 0) {
                    result.push('');
                    previousWasEmpty = true;
                }
                continue;
            }

            // Check if line closes a brace at start, e.g. } or } else={
            let currentLineDepth = braceDepth;
            const startsWithClosingBrace = /^[\}\]]/.test(trimmed);
            if (startsWithClosingBrace && currentLineDepth > 0) {
                currentLineDepth--;
            }

            const isPathLine = trimmed.startsWith('/') && !trimmed.startsWith('//') && braceDepth === 0;

            // Check if line is a comment that acts as header for the upcoming section
            let isHeaderComment = false;
            if (trimmed.startsWith('#') && braceDepth === 0) {
                for (let k = i + 1; k < lines.length; k++) {
                    const nextTrimmed = lines[k].trim();
                    if (nextTrimmed.length === 0) continue;
                    if (nextTrimmed.startsWith('/') && !nextTrimmed.startsWith('//')) {
                        isHeaderComment = true;
                    }
                    break;
                }
            }

            // Top-level section spacing: if option enabled and line starts with '/'
            if (
                options.insertEmptyLineBetweenSections &&
                isPathLine &&
                previousWasCommandOrBlock &&
                !previousWasEmpty &&
                currentLineDepth === 0
            ) {
                result.push('');
            }

            // Calculate indentation
            let indentLevel = 0;
            if (isPathLine) {
                // Section header paths always start at indent 0
                indentLevel = 0;
            } else if (isHeaderComment) {
                // Comments preceding a top-level path start at indent 0
                indentLevel = 0;
            } else {
                let sectionIndent = (inSectionScope && indentSectionCommands) ? 1 : 0;
                indentLevel = sectionIndent + currentLineDepth;
                if (isContinuingLine) {
                    indentLevel += 1; // indent multi-line continuation lines by 1 additional level
                }
            }

            const indent = indentUnit.repeat(Math.max(0, indentLevel));

            // Format line content:
            // Normalize property spacing: e.g. "key = val" -> "key=val", but preserve inside quotes
            const formattedLine = this.normalizeLine(trimmed);

            result.push(indent + formattedLine);

            // Update state for next lines
            previousWasEmpty = false;
            previousWasCommandOrBlock = isPathLine || trimmed.endsWith('}') || trimmed.startsWith('add') || trimmed.startsWith('set');

            if (isPathLine) {
                if (trimmed === '/') {
                    inSectionScope = false;
                } else {
                    inSectionScope = true;
                }
            }

            // Count change in braces outside of quotes and comments
            const { openBraces, closeBraces, endsWithContinuation } = this.analyzeLine(trimmed);
            braceDepth += openBraces - closeBraces;
            if (braceDepth < 0) braceDepth = 0;

            isContinuingLine = endsWithContinuation;
        }

        // Return formatted text with trailing newline
        return result.join('\n') + '\n';
    }

    private analyzeLine(line: string): { openBraces: number; closeBraces: number; endsWithContinuation: boolean } {
        let openBraces = 0;
        let closeBraces = 0;
        let inString = false;
        let escaped = false;
        let inComment = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];

            if (inComment) {
                break;
            }

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
                if (ch === '#') {
                    inComment = true;
                    continue;
                }
                if (ch === '{') {
                    openBraces++;
                } else if (ch === '}') {
                    closeBraces++;
                }
            }
        }

        // Check if line ends with '\' (outside quotes/comments)
        const endsWithContinuation = /\\[ \t]*$/.test(line) && !inString && !inComment;

        return { openBraces, closeBraces, endsWithContinuation };
    }

    private normalizeLine(line: string): string {
        // Normalize "key = value" to "key=value" outside of quotes and comments
        let result = '';
        let inString = false;
        let escaped = false;
        let i = 0;

        while (i < line.length) {
            const ch = line[i];

            if (ch === '#' && !inString && !escaped) {
                // Rest of the line is a comment, preserve as is
                result += line.substring(i);
                break;
            }

            if (escaped) {
                result += ch;
                escaped = false;
                i++;
                continue;
            }

            if (ch === '\\') {
                result += ch;
                escaped = true;
                i++;
                continue;
            }

            if (ch === '"') {
                inString = !inString;
                result += ch;
                i++;
                continue;
            }

            if (!inString) {
                // Collapse multiple spaces/tabs into a single space
                if (ch === ' ' || ch === '\t') {
                    while (i + 1 < line.length && (line[i + 1] === ' ' || line[i + 1] === '\t')) {
                        i++;
                    }
                    result += ' ';
                    i++;
                    continue;
                }

                // Check for ' = ' or ' = ' pattern for properties (not ==, !=, <=, >=)
                if (ch === '=' && line[i - 1] !== '=' && line[i + 1] !== '=' && line[i - 1] !== '!' && line[i - 1] !== '<' && line[i - 1] !== '>') {
                    // Remove trailing spaces before '=' in result
                    result = result.replace(/[ \t]+$/, '');
                    result += '=';
                    // Skip leading spaces after '='
                    i++;
                    while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
                        i++;
                    }
                    continue;
                }
            }

            result += ch;
            i++;
        }

        return result;
    }
}
