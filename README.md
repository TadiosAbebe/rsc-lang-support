# MikroTik RouterOS Language Support

VS Code extension for MikroTik RouterOS configuration exports and scripts (`.rsc`, `.routeros`).

Provides offline syntax highlighting, document formatting, code folding, document symbols, autocompletion, and hover documentation.

## Features

### Syntax Highlighting
* Full tokenization for RouterOS commands, CLI paths, verbs, parameters, data types, and script keywords.
* Recognizes IPv4, CIDR notations, IPv6, MAC addresses, time intervals (`10s`, `1d`), booleans, strings with escapes, and line continuations (`\`).
* Bundles optional **MikroTik WinBox Dark** and **Light** color themes modeled after the WinBox terminal `/export` palette.

### Document Formatting
Formats `.rsc` files with command path scope awareness:
* Declarations under a command path are indented:
  ```routeros
  /ip/firewall/filter
      add action=accept chain=input comment="accept established"
      add action=drop chain=input comment="drop invalid"

  /ip/address
      add address=192.168.88.1/24 interface=bridge1
  ```
* Multi-line continued commands (ending in `\`) receive an additional level of indentation.
* Nested script blocks (`{ ... }`) are indented according to nesting depth.
* Property assignments are normalized (`key=value`) without touching quoted strings.
* Section headers (`/path`) are separated by a clean blank line.
* Preserves single-line configuration exports without wrapping.

Trigger with `Format Document` (`Shift+Alt+F` / `Ctrl+Shift+I`).

### Code Folding
* Folds configuration blocks under top-level paths (e.g. collapse entire `/ip firewall filter` or `/interface bridge`).
* Folds `{ ... }` blocks and multi-line bracket expressions `[ ... ]`.
* Folds contiguous `#` comment blocks.

### Outline & Document Symbols
The Outline view and Breadcrumbs show a hierarchical tree of your configuration:
* Sections (`/interface bridge`, `/ip firewall filter`, etc.) appear as namespaces.
* Individual rules and entries appear with their identifiers, names, or addresses.
* Script functions and stored variables appear as callable symbols.

### Autocompletion & Hover
* Suggests top-level CLI menus when typing `/`.
* Suggests sub-menus, command verbs (`add`, `set`, `remove`, `print`, etc.), and property names (`chain=`, `action=`, `address=`).
* Value completions for common flags (`action=`, `chain=`, `disabled=`, `protocol=`).
* Script keyword completion triggered by `:` (`:if`, `:foreach`, `:local`, `:global`, `:put`, `:log`, etc.).
* Hover over commands or keywords to view usage syntax and parameter descriptions.

### Snippets
Includes common snippets for rapid configuration:
* `wireguard-add` — Interface and peer setup
* `bridge-add` — Bridge creation and port assignment
* `ip-add` — IP address configuration
* `fw-est-rel` — Accept established/related firewall rule
* `fw-drop-invalid` — Drop invalid firewall rule
* `fw-nat-masq` — Source NAT masquerade rule
* `if-else` — Script conditional block
* `foreach` — Script iteration over items
* `do-catch` — Script error handling block
* `script-header` — Script template with logging

## Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `routeros.format.indentSize` | `4` | Number of spaces per indentation level. |
| `routeros.format.indentSectionCommands` | `true` | Indent declarations scoped under a command path. |
| `routeros.format.insertEmptyLineBetweenSections` | `true` | Insert a blank line between top-level sections. |
| `routeros.lint.enable` | `true` | Enable syntax error diagnostics (unclosed quotes, mismatched braces). |

## Development

```bash
# Install dependencies
npm install

# Run build
npm run build

# Run unit tests
npm test

# Package .vsix
npm run package
```

## License

[MIT](LICENSE)
