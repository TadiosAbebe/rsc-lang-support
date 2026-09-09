import {
    ROUTEROS_MENU_TREE,
    COMMON_VERBS,
    SCRIPT_KEYWORDS,
    COMMON_PROPERTIES,
    MenuItem
} from '../schema/routeros-schema';

export const CompletionItemKind = {
    Text: 1,
    Method: 2,
    Function: 3,
    Constructor: 4,
    Field: 5,
    Variable: 6,
    Class: 7,
    Interface: 8,
    Module: 9,
    Property: 10,
    Unit: 11,
    Value: 12,
    Enum: 13,
    Keyword: 14,
    Snippet: 15,
    Color: 16,
    File: 17,
    Reference: 18,
    Folder: 19,
    EnumMember: 20,
    Constant: 21,
    Struct: 22,
    Event: 23,
    Operator: 24,
    TypeParameter: 25
} as const;

export type CompletionItemKind = typeof CompletionItemKind[keyof typeof CompletionItemKind];

export interface CompletionItem {
    label: string;
    kind: CompletionItemKind;
    detail?: string;
    documentation?: string;
    insertText?: string;
}

export class CompletionProvider {
    public getCompletions(documentText: string, line: number, character: number): CompletionItem[] {
        const lines = documentText.split(/\r?\n/);
        const currentLine = lines[line] || '';
        const textBeforeCursor = currentLine.substring(0, character);
        const trimmedBefore = textBeforeCursor.trim();

        const items: CompletionItem[] = [];

        // 1. If line starts with or triggers script keyword ':'
        if (textBeforeCursor.endsWith(':') || /(^|\s)\:[a-zA-Z]*$/.test(textBeforeCursor)) {
            for (const [kw, doc] of Object.entries(SCRIPT_KEYWORDS)) {
                items.push({
                    label: kw,
                    kind: CompletionItemKind.Keyword,
                    detail: 'RouterOS Script Keyword',
                    documentation: doc,
                    insertText: kw.startsWith(':') && textBeforeCursor.endsWith(':') ? kw.substring(1) : kw
                });
            }
            return items;
        }

        // 2. If line starts with '/'
        if (textBeforeCursor.trimStart().startsWith('/')) {
            const pathSegments = textBeforeCursor.trimStart().substring(1).split(/[\s/]+/);
            // Current segment being typed
            const isTypingNew = textBeforeCursor.endsWith(' ') || textBeforeCursor.endsWith('/');
            const segments = isTypingNew ? pathSegments.filter(s => s.length > 0) : pathSegments.slice(0, -1).filter(s => s.length > 0);

            // Traverse menu tree
            let currentMenu: Record<string, MenuItem> | undefined = ROUTEROS_MENU_TREE;
            let lastItem: MenuItem | undefined;

            for (const seg of segments) {
                if (currentMenu && currentMenu[seg]) {
                    lastItem = currentMenu[seg];
                    currentMenu = currentMenu[seg].submenus;
                } else {
                    currentMenu = undefined;
                    break;
                }
            }

            if (currentMenu) {
                // Suggest submenus
                for (const [name, menu] of Object.entries(currentMenu)) {
                    items.push({
                        label: name,
                        kind: CompletionItemKind.Module,
                        detail: `Menu: /${segments.concat(name).join(' ')}`,
                        documentation: menu.description
                    });
                }
            }

            if (lastItem) {
                // Suggest verbs
                const verbs = lastItem.verbs || Object.keys(COMMON_VERBS);
                for (const verb of verbs) {
                    items.push({
                        label: verb,
                        kind: CompletionItemKind.Function,
                        detail: `Command: ${verb}`,
                        documentation: COMMON_VERBS[verb] || 'Command verb'
                    });
                }

                // Suggest properties
                if (lastItem.properties) {
                    for (const [prop, desc] of Object.entries(lastItem.properties)) {
                        items.push({
                            label: `${prop}=`,
                            kind: CompletionItemKind.Property,
                            detail: `Property: ${prop}`,
                            documentation: desc,
                            insertText: `${prop}=`
                        });
                    }
                }
            }

            // Always add common properties if we are after a verb
            if (segments.length > 0) {
                for (const [prop, desc] of Object.entries(COMMON_PROPERTIES)) {
                    if (!items.some(i => i.label === `${prop}=`)) {
                        items.push({
                            label: `${prop}=`,
                            kind: CompletionItemKind.Property,
                            detail: `Common Property: ${prop}`,
                            documentation: desc,
                            insertText: `${prop}=`
                        });
                    }
                }
            }

            return items;
        }

        // 3. Property values auto-completion: e.g. action=, chain=, protocol=, disabled=
        if (/action=\w*$/.test(textBeforeCursor)) {
            const actions = ['accept', 'drop', 'reject', 'masquerade', 'src-nat', 'dst-nat', 'redirect', 'fasttrack-connection', 'log', 'passthrough', 'jump'];
            return actions.map(act => ({
                label: act,
                kind: CompletionItemKind.Value,
                detail: `Action: ${act}`
            }));
        }

        if (/chain=\w*$/.test(textBeforeCursor)) {
            const chains = ['input', 'forward', 'output', 'srcnat', 'dstnat', 'prerouting', 'postrouting'];
            return chains.map(c => ({
                label: c,
                kind: CompletionItemKind.Value,
                detail: `Chain: ${c}`
            }));
        }

        if (/disabled=\w*$/.test(textBeforeCursor)) {
            return [
                { label: 'yes', kind: CompletionItemKind.Value, detail: 'Disabled: yes' },
                { label: 'no', kind: CompletionItemKind.Value, detail: 'Disabled: no' }
            ];
        }

        if (/protocol=\w*$/.test(textBeforeCursor)) {
            const protos = ['tcp', 'udp', 'icmp', 'gre', 'esp', 'ipip', 'vrrp', 'ospf'];
            return protos.map(p => ({
                label: p,
                kind: CompletionItemKind.Value,
                detail: `Protocol: ${p}`
            }));
        }

        // 4. Default: suggest top-level paths, common verbs, script keywords
        for (const [name, menu] of Object.entries(ROUTEROS_MENU_TREE)) {
            items.push({
                label: `/${name}`,
                kind: CompletionItemKind.Module,
                detail: `Root Menu: /${name}`,
                documentation: menu.description
            });
        }

        for (const [verb, desc] of Object.entries(COMMON_VERBS)) {
            items.push({
                label: verb,
                kind: CompletionItemKind.Function,
                detail: `Command: ${verb}`,
                documentation: desc
            });
        }

        for (const [kw, doc] of Object.entries(SCRIPT_KEYWORDS)) {
            items.push({
                label: kw,
                kind: CompletionItemKind.Keyword,
                detail: 'RouterOS Script Keyword',
                documentation: doc
            });
        }

        return items;
    }
}

