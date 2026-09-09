import { Position, Range } from './ast';

export const TokenType = {
    Comment: 'Comment',
    Newline: 'Newline',
    LineContinuation: 'LineContinuation',
    Path: 'Path',
    ScriptKeyword: 'ScriptKeyword',
    Word: 'Word',
    String: 'String',
    Variable: 'Variable',
    Equals: 'Equals',
    LeftBrace: 'LeftBrace',
    RightBrace: 'RightBrace',
    LeftBracket: 'LeftBracket',
    RightBracket: 'RightBracket',
    LeftParen: 'LeftParen',
    RightParen: 'RightParen',
    Semicolon: 'Semicolon',
    Operator: 'Operator',
    Comma: 'Comma',
    Whitespace: 'Whitespace',
    EOF: 'EOF',
    Unknown: 'Unknown'
} as const;

export type TokenType = typeof TokenType[keyof typeof TokenType];

export interface Token {
    type: TokenType;
    value: string;
    range: Range;
}

export class Lexer {
    private source: string;
    private pos = 0;
    private line = 0;
    private col = 0;
    private len: number;

    constructor(source: string) {
        this.source = source;
        this.len = source.length;
    }

    private peek(offset = 0): string {
        const idx = this.pos + offset;
        return idx < this.len ? this.source[idx] : '';
    }

    private advance(): string {
        if (this.pos >= this.len) return '';
        const ch = this.source[this.pos++];
        if (ch === '\n') {
            this.line++;
            this.col = 0;
        } else {
            this.col++;
        }
        return ch;
    }

    private getPosition(): Position {
        return { line: this.line, character: this.col };
    }

    public tokenize(includeWhitespace = false): Token[] {
        const tokens: Token[] = [];

        while (this.pos < this.len) {
            const startPos = this.getPosition();
            const ch = this.peek();

            // Newline
            if (ch === '\r' && this.peek(1) === '\n') {
                this.advance();
                this.advance();
                tokens.push({
                    type: TokenType.Newline,
                    value: '\r\n',
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }
            if (ch === '\n') {
                this.advance();
                tokens.push({
                    type: TokenType.Newline,
                    value: '\n',
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }

            // Line continuation: \ followed by optional whitespace and newline
            if (ch === '\\') {
                let lookAhead = 1;
                while (this.peek(lookAhead) === ' ' || this.peek(lookAhead) === '\t') {
                    lookAhead++;
                }
                const nextCh = this.peek(lookAhead);
                if (nextCh === '\n' || nextCh === '\r' || nextCh === '') {
                    // Line continuation
                    let val = this.advance();
                    while (this.peek() === ' ' || this.peek() === '\t') {
                        val += this.advance();
                    }
                    if (this.peek() === '\r' && this.peek(1) === '\n') {
                        val += this.advance();
                        val += this.advance();
                    } else if (this.peek() === '\n') {
                        val += this.advance();
                    }
                    tokens.push({
                        type: TokenType.LineContinuation,
                        value: val,
                        range: { start: startPos, end: this.getPosition() }
                    });
                    continue;
                }
            }

            // Whitespace (horizontal)
            if (ch === ' ' || ch === '\t') {
                let val = '';
                while (this.peek() === ' ' || this.peek() === '\t') {
                    val += this.advance();
                }
                if (includeWhitespace) {
                    tokens.push({
                        type: TokenType.Whitespace,
                        value: val,
                        range: { start: startPos, end: this.getPosition() }
                    });
                }
                continue;
            }

            // Comment (# ...)
            if (ch === '#') {
                let val = '';
                while (this.pos < this.len && this.peek() !== '\n' && this.peek() !== '\r') {
                    val += this.advance();
                }
                tokens.push({
                    type: TokenType.Comment,
                    value: val,
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }

            // String ("...")
            if (ch === '"') {
                let val = this.advance();
                let escaped = false;
                while (this.pos < this.len) {
                    const c = this.peek();
                    if (escaped) {
                        val += this.advance();
                        escaped = false;
                    } else if (c === '\\') {
                        val += this.advance();
                        escaped = true;
                    } else if (c === '"') {
                        val += this.advance();
                        break;
                    } else if (c === '\n' || c === '\r') {
                        // Unclosed string on newline
                        break;
                    } else {
                        val += this.advance();
                    }
                }
                tokens.push({
                    type: TokenType.String,
                    value: val,
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }

            // Variable ($var, $"quoted")
            if (ch === '$') {
                let val = this.advance();
                if (this.peek() === '"') {
                    val += this.advance();
                    while (this.pos < this.len && this.peek() !== '"' && this.peek() !== '\n') {
                        val += this.advance();
                    }
                    if (this.peek() === '"') {
                        val += this.advance();
                    }
                } else {
                    while (this.pos < this.len && /[a-zA-Z0-9_-]/.test(this.peek())) {
                        val += this.advance();
                    }
                }
                tokens.push({
                    type: TokenType.Variable,
                    value: val,
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }

            // Script keyword or command starting with ':' (e.g. :if, :global, :set, :put)
            if (ch === ':' && /[a-zA-Z]/.test(this.peek(1))) {
                let val = this.advance();
                while (this.pos < this.len && /[a-zA-Z0-9_-]/.test(this.peek())) {
                    val += this.advance();
                }
                tokens.push({
                    type: TokenType.ScriptKeyword,
                    value: val,
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }

            // Single characters & delimiters
            if (ch === '{') {
                this.advance();
                tokens.push({ type: TokenType.LeftBrace, value: '{', range: { start: startPos, end: this.getPosition() } });
                continue;
            }
            if (ch === '}') {
                this.advance();
                tokens.push({ type: TokenType.RightBrace, value: '}', range: { start: startPos, end: this.getPosition() } });
                continue;
            }
            if (ch === '[') {
                this.advance();
                tokens.push({ type: TokenType.LeftBracket, value: '[', range: { start: startPos, end: this.getPosition() } });
                continue;
            }
            if (ch === ']') {
                this.advance();
                tokens.push({ type: TokenType.RightBracket, value: ']', range: { start: startPos, end: this.getPosition() } });
                continue;
            }
            if (ch === '(') {
                this.advance();
                tokens.push({ type: TokenType.LeftParen, value: '(', range: { start: startPos, end: this.getPosition() } });
                continue;
            }
            if (ch === ')') {
                this.advance();
                tokens.push({ type: TokenType.RightParen, value: ')', range: { start: startPos, end: this.getPosition() } });
                continue;
            }
            if (ch === ';') {
                this.advance();
                tokens.push({ type: TokenType.Semicolon, value: ';', range: { start: startPos, end: this.getPosition() } });
                continue;
            }
            if (ch === ',') {
                this.advance();
                tokens.push({ type: TokenType.Comma, value: ',', range: { start: startPos, end: this.getPosition() } });
                continue;
            }

            // Path starting with '/' (e.g. /ip/firewall or /interface or /)
            if (ch === '/' && (this.col === 0 || tokens.length === 0 || tokens[tokens.length - 1].type === TokenType.Newline || tokens[tokens.length - 1].type === TokenType.Semicolon || tokens[tokens.length - 1].type === TokenType.LeftBrace || tokens[tokens.length - 1].type === TokenType.LeftBracket)) {
                let val = this.advance();
                while (this.pos < this.len && /[a-zA-Z0-9_/-]/.test(this.peek())) {
                    val += this.advance();
                }
                tokens.push({
                    type: TokenType.Path,
                    value: val,
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }

            // Equals: = or ==
            if (ch === '=') {
                let val = this.advance();
                if (this.peek() === '=') {
                    val += this.advance();
                    tokens.push({ type: TokenType.Operator, value: val, range: { start: startPos, end: this.getPosition() } });
                } else {
                    tokens.push({ type: TokenType.Equals, value: val, range: { start: startPos, end: this.getPosition() } });
                }
                continue;
            }

            // Multi-char operators: !=, <=, >=, &&, ||, ~
            if (
                (ch === '!' && this.peek(1) === '=') ||
                (ch === '<' && this.peek(1) === '=') ||
                (ch === '>' && this.peek(1) === '=') ||
                (ch === '&' && this.peek(1) === '&') ||
                (ch === '|' && this.peek(1) === '|')
            ) {
                const val = this.advance() + this.advance();
                tokens.push({ type: TokenType.Operator, value: val, range: { start: startPos, end: this.getPosition() } });
                continue;
            }

            // Single-char operators
            if ('!<>~+*'.includes(ch)) {
                const val = this.advance();
                tokens.push({ type: TokenType.Operator, value: val, range: { start: startPos, end: this.getPosition() } });
                continue;
            }

            // Generic Word / Identifier / Value
            let word = '';
            while (
                this.pos < this.len &&
                !/[\s\r\n\t;=\[\]\{\}\(\)",#\\]/.test(this.peek())
            ) {
                word += this.advance();
            }

            if (word.length > 0) {
                tokens.push({
                    type: TokenType.Word,
                    value: word,
                    range: { start: startPos, end: this.getPosition() }
                });
                continue;
            }

            // Fallback for unhandled char
            const unknown = this.advance();
            tokens.push({
                type: TokenType.Unknown,
                value: unknown,
                range: { start: startPos, end: this.getPosition() }
            });
        }

        tokens.push({
            type: TokenType.EOF,
            value: '',
            range: { start: this.getPosition(), end: this.getPosition() }
        });

        return tokens;
    }
}

