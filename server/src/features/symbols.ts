import { ProgramNode, StatementNode, CommandStatementNode, ScriptStatementNode } from '../parser/ast';

export const SymbolKind = {
    File: 1,
    Module: 2,
    Namespace: 3,
    Package: 4,
    Class: 5,
    Method: 6,
    Property: 7,
    Field: 8,
    Constructor: 9,
    Enum: 10,
    Interface: 11,
    Function: 12,
    Variable: 13,
    Constant: 14,
    String: 15,
    Number: 16,
    Boolean: 17,
    Array: 18,
    Object: 19,
    Key: 20,
    Null: 21,
    EnumMember: 22,
    Struct: 23,
    Event: 24,
    Operator: 25,
    TypeParameter: 26
} as const;

export type SymbolKind = typeof SymbolKind[keyof typeof SymbolKind];

export interface DocumentSymbol {
    name: string;
    detail?: string;
    kind: SymbolKind;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    selectionRange: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    children?: DocumentSymbol[];
}

export class DocumentSymbolProvider {
    public getSymbols(program: ProgramNode): DocumentSymbol[] {
        const rootSymbols: DocumentSymbol[] = [];
        let currentSection: DocumentSymbol | null = null;

        for (const stmt of program.statements) {
            if (stmt.kind === 'CommandStatement') {
                const cmd = stmt as CommandStatementNode;

                // Check if statement defines or changes section (starts with '/')
                if (cmd.isRoot && cmd.path.length > 0) {
                    const sectionName = '/' + cmd.path.join(' ');
                    const symbol: DocumentSymbol = {
                        name: sectionName,
                        detail: cmd.verb ? `${cmd.verb} ...` : undefined,
                        kind: SymbolKind.Namespace,
                        range: cmd.range,
                        selectionRange: cmd.range,
                        children: []
                    };

                    // If it also contains a verb & parameters in the same line (e.g. /ip address add address=...)
                    if (cmd.verb) {
                        const itemName = this.getItemName(cmd);
                        symbol.children?.push({
                            name: itemName,
                            detail: cmd.parameters.map(p => `${p.key}=${p.value}`).slice(0, 3).join(' '),
                            kind: SymbolKind.Struct,
                            range: cmd.range,
                            selectionRange: cmd.range
                        });
                    }

                    rootSymbols.push(symbol);
                    currentSection = symbol;
                    continue;
                }

                // If not starting with '/', it belongs to currentSection
                if (cmd.verb) {
                    const itemName = this.getItemName(cmd);
                    const itemSymbol: DocumentSymbol = {
                        name: itemName,
                        detail: cmd.parameters.map(p => `${p.key}=${p.value}`).slice(0, 3).join(' '),
                        kind: SymbolKind.Object,
                        range: cmd.range,
                        selectionRange: cmd.range
                    };

                    if (currentSection && currentSection.children) {
                        currentSection.children.push(itemSymbol);
                        // Extend range of current section
                        currentSection.range.end = cmd.range.end;
                    } else {
                        rootSymbols.push(itemSymbol);
                    }
                    continue;
                }
            }

            if (stmt.kind === 'ScriptStatement') {
                const script = stmt as ScriptStatementNode;
                const isFunction = script.body !== undefined;
                const name = script.variableName
                    ? `${script.keyword} $${script.variableName}`
                    : script.keyword;

                const symbol: DocumentSymbol = {
                    name,
                    detail: script.rawText.substring(0, 40),
                    kind: isFunction ? SymbolKind.Function : SymbolKind.Variable,
                    range: script.range,
                    selectionRange: script.range
                };

                if (currentSection && currentSection.children) {
                    currentSection.children.push(symbol);
                    currentSection.range.end = script.range.end;
                } else {
                    rootSymbols.push(symbol);
                }
            }
        }

        return rootSymbols;
    }

    private getItemName(cmd: CommandStatementNode): string {
        const verb = cmd.verb || 'item';
        // Try finding name=, address=, chain=, or comment=
        const nameParam = cmd.parameters.find(p => p.key === 'name');
        if (nameParam) return `${verb} ${nameParam.value}`;

        const addrParam = cmd.parameters.find(p => p.key === 'address' || p.key === 'dst-address');
        if (addrParam) return `${verb} ${addrParam.value}`;

        const chainParam = cmd.parameters.find(p => p.key === 'chain');
        const actionParam = cmd.parameters.find(p => p.key === 'action');
        if (chainParam && actionParam) return `${verb} ${chainParam.value} -> ${actionParam.value}`;

        const commentParam = cmd.parameters.find(p => p.key === 'comment');
        if (commentParam) return `${verb} (${commentParam.value})`;

        return verb;
    }
}

