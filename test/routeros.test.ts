import test from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { Lexer, TokenType } from '../server/src/parser/lexer';
import { Parser } from '../server/src/parser/parser';
import { Formatter } from '../server/src/features/formatter';
import { FoldingProvider } from '../server/src/features/folding';
import { DocumentSymbolProvider } from '../server/src/features/symbols';
import { DiagnosticsProvider } from '../server/src/features/diagnostics';
import { CompletionProvider } from '../server/src/features/completions';
import { HoverProvider } from '../server/src/features/hover';

test('Lexer: Tokenizes RouterOS export correctly', () => {
    const exportSample = fs.readFileSync('test-fixtures/export-sample.rsc', 'utf-8');
    const lexer = new Lexer(exportSample);
    const tokens = lexer.tokenize();

    assert.ok(tokens.length > 0, 'Should produce tokens');
    const commentTokens = tokens.filter(t => t.type === TokenType.Comment);
    assert.ok(commentTokens.length >= 2, 'Should detect comments');

    const pathTokens = tokens.filter(t => t.type === TokenType.Path);
    assert.ok(pathTokens.length >= 5, 'Should detect paths like /interface, /ip');

    const eqTokens = tokens.filter(t => t.type === TokenType.Equals);
    assert.ok(eqTokens.length > 10, 'Should detect property equals signs');
});

test('Parser: Parses AST with sections, verbs and parameters', () => {
    const exportSample = fs.readFileSync('test-fixtures/export-sample.rsc', 'utf-8');
    const parser = new Parser(exportSample);
    const ast = parser.parse();

    assert.strictEqual(ast.kind, 'Program');
    assert.ok(ast.statements.length > 0);

    const commands = ast.statements.filter(s => s.kind === 'CommandStatement');
    assert.ok(commands.length >= 10, `Expected at least 10 commands, got ${commands.length}`);

    // Check wireguard command
    const wg = commands.find(c => c.kind === 'CommandStatement' && c.parameters.some(p => p.key === 'name' && p.value === 'wg0'));
    assert.ok(wg, 'Should find wireguard interface command');
});

test('Parser: Parses scripts with nested blocks and loops', () => {
    const scriptSample = fs.readFileSync('test-fixtures/script-sample.rsc', 'utf-8');
    const parser = new Parser(scriptSample);
    const ast = parser.parse();

    assert.strictEqual(ast.kind, 'Program');
    const scripts = ast.statements.filter(s => s.kind === 'ScriptStatement');
    assert.ok(scripts.length >= 3, 'Should find script statements (:local, :global, :do, :foreach)');
});

test('Formatter: Idempotency and indentation', () => {
    const unformatted = fs.readFileSync('test-fixtures/unformatted.rsc', 'utf-8');
    const formatter = new Formatter();

    const formatted1 = formatter.format(unformatted, {
        tabSize: 4,
        insertSpaces: true,
        insertEmptyLineBetweenSections: true
    });

    // Formatting again should yield the exact same output (idempotent)
    const formatted2 = formatter.format(formatted1, {
        tabSize: 4,
        insertSpaces: true,
        insertEmptyLineBetweenSections: true
    });

    assert.strictEqual(formatted1, formatted2, 'Formatter must be idempotent');

    // Check section scope indentation: commands under /interface bridge and /ip firewall filter are indented
    assert.ok(formatted1.includes('    add name="bridge1"'), 'Command under /interface bridge should be indented by 1 level (4 spaces)');
    assert.ok(formatted1.includes('    add action=accept'), 'Command under /ip firewall filter should be indented by 1 level (4 spaces)');

    // Check multi-line indentation under section: section level (1) + continuation level (1) = 2 levels (8 spaces)
    assert.ok(formatted1.includes('        chain=input'), 'Continuation line in section should be indented by 2 levels (8 spaces)');

    // Check block indentation
    assert.ok(formatted1.includes('    :put "Test passed"'), 'Statements in block must be indented');
    assert.ok(formatted1.includes('        :put "Nested OK"'), 'Nested statements in block must be indented 2 levels');

    // Check property space normalization: "name = \"bridge1\"" -> "name=\"bridge1\""
    assert.ok(formatted1.includes('name="bridge1"'), 'Property spacing should be normalized');
});

test('Formatter: Indents declarations under command path scopes', () => {
    const input = `/ip/firewall/filter
add action=accept chain=input
add action=drop chain=input

/ip/address
add address=192.168.88.1/24 interface=bridge1`;

    const formatter = new Formatter();
    const formatted = formatter.format(input, {
        tabSize: 4,
        insertSpaces: true,
        indentSectionCommands: true
    });

    const expected = `/ip/firewall/filter
    add action=accept chain=input
    add action=drop chain=input

/ip/address
    add address=192.168.88.1/24 interface=bridge1
`;

    assert.strictEqual(formatted, expected, 'Declarations under /ip/firewall/filter must be indented 1 level');
});

test('Formatter: Preserves single-line config dumps without breaking them', () => {
    const exportSample = fs.readFileSync('test-fixtures/export-sample.rsc', 'utf-8');
    const formatter = new Formatter();
    const formatted = formatter.format(exportSample, {
        tabSize: 4,
        insertSpaces: true,
        insertEmptyLineBetweenSections: true
    });

    const lines = formatted.split('\n');
    const ipLine = lines.find(l => l.includes('add address=192.168.88.1/24'));
    assert.ok(ipLine, 'Single-line command must remain on a single line');
    assert.ok(!ipLine.includes('\n'), 'Must not split into multiple lines');
});

test('Folding: Accurately identifies blocks and sections', () => {
    const exportSample = fs.readFileSync('test-fixtures/export-sample.rsc', 'utf-8');
    const folding = new FoldingProvider();
    const ranges = folding.getFoldingRanges(exportSample);

    assert.ok(ranges.length > 0, 'Should find folding ranges');

    // Should find comment block folding
    const commentRanges = ranges.filter(r => r.kind === 'comment');
    assert.ok(commentRanges.length >= 1, 'Should fold initial comment block');

    // Should find section folding
    const sectionRanges = ranges.filter(r => r.kind === 'region');
    assert.ok(sectionRanges.length >= 5, 'Should fold configuration sections');
});

test('Document Symbols: Extracts outline tree', () => {
    const exportSample = fs.readFileSync('test-fixtures/export-sample.rsc', 'utf-8');
    const parser = new Parser(exportSample);
    const ast = parser.parse();

    const symbolProvider = new DocumentSymbolProvider();
    const symbols = symbolProvider.getSymbols(ast);

    assert.ok(symbols.length > 0, 'Should produce outline symbols');

    const fwSymbol = symbols.find(s => s.name === '/ip firewall filter');
    assert.ok(fwSymbol, 'Should find /ip firewall filter section symbol');
    assert.ok(fwSymbol.children && fwSymbol.children.length > 0, 'Section should have children rules');
});

test('Diagnostics: Catches unclosed quotes and brackets', () => {
    const diagnosticsProvider = new DiagnosticsProvider();

    const badCode = `
/ip address add address="192.168.1.1
:if (true do={
    :put "hello"
}
`;
    const diags = diagnosticsProvider.validate(badCode);
    assert.ok(diags.length >= 2, 'Should report unclosed quote and unclosed paren');
});

test('Completions: Provides contextual completions', () => {
    const compProvider = new CompletionProvider();

    // 1. Root menu completion
    const rootComps = compProvider.getCompletions('/', 0, 1);
    assert.ok(rootComps.some(c => c.label === 'ip'), 'Should suggest ip');
    assert.ok(rootComps.some(c => c.label === 'interface'), 'Should suggest interface');

    // 2. Submenu completion
    const ipComps = compProvider.getCompletions('/ip ', 0, 4);
    assert.ok(ipComps.some(c => c.label === 'firewall'), 'Should suggest firewall');
    assert.ok(ipComps.some(c => c.label === 'address'), 'Should suggest address');

    // 3. Script keyword completion
    const kwComps = compProvider.getCompletions(':', 0, 1);
    assert.ok(kwComps.some(c => c.label === ':if'), 'Should suggest :if');
    assert.ok(kwComps.some(c => c.label === ':foreach'), 'Should suggest :foreach');
});

test('Hover: Provides documentation on keywords and properties', () => {
    const hoverProvider = new HoverProvider();

    const kwHover = hoverProvider.getHover(':foreach item in=[/interface find] do={', 0, 3);
    assert.ok(kwHover, 'Should have hover for :foreach');
    assert.ok(kwHover.contents.value.includes('Iterate over array/list'), 'Should describe :foreach');

    const propHover = hoverProvider.getHover('add chain=input action=accept', 0, 6);
    assert.ok(propHover, 'Should have hover for chain');
    assert.ok(propHover.contents.value.includes('Firewall chain'), 'Should describe chain');
});
