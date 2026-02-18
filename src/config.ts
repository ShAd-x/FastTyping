import * as vscode from "vscode";
import { ConfigOptions, ShortcutDefinitions } from "./types";

/**
 * Manages extension configuration with validation and caching.
 * Handles loading user settings, merging with defaults, and validating values.
 */
export class ConfigManager {
  private static readonly EXTENSION_NAME = "fasttyping";
  private static readonly DEFAULT_MAX_LENGTH = 10;
  private static readonly MAX_ALLOWED_LENGTH = 50;

  private currentConfig: ConfigOptions | null = null;
  private listeners: Array<() => void> = [];

  /**
   * Initialize the config manager and listen for configuration changes.
   */
  public initialize(): void {
    this.loadConfig();
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(ConfigManager.EXTENSION_NAME)) {
        this.loadConfig();
        this.notifyListeners();
      }
    });
  }

  /**
   * Load and validate configuration from VS Code settings.
   * Loads user-defined shortcuts only, WITHOUT merging defaults from package.json.
   * Uses inspect() to distinguish user config from defaults.
   */
  private loadConfig(): void {
    const config = vscode.workspace.getConfiguration(
      ConfigManager.EXTENSION_NAME,
    );

    // Load maxShortcutLength with validation
    const rawMaxLength = config.get<number>("maxShortcutLength");
    const maxShortcutLength = this.validateMaxLength(rawMaxLength);

    // Use inspect() to get ONLY user-defined shortcuts, not defaults
    const inspected = config.inspect<ShortcutDefinitions>("shortcuts");
    const userDefinedShortcuts =
      inspected?.workspaceValue || inspected?.globalValue;

    // If user has defined shortcuts (workspace or global), use ONLY those
    // Otherwise use defaults
    const hasUserConfig =
      userDefinedShortcuts && Object.keys(userDefinedShortcuts).length > 0;
    const shortcuts = hasUserConfig
      ? userDefinedShortcuts
      : this.getDefaultShortcuts();

    this.currentConfig = {
      maxShortcutLength,
      shortcuts,
    };
  }

  /**
   * Validate maxShortcutLength value.
   * Accepts values from 1 to 50, defaults to 10 if invalid.
   */
  private validateMaxLength(value: any): number {
    // If undefined or not set, use default
    if (value === undefined) {
      return ConfigManager.DEFAULT_MAX_LENGTH;
    }

    const num = Number(value);

    // Check if it's a valid number and within acceptable range
    if (
      !Number.isInteger(num) ||
      num < 1 ||
      num > ConfigManager.MAX_ALLOWED_LENGTH
    ) {
      return ConfigManager.DEFAULT_MAX_LENGTH;
    }

    return num;
  }

  /**
   * Get default shortcut definitions for backward compatibility.
   */
  private getDefaultShortcuts(): ShortcutDefinitions {
    return {
      common: {
        "--": "->",
        àà: "@",
        ùù: "%",
      },
      php: {
        ";;": ".",
        "**": "{}",
      },
      js: {
        cl: "console.log()",
        fn: "function() {\n  \n}",
      },
    };
  }

  /**
   * Get the current configuration.
   */
  public getConfig(): ConfigOptions {
    if (!this.currentConfig) {
      this.loadConfig();
    }
    return this.currentConfig!;
  }

  /**
   * Get maximum shortcut length setting.
   */
  public getMaxShortcutLength(): number {
    return this.getConfig().maxShortcutLength;
  }

  /**
   * Get all shortcut definitions.
   */
  public getShortcuts(): ShortcutDefinitions {
    return this.getConfig().shortcuts;
  }

  /**
   * Get shortcuts for a specific scope (e.g., 'php', 'javascript').
   */
  public getShortcutsForScope(scope: string): Record<string, string> {
    const shortcuts = this.getShortcuts();
    return shortcuts[scope] || {};
  }

  /**
   * Get common shortcuts (applies to all file types).
   */
  public getCommonShortcuts(): Record<string, string> {
    return this.getShortcutsForScope("common");
  }

  /**
   * Register a listener to be called when configuration changes.
   */
  public onConfigChanged(callback: () => void): void {
    this.listeners.push(callback);
  }

  /**
   * Notify all registered listeners of configuration change.
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback());
  }
}
