import {
    ProgramNode,
    StatementNode,
    CommandStatementNode,
    ScriptStatementNode,
    BlockNode,
    CommentNode,
    EmptyLineNode,
    ParameterNode,
    Range,
    Position
} from './ast';
import { Lexer, Token, TokenType } from './lexer';

export class Parser {
    private tokens: Token[] = [];
    private pos = 0;
    private comments: CommentNode[] = [];

    constructor(source: string) {
        const lexer = new Lexer(source);
        this.tokens = lexer.tokenize(false); // false = omit raw whitespace tokens
    }

    private peek(offset = 0): Token {
        const idx = this.pos + offset;
        return idx < this.tokens.length
            ? this.tokens[idx]
            : this.tokens[this.tokens.length - 1];
    }

    private advance(): Token {
        const tok = this.peek();
        if (this.pos < this.tokens.length - 1) {
            this.pos++;
        }
        return tok;
    }

    private check(type: TokenType): boolean {
        return this.peek().type === type;
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private skipNewlines() {
        while (this.check(TokenType.Newline)) {
            this.advance();
        }
    }

    public parse(): ProgramNode {
        const startPos: Position = { line: 0, character: 0 };
        const statements: StatementNode[] = [];

        while (!this.check(TokenType.EOF)) {
            if (this.check(TokenType.Newline)) {
                // Check if it's an empty line
                const nl = this.advance();
                statements.push({
                    kind: 'EmptyLine',
                    range: nl.range
                });
                continue;
            }

            if (this.check(TokenType.Comment)) {
                const tok = this.advance();
                const commentNode: CommentNode = {
                    kind: 'Comment',
                    text: tok.value,
                    range: tok.range
                };
                statements.push(commentNode);
                this.comments.push(commentNode);
                continue;
            }

            if (this.check(TokenType.LeftBrace)) {
                statements.push(this.parseBlock());
                continue;
            }

            if (this.check(TokenType.ScriptKeyword)) {
                statements.push(this.parseScriptStatement());
                continue;
            }

            // Command statement or path
            if (
                this.check(TokenType.Path) ||
                this.check(TokenType.Word) ||
                this.check(TokenType.LeftBracket)
            ) {
                statements.push(this.parseCommandStatement());
                continue;
            }

            // Semicolons or Stray tokens
            if (this.check(TokenType.Semicolon)) {
                this.advance();
                continue;
            }

            // Advance unknown / unrecognized
            this.advance();
        }

        const endPos = this.tokens.length > 0
            ? this.tokens[this.tokens.length - 1].range.end
            : startPos;

        return {
            kind: 'Program',
            range: { start: startPos, end: endPos },
            statements,
            comments: this.comments
        };
    }

    private parseBlock(): BlockNode {
        const openBrace = this.advance(); // consume '{'
        const statements: StatementNode[] = [];

        while (!this.check(TokenType.RightBrace) && !this.check(TokenType.EOF)) {
            if (this.check(TokenType.Newline)) {
                const nl = this.advance();
                statements.push({ kind: 'EmptyLine', range: nl.range });
                continue;
            }
            if (this.check(TokenType.Comment)) {
                const tok = this.advance();
                const comment: CommentNode = { kind: 'Comment', text: tok.value, range: tok.range };
                statements.push(comment);
                this.comments.push(comment);
                continue;
            }
            if (this.check(TokenType.LeftBrace)) {
                statements.push(this.parseBlock());
                continue;
            }
            if (this.check(TokenType.ScriptKeyword)) {
                statements.push(this.parseScriptStatement());
                continue;
            }
            if (this.check(TokenType.Semicolon)) {
                this.advance();
                continue;
            }
            statements.push(this.parseCommandStatement());
        }

        let endPos = openBrace.range.end;
        if (this.check(TokenType.RightBrace)) {
            const closeBrace = this.advance();
            endPos = closeBrace.range.end;
        }

        return {
            kind: 'Block',
            range: { start: openBrace.range.start, end: endPos },
            statements
        };
    }

    private parseScriptStatement(): ScriptStatementNode {
        const keywordTok = this.advance();
        const startPos = keywordTok.range.start;
        let endPos = keywordTok.range.end;
        let rawText = keywordTok.value;
        let condition: string | undefined;
        let variableName: string | undefined;
        let body: BlockNode | undefined;
        let elseBody: BlockNode | undefined;

        // Collect tokens until end of statement (newline or semicolon or block end)
        while (
            !this.check(TokenType.Newline) &&
            !this.check(TokenType.Semicolon) &&
            !this.check(TokenType.EOF)
        ) {
            // Check for variable in :local var or :global var or :set var
            if (
                (keywordTok.value === ':local' ||
                    keywordTok.value === ':global' ||
                    keywordTok.value === ':set') &&
                !variableName &&
                (this.check(TokenType.Word) || this.check(TokenType.Variable))
            ) {
                const varTok = this.advance();
                variableName = varTok.value.replace(/^\$/, '');
                rawText += ' ' + varTok.value;
                endPos = varTok.range.end;
                continue;
            }

            // Check for block do={ ... } or { ... }
            if (this.check(TokenType.LeftBrace)) {
                body = this.parseBlock();
                endPos = body.range.end;
                continue;
            }

            const tok = this.advance();
            rawText += ' ' + tok.value;
            endPos = tok.range.end;

            if (tok.type === TokenType.LineContinuation) {
                // continues on next line
                continue;
            }
        }

        if (this.check(TokenType.Semicolon)) {
            this.advance();
        }

        return {
            kind: 'ScriptStatement',
            keyword: keywordTok.value,
            condition,
            variableName,
            body,
            elseBody,
            rawText,
            range: { start: startPos, end: endPos }
        };
    }

    private parseCommandStatement(): CommandStatementNode {
        const startTok = this.peek();
        const startPos = startTok.range.start;
        let endPos = startTok.range.end;
        let isRoot = false;
        const path: string[] = [];
        let verb: string | undefined;
        const parameters: ParameterNode[] = [];
        let isMultiline = false;
        let rawParts: string[] = [];

        const KNOWN_VERBS = new Set([
            'add', 'set', 'remove', 'enable', 'disable',
            'print', 'export', 'find', 'get', 'monitor',
            'reset', 'edit', 'comment', 'move'
        ]);

        while (
            !this.check(TokenType.Newline) &&
            !this.check(TokenType.Semicolon) &&
            !this.check(TokenType.EOF)
        ) {
            if (this.check(TokenType.LineContinuation)) {
                isMultiline = true;
                this.advance();
                continue;
            }

            // Path element: e.g. /ip or /interface or sub-path
            if (this.check(TokenType.Path)) {
                const pathTok = this.advance();
                isRoot = true;
                const parts = pathTok.value.split('/').filter(p => p.length > 0);
                path.push(...parts);
                rawParts.push(pathTok.value);
                endPos = pathTok.range.end;
                continue;
            }

            // Sub-command path or verb or parameter
            if (this.check(TokenType.Word)) {
                const wordTok = this.peek();

                // Check if next token is '=' (then it is a parameter: key=val)
                if (this.peek(1).type === TokenType.Equals) {
                    const param = this.parseParameter();
                    parameters.push(param);
                    rawParts.push(param.raw);
                    endPos = param.range.end;
                    continue;
                }

                // If it is a known verb and we don't have one yet
                if (KNOWN_VERBS.has(wordTok.value) && !verb) {
                    verb = this.advance().value;
                    rawParts.push(verb);
                    endPos = wordTok.range.end;
                    continue;
                }

                // Otherwise, could be path segment (e.g. "/ip" then "firewall" then "filter")
                // if verb hasn't been set yet
                if (!verb && parameters.length === 0) {
                    path.push(this.advance().value);
                    rawParts.push(wordTok.value);
                    endPos = wordTok.range.end;
                    continue;
                }

                // Standalone flag/parameter (e.g. "disabled", "dynamic", "numbers=0")
                const consumed = this.advance();
                parameters.push({
                    kind: 'Parameter',
                    key: consumed.value,
                    value: 'yes',
                    raw: consumed.value,
                    range: consumed.range
                });
                rawParts.push(consumed.value);
                endPos = consumed.range.end;
                continue;
            }

            // Bracket expression [ ... ] inside command
            if (this.check(TokenType.LeftBracket)) {
                const bracketStart = this.advance();
                let bracketContent = bracketStart.value;
                let depth = 1;
                while (depth > 0 && !this.check(TokenType.EOF)) {
                    const tok = this.advance();
                    bracketContent += ' ' + tok.value;
                    if (tok.type === TokenType.LeftBracket) depth++;
                    if (tok.type === TokenType.RightBracket) depth--;
                    endPos = tok.range.end;
                }
                rawParts.push(bracketContent);
                continue;
            }

            // Consuming any other token in the command
            const other = this.advance();
            rawParts.push(other.value);
            endPos = other.range.end;
        }

        if (this.check(TokenType.Semicolon)) {
            this.advance();
        }

        return {
            kind: 'CommandStatement',
            path,
            verb,
            parameters,
            isRoot,
            isMultiline,
            rawText: rawParts.join(' '),
            range: { start: startPos, end: endPos }
        };
    }

    private parseParameter(): ParameterNode {
        const keyTok = this.advance(); // consumes word
        const eqTok = this.advance();  // consumes '='
        let value = '';
        let endPos = eqTok.range.end;

        // Check if value is string, word, variable, bracket expr, etc.
        if (
            this.check(TokenType.Word) ||
            this.check(TokenType.String) ||
            this.check(TokenType.Variable) ||
            this.check(TokenType.Operator)
        ) {
            const valTok = this.advance();
            value = valTok.value;
            endPos = valTok.range.end;
        } else if (this.check(TokenType.LeftBracket)) {
            const startBracket = this.advance();
            let bVal = startBracket.value;
            let depth = 1;
            while (depth > 0 && !this.check(TokenType.EOF)) {
                const tok = this.advance();
                bVal += (tok.type === TokenType.Newline ? '' : ' ') + tok.value;
                if (tok.type === TokenType.LeftBracket) depth++;
                if (tok.type === TokenType.RightBracket) depth--;
                endPos = tok.range.end;
            }
            value = bVal;
        } else if (this.check(TokenType.LeftBrace)) {
            const startBrace = this.advance();
            let bVal = startBrace.value;
            let depth = 1;
            while (depth > 0 && !this.check(TokenType.EOF)) {
                const tok = this.advance();
                bVal += ' ' + tok.value;
                if (tok.type === TokenType.LeftBrace) depth++;
                if (tok.type === TokenType.RightBrace) depth--;
                endPos = tok.range.end;
            }
            value = bVal;
        }

        return {
            kind: 'Parameter',
            key: keyTok.value,
            value,
            raw: `${keyTok.value}=${value}`,
            range: { start: keyTok.range.start, end: endPos }
        };
    }
}

