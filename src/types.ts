/**
 * Shared types and interfaces
 */

/** Shortcut definitions organized by scope (e.g., 'common', 'php', 'javascript') */
export type ShortcutDefinitions = Record<string, Record<string, string>>;

/** Configuration options for the extension */
export interface ConfigOptions {
  maxShortcutLength: number;
  shortcuts: ShortcutDefinitions;
}

/** Result of finding a matching shortcut */
export interface ShortcutMatch {
  pattern: string;
  replacement: string;
  length: number;
  scope: string;
}

/** Text change event information */
export interface TextChangeInfo {
  insertedText: string;
  range: { start: number; end: number };
}
