import * as path from 'path';
import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import { Formatter } from '../../server/src/features/formatter';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    // 1. Register direct in-process formatting provider for instant, zero-latency formatting
    const localFormatter = new Formatter();
    const formattingProvider: vscode.DocumentFormattingEditProvider = {
        provideDocumentFormattingEdits(document, options) {
            const text = document.getText();
            const config = vscode.workspace.getConfiguration('routeros');
            const indentSectionCommands = config.get<boolean>('format.indentSectionCommands', true);
            const insertEmptyLineBetweenSections = config.get<boolean>('format.insertEmptyLineBetweenSections', true);
            const tabSize = options.tabSize || 4;
            const insertSpaces = options.insertSpaces !== false;

            const formatted = localFormatter.format(text, {
                tabSize,
                insertSpaces,
                insertEmptyLineBetweenSections,
                indentSectionCommands
            });

            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );

            return [vscode.TextEdit.replace(fullRange, formatted)];
        }
    };

    const selectors: vscode.DocumentSelector = [
        { scheme: 'file', language: 'routeros' },
        { scheme: 'untitled', language: 'routeros' },
        { scheme: 'file', language: 'mikrotik' },
        { scheme: 'untitled', language: 'mikrotik' },
        { scheme: 'file', pattern: '**/*.rsc' },
        { scheme: 'untitled', pattern: '**/*.rsc' }
    ];

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(selectors, formattingProvider)
    );

    // 2. Start Language Server for completions, hover, outline, diagnostics, and folding
    const serverModule = context.asAbsolutePath(
        path.join('dist', 'server.js')
    );

    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: selectors,
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.rsc')
        }
    };

    client = new LanguageClient(
        'routerosLanguageServer',
        'MikroTik RouterOS Language Server',
        serverOptions,
        clientOptions
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('routeros.restartServer', async () => {
            if (client) {
                await client.stop();
                client.start();
                vscode.window.showInformationMessage('MikroTik RouterOS Language Server restarted.');
            }
        })
    );

    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
