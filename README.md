# FastTyping

FastTyping is a productivity extension for Visual Studio Code that helps you type faster by automatically replacing custom character sequences with predefined symbols or snippets — in real time as you type.

Whether you're coding or writing documentation, FastTyping helps reduce keystrokes and makes repetitive typing smoother.

## 💡 Example Use Case

- Typing `--` instantly becomes `->`
- Typing `;;` in a `.php` file becomes `.`

## 🚀 Features

- 🔁 Replaces character sequences live as you type
- 🧠 Language-aware (based on file extension, like `php`, `js`, etc.)
- ⚙️ Easily configurable through `settings.json`
- 🪶 Lightweight and intuitive

## ⚙️ Default Shortcuts

FastTyping comes with built-in default shortcuts, divided into common (global) and language-specific groups:

### 🔁 Common Shortcuts (applies to all file types)

| Typed | Result |
|-------|--------|
| `--`  | `->`   |
| `àà`  | `@`    |
| `ùù`  | `%`    |

### 🐘 PHP-Specific Shortcuts

| Typed | Result |
|-------|--------|
| `;;`  | `.`    |
| `**`  | `{}`   |

### 🟨 JavaScript-Specific Shortcuts

| Typed | Result |
|-------|--------|
| `cl`  | `console.log()` |
| `fn`  | `function() {\n  \n}` |

---

## 🛠️ Customizing Shortcuts

You can fully customize the shortcuts through your **VS Code User Settings** (`settings.json`).

### 👉 Steps:
1. Open the Command Palette with `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Search for and select: **Preferences: Open Settings (JSON)** or **FastTyping: Open Extension Configuration**
3. Add or modify your configuration under the following key:

```json
"fasttyping.shortcuts": {
  "common": {
    "--": "->",
    "àà": "@",
    "ùù": "%",
    ">>": "→"
  },
  "php": {
    ";;": ".",
    "**": "{}"
  },
  "js": {
    "cl": "console.log()",
    "fn": "function() {\n  \n}"
  }
}
```
You can override, add or remove any shortcut per language or globally under "common".

### ❌ To disable a default shortcut

To disable a default shortcut, simply remove its entry from the configuration.
For example, to disable the `--` shortcut in the common group and the `;;` shortcut for PHP:

```json
"fasttyping.shortcuts": {
  "common": {
    // "--" has been removed
    "àà": "@",
    "ùù": "%"
  },
  "php": {
    // ";;" has been removed
    "**": "{}"
  }
}
```
Once removed, FastTyping will no longer trigger those shortcuts.

---

## ⚙️ Configuration Options

### `fasttyping.maxShortcutLength`

Control the maximum length of shortcuts FastTyping will detect and replace.

```json
"fasttyping.maxShortcutLength": 10
```

- **Default**: `10`
- **Min**: `1` (single character shortcuts only)
- **Max**: `50`
- **Example**: Set to `15` to support long shortcuts like `asyncfunction`

---

## 📌 Important Notes

- **User Configuration Priority**: If you define any custom shortcuts in your settings, FastTyping will use **only your configuration** and ignore the built-in defaults. If you want to keep some defaults, you must explicitly include them in your settings.
- **File Extension Matching**: Language-specific shortcuts are matched based on file extension (e.g., `.js`, `.php`). The scope is determined by the file's extension, and scope-specific shortcuts take priority over common shortcuts.
- **Buffer Persistence**: FastTyping maintains a character buffer while you type normally. The buffer resets when you click elsewhere or move the cursor without typing, ensuring accurate shortcut detection for multi-character patterns.

---

## 🐛 Issues and Contributions

Don't hesitate to open an issue if you find a bug.

## Release Notes

For more information, please see [CHANGELOG.md](CHANGELOG.md)