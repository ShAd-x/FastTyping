import { ShortcutMatch, ShortcutDefinitions } from "./types";

/**
 * Core engine for detecting and managing shortcuts.
 * This module is independent of VS Code API and can be unit tested easily.
 */
export class ShortcutEngine {
  // Buffer of recently typed characters
  private charBuffer: string = "";

  // Maximum characters to keep in buffer
  private maxBufferLength: number = 10;

  // Current shortcut definitions
  private shortcuts: ShortcutDefinitions = {};

  // Current file language scope (e.g., 'php', 'javascript')
  private currentScope: string = "common";

  /**
   * Configure the engine with shortcuts and max buffer length.
   */
  public configure(
    shortcuts: ShortcutDefinitions,
    maxBufferLength: number,
    scope: string = "common",
  ): void {
    this.shortcuts = shortcuts;
    this.maxBufferLength = maxBufferLength;
    this.currentScope = scope;
  }

  /**
   * Set the current file scope (language/file type).
   * Affects shortcut priority when matching.
   */
  public setScope(scope: string): void {
    this.currentScope = scope;
  }

  /**
   * Get the current file scope.
   */
  public getScope(): string {
    return this.currentScope;
  }

  /**
   * Add a typed character to the buffer.
   * Automatically trims buffer if it exceeds maxBufferLength.
   */
  public onCharacterTyped(char: string): void {
    this.charBuffer += char;

    // Keep only the last N characters (sliding window)
    if (this.charBuffer.length > this.maxBufferLength) {
      this.charBuffer = this.charBuffer.slice(-this.maxBufferLength);
    }
  }

  /**
   * Get the current character buffer.
   * Useful for testing and debugging.
   */
  public getBuffer(): string {
    return this.charBuffer;
  }

  /**
   * Clear the character buffer.
   * Called after a successful shortcut replacement or when needed.
   */
  public clearBuffer(): void {
    this.charBuffer = "";
  }

  /**
   * Find a matching shortcut in the current buffer.
   * Uses longest-first matching strategy to prioritize longer patterns.
   * Prioritizes scope-specific shortcuts over common shortcuts.
   *
   * @returns ShortcutMatch if found, undefined otherwise
   */
  public findMatchingShortcut(): ShortcutMatch | undefined {
    // Try to match from longest to shortest substring
    for (let length = this.charBuffer.length; length > 0; length--) {
      const substring = this.charBuffer.slice(-length);

      // First, check scope-specific shortcuts (e.g., 'php' for PHP files)
      const scopedShortcuts = this.shortcuts[this.currentScope] || {};
      if (substring in scopedShortcuts) {
        const match = {
          pattern: substring,
          replacement: scopedShortcuts[substring],
          length,
          scope: this.currentScope,
        };
        return match;
      }

      // Then, check common shortcuts (applies to all file types)
      const commonShortcuts = this.shortcuts.common || {};
      if (substring in commonShortcuts) {
        const match = {
          pattern: substring,
          replacement: commonShortcuts[substring],
          length,
          scope: "common",
        };
        return match;
      }
    }

    return undefined;
  }

  /**
   * Get all available shortcuts.
   * Useful for debugging and testing.
   */
  public getShortcuts(): ShortcutDefinitions {
    return this.shortcuts;
  }

  /**
   * Get shortcuts for a specific scope.
   * Useful for testing and queries.
   */
  public getShortcutsForScope(scope: string): Record<string, string> {
    return this.shortcuts[scope] || {};
  }

  /**
   * Check if a specific pattern exists in shortcuts.
   * Checks both scope-specific and common shortcuts.
   */
  public hasShortcut(pattern: string): boolean {
    const scopedShortcuts = this.shortcuts[this.currentScope] || {};
    const commonShortcuts = this.shortcuts.common || {};
    return pattern in scopedShortcuts || pattern in commonShortcuts;
  }
}
