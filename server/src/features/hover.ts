import {
    ROUTEROS_MENU_TREE,
    COMMON_VERBS,
    SCRIPT_KEYWORDS,
    COMMON_PROPERTIES
} from '../schema/routeros-schema';

export interface Hover {
    contents: {
        kind: 'markdown';
        value: string;
    };
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
}

export class HoverProvider {
    public getHover(documentText: string, line: number, character: number): Hover | null {
        const lines = documentText.split(/\r?\n/);
        const currentLine = lines[line];
        if (!currentLine) return null;

        // Find the word under cursor
        const wordRange = this.getWordAt(currentLine, character);
        if (!wordRange) return null;

        const word = wordRange.word;

        // 1. Script Keyword (e.g. :if, :local, :global, :set)
        if (SCRIPT_KEYWORDS[word]) {
            return {
                contents: {
                    kind: 'markdown',
                    value: `### RouterOS Script Keyword: \`${word}\`\n\n${SCRIPT_KEYWORDS[word]}`
                }
            };
        }

        // 2. Command verb (add, set, remove, etc.)
        if (COMMON_VERBS[word]) {
            return {
                contents: {
                    kind: 'markdown',
                    value: `### RouterOS Command: \`${word}\`\n\n${COMMON_VERBS[word]}`
                }
            };
        }

        // 3. Property name (e.g. chain, action, address)
        const cleanProp = word.replace(/=$/, '');
        if (COMMON_PROPERTIES[cleanProp]) {
            return {
                contents: {
                    kind: 'markdown',
                    value: `### Property: \`${cleanProp}\`\n\n${COMMON_PROPERTIES[cleanProp]}`
                }
            };
        }

        // 4. Root menu
        const cleanMenu = word.replace(/^\//, '');
        if (ROUTEROS_MENU_TREE[cleanMenu]) {
            return {
                contents: {
                    kind: 'markdown',
                    value: `### Menu: \`/${cleanMenu}\`\n\n${ROUTEROS_MENU_TREE[cleanMenu].description}`
                }
            };
        }

        return null;
    }

    private getWordAt(line: string, character: number): { word: string; start: number; end: number } | null {
        if (character < 0 || character > line.length) return null;

        // Find word boundary including :, /, - (excluding =)
        let start = character;
        while (start > 0 && /[\w:\/\-]/.test(line[start - 1])) {
            start--;
        }

        let end = character;
        while (end < line.length && /[\w:\/\-]/.test(line[end])) {
            end++;
        }

        if (start === end) return null;

        return {
            word: line.substring(start, end),
            start,
            end
        };
    }
}
