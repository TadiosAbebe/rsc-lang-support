export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export type ASTNodeKind =
    | 'Program'
    | 'CommandStatement'
    | 'ScriptStatement'
    | 'Block'
    | 'Parameter'
    | 'Comment'
    | 'EmptyLine';

export interface BaseNode {
    kind: ASTNodeKind;
    range: Range;
}

export interface ParameterNode extends BaseNode {
    kind: 'Parameter';
    key: string;
    value: string;
    raw: string;
}

export interface CommandStatementNode extends BaseNode {
    kind: 'CommandStatement';
    path: string[];
    verb?: string;
    parameters: ParameterNode[];
    isRoot: boolean; // starts with '/'
    isMultiline: boolean;
    rawText: string;
}

export interface ScriptStatementNode extends BaseNode {
    kind: 'ScriptStatement';
    keyword: string; // e.g. ":if", ":global", ":local", ":set", ":foreach"
    condition?: string;
    variableName?: string;
    body?: BlockNode;
    elseBody?: BlockNode;
    rawText: string;
}

export interface BlockNode extends BaseNode {
    kind: 'Block';
    statements: StatementNode[];
}

export interface CommentNode extends BaseNode {
    kind: 'Comment';
    text: string;
}

export interface EmptyLineNode extends BaseNode {
    kind: 'EmptyLine';
}

export type StatementNode =
    | CommandStatementNode
    | ScriptStatementNode
    | BlockNode
    | CommentNode
    | EmptyLineNode;

export interface ProgramNode extends BaseNode {
    kind: 'Program';
    statements: StatementNode[];
    comments: CommentNode[];
}

