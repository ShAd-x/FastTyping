import * as vscode from "vscode";
import { ConfigManager } from "./config";
import { ShortcutEngine } from "./shortcutEngine";

/**
 * Main extension entry point.
 * Orchestrates configuration management and shortcut detection.
 * Handles VS Code event listeners and UI interactions.
 */

let configManager: ConfigManager;
let shortcutEngine: ShortcutEngine;
let currentFileLanguage: string = "";
let lastProcessedCursorOffset: number = 0;

export function activate(context: vscode.ExtensionContext) {
  // Initialize configuration and shortcut engine
  configManager = new ConfigManager();
  shortcutEngine = new ShortcutEngine();

  configManager.initialize();
  initializeShortcutEngine();

  // Listen for configuration changes and update engine accordingly
  configManager.onConfigChanged(() => {
    initializeShortcutEngine();
  });

  // Listen for text document changes
  const onTextChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;

      // Ensure we're editing the correct document
      if (!editor || editor.document !== event.document) {
        return;
      }

      // Handle each text change
      for (const change of event.contentChanges) {
        handleTextChange(change, editor);
      }
    },
  );

  // Listen for cursor selection changes
  const onSelectionChangeDisposable =
    vscode.window.onDidChangeTextEditorSelection((event) => {
      const editor = event.textEditor;
      if (!editor) {
        return;
      }

      // Update language scope based on current file
      updateLanguageScope(editor);

      // Reset buffer on selection changes
      handleSelectionChange(editor);
    });

  // Register command to open settings
  const openConfigDisposable = vscode.commands.registerCommand(
    "fasttyping.openConfig",
    () => {
      vscode.commands.executeCommand("workbench.action.openSettingsJson");
    },
  );

  // Register all disposables for cleanup
  context.subscriptions.push(onTextChangeDisposable);
  context.subscriptions.push(onSelectionChangeDisposable);
  context.subscriptions.push(openConfigDisposable);
}

/**
 * Initialize the shortcut engine with current configuration.
 */
function initializeShortcutEngine(): void {
  const config = configManager.getConfig();
  const editor = vscode.window.activeTextEditor;

  shortcutEngine.configure(
    config.shortcuts,
    config.maxShortcutLength,
    currentFileLanguage || "common",
  );
}

/**
 * Update the current file language scope.
 * Extracts file extension from editor and updates engine accordingly.
 */
function updateLanguageScope(editor: vscode.TextEditor): void {
  const fileName = editor.document.fileName;
  const extension = fileName.split(".").pop() || "";

  // Only update if scope changed
  if (extension !== currentFileLanguage) {
    currentFileLanguage = extension;
    shortcutEngine.setScope(extension);
  }
}

/**
 * Handle text document changes (character typing).
 */
function handleTextChange(
  change: vscode.TextDocumentContentChangeEvent,
  editor: vscode.TextEditor,
): void {
  // Only process single character inserts
  if (change.text.length !== 1) {
    shortcutEngine.clearBuffer();
    return;
  }

  // Update the processed cursor offset to the new position after this character
  lastProcessedCursorOffset = editor.document.offsetAt(change.range.end.translate(0, 1));

  // Add character to engine buffer
  shortcutEngine.onCharacterTyped(change.text);

  // Try to find and apply matching shortcut
  const match = shortcutEngine.findMatchingShortcut();
  if (match) {
    applyShortcutReplacement(editor, change, match.length, match.replacement);
  }
}

/**
 * Handle cursor selection changes.
 * Resets buffer only when cursor moves WITHOUT a character being typed.
 * (Character typing also triggers cursor movement, but we handle that separately)
 */
function handleSelectionChange(editor: vscode.TextEditor): void {
  const selection = editor.selection;

  // If there's a selection (multi-line or user-selected text), clear buffer
  if (!selection.isEmpty) {
    shortcutEngine.clearBuffer();
    return;
  }

  // Check if cursor position changed since last character was processed
  const currentOffset = editor.document.offsetAt(selection.active);

  // If cursor is exactly where we expect after the last typed character, don't reset
  // This handles the onDidChangeTextEditorSelection that fires right after onDidChangeTextDocument
  if (currentOffset === lastProcessedCursorOffset) {
    return;
  }

  // If cursor moved somewhere else, clear buffer
  shortcutEngine.clearBuffer();
  lastProcessedCursorOffset = currentOffset;
}

/**
 * Apply a shortcut replacement to the document.
 */
function applyShortcutReplacement(
  editor: vscode.TextEditor,
  change: vscode.TextDocumentContentChangeEvent,
  shortcutLength: number,
  replacement: string,
): void {
  const document = editor.document;
  const cursorPos = change.range.end.translate(0, 1);
  const cursorOffset = document.offsetAt(cursorPos);

  // Ensure we have enough characters before cursor
  if (cursorOffset < shortcutLength) {
    return;
  }

  // Calculate range to replace
  const startOffset = cursorOffset - shortcutLength;
  const start = document.positionAt(startOffset);
  const end = cursorPos;
  const replaceRange = new vscode.Range(start, end);

  // Apply replacement
  editor.edit((editBuilder) => {
    editBuilder.replace(replaceRange, replacement);
  });

  // Clear buffer after successful replacement
  shortcutEngine.clearBuffer();
}

export function deactivate() {}
