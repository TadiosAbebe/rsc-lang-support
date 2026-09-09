import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    InitializeResult,
    TextDocumentSyncKind,
    TextEdit,
    Range,
    Position,
    FoldingRangeKind,
    DocumentSymbol as LspDocumentSymbol
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Parser } from './parser/parser';
import { Formatter } from './features/formatter';
import { FoldingProvider } from './features/folding';
import { DocumentSymbolProvider } from './features/symbols';
import { DiagnosticsProvider } from './features/diagnostics';
import { CompletionProvider } from './features/completions';
import { HoverProvider } from './features/hover';

// Create a connection for the server using Node's IPC
const connection = createConnection(ProposedFeatures.all);

// Text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const formatter = new Formatter();
const foldingProvider = new FoldingProvider();
const symbolProvider = new DocumentSymbolProvider();
const diagnosticsProvider = new DiagnosticsProvider();
const completionProvider = new CompletionProvider();
const hoverProvider = new HoverProvider();

connection.onInitialize((params: InitializeParams): InitializeResult => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            documentFormattingProvider: true,
            foldingRangeProvider: true,
            documentSymbolProvider: true,
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ['/', ':', '=', ' ']
            },
            hoverProvider: true
        }
    };
});

// Document validation / diagnostics
function validateDocument(document: TextDocument): void {
    const text = document.getText();
    const rawDiagnostics = diagnosticsProvider.validate(text);

    const diagnostics = rawDiagnostics.map(d => ({
        range: Range.create(
            Position.create(d.range.start.line, d.range.start.character),
            Position.create(d.range.end.line, d.range.end.character)
        ),
        severity: d.severity,
        message: d.message,
        source: d.source
    }));

    connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

documents.onDidChangeContent(change => {
    validateDocument(change.document);
});

documents.onDidOpen(event => {
    validateDocument(event.document);
});

// Document formatting handler
connection.onDocumentFormatting((params): TextEdit[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const formatted = formatter.format(text, {
        tabSize: params.options.tabSize,
        insertSpaces: params.options.insertSpaces,
        insertEmptyLineBetweenSections: true,
        indentSectionCommands: true
    });

    const fullRange = Range.create(
        Position.create(0, 0),
        document.positionAt(text.length)
    );

    return [TextEdit.replace(fullRange, formatted)];
});

// Folding range handler
connection.onFoldingRanges((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const ranges = foldingProvider.getFoldingRanges(text);

    return ranges.map(r => ({
        startLine: r.startLine,
        endLine: r.endLine,
        kind: r.kind === 'comment' ? FoldingRangeKind.Comment : FoldingRangeKind.Region
    }));
});

// Document symbols (Outline view)
connection.onDocumentSymbol((params): LspDocumentSymbol[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const parser = new Parser(text);
    const ast = parser.parse();

    const symbols = symbolProvider.getSymbols(ast);

    function toLspSymbol(s: any): LspDocumentSymbol {
        return {
            name: s.name,
            detail: s.detail,
            kind: s.kind,
            range: Range.create(
                Position.create(s.range.start.line, s.range.start.character),
                Position.create(s.range.end.line, s.range.end.character)
            ),
            selectionRange: Range.create(
                Position.create(s.selectionRange.start.line, s.selectionRange.start.character),
                Position.create(s.selectionRange.end.line, s.selectionRange.end.character)
            ),
            children: s.children ? s.children.map(toLspSymbol) : undefined
        };
    }

    return symbols.map(toLspSymbol);
});

// Auto-completion
connection.onCompletion((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    return completionProvider.getCompletions(text, params.position.line, params.position.character);
});

// Hover documentation
connection.onHover((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    return hoverProvider.getHover(text, params.position.line, params.position.character);
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

