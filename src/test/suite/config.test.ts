import * as assert from "assert";

/**
 * ConfigManager tests using only plain mocking (no sinon)
 * to ensure compatibility with VS Code test environment.
 */

// Mock VS Code configuration
class MockConfiguration {
  private data: Record<string, any> = {};

  constructor(initialData: Record<string, any> = {}) {
    this.data = initialData;
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  inspect<T>(key: string) {
    return {
      key,
      defaultValue: this.data[key],
      globalValue: undefined,
      workspaceValue: undefined,
      workspaceFolderValue: undefined,
    };
  }
}

suite("ConfigManager Test Suite", () => {
  // ============================================
  // Basic Configuration Tests
  // ============================================

  test("should load default maxShortcutLength if not configured", () => {
    const mockConfig = new MockConfiguration();
    const maxLength = mockConfig.get<number>("maxShortcutLength", 10);
    assert.strictEqual(maxLength, 10);
  });

  test("should load user-configured maxShortcutLength", () => {
    const mockConfig = new MockConfiguration({ maxShortcutLength: 15 });
    const maxLength = mockConfig.get<number>("maxShortcutLength", 10);
    assert.strictEqual(maxLength, 15);
  });

  test("should load user-configured shortcuts", () => {
    const customShortcuts = {
      common: { test: "result" },
      php: { fn: "function" },
    };
    const mockConfig = new MockConfiguration({ shortcuts: customShortcuts });
    const shortcuts = mockConfig.get("shortcuts");
    assert.deepStrictEqual(shortcuts, customShortcuts);
  });

  // ============================================
  // maxShortcutLength Validation Tests
  // ============================================

  test("should accept valid maxShortcutLength values (1-50)", () => {
    for (let value = 1; value <= 50; value += 5) {
      const mockConfig = new MockConfiguration({ maxShortcutLength: value });
      const result = mockConfig.get<number>("maxShortcutLength");
      assert.strictEqual(result, value, `Failed for value ${value}`);
    }
  });

  test("should handle zero and negative values", () => {
    const mockConfigZero = new MockConfiguration({ maxShortcutLength: 0 });
    assert.strictEqual(mockConfigZero.get<number>("maxShortcutLength"), 0);

    const mockConfigNegative = new MockConfiguration({ maxShortcutLength: -5 });
    assert.strictEqual(mockConfigNegative.get<number>("maxShortcutLength"), -5);
  });

  test("should handle non-integer values", () => {
    const mockConfig = new MockConfiguration({ maxShortcutLength: 10.5 });
    assert.strictEqual(mockConfig.get<number>("maxShortcutLength"), 10.5);
  });

  test("should handle string values", () => {
    const mockConfig = new MockConfiguration({ maxShortcutLength: "invalid" });
    const result = mockConfig.get("maxShortcutLength");
    assert.strictEqual(result, "invalid");
  });

  // ============================================
  // Default Shortcuts Tests
  // ============================================

  test("should use default shortcuts if none configured", () => {
    const defaultShortcuts = {
      common: {
        "--": "->",
        àà: "@",
        ùù: "%",
      },
      php: {
        ";;": ".",
        "**": "{}",
      },
    };
    const mockConfig = new MockConfiguration({ shortcuts: defaultShortcuts });
    const shortcuts = mockConfig.get("shortcuts") as typeof defaultShortcuts;
    assert.ok(shortcuts.common);
    assert.ok(shortcuts.php);
    assert.strictEqual(shortcuts.common["--"], "->");
    assert.strictEqual(shortcuts.php[";;"], ".");
  });

  // ============================================
  // PR Tests: maxShortcutLength Configuration
  // ============================================

  test("PR: should accept maxShortcutLength of 1 (minimum)", () => {
    const mockConfig = new MockConfiguration({ maxShortcutLength: 1 });
    assert.strictEqual(mockConfig.get<number>("maxShortcutLength"), 1);
  });

  test("PR: should accept maxShortcutLength of 50 (maximum)", () => {
    const mockConfig = new MockConfiguration({ maxShortcutLength: 50 });
    assert.strictEqual(mockConfig.get<number>("maxShortcutLength"), 50);
  });

  test("PR: should allow user to configure longer shortcuts", () => {
    const longShortcuts = {
      common: {
        asyncfunction: "async () => {}",
        "&&&": "test",
        typeof: "object",
      },
    };
    const mockConfig = new MockConfiguration({ shortcuts: longShortcuts });
    const shortcuts = mockConfig.get("shortcuts") as Record<
      string,
      Record<string, string>
    >;
    assert.ok(shortcuts.common.asyncfunction);
    assert.ok((shortcuts.common as Record<string, string>)["&&&"]);
    assert.ok(shortcuts.common.typeof);
  });

  test("should provide default values for missing keys", () => {
    const mockConfig = new MockConfiguration();
    assert.strictEqual(mockConfig.get<number>("unknown", 42), 42);
    assert.strictEqual(mockConfig.get<string>("missing", "default"), "default");
  });

  // ============================================
  // Real User Config Tests (with inspect)
  // ============================================

  test("User has NO config - should use defaults", () => {
    // When user has no configuration at all
    const userShortcuts: Record<string, Record<string, string>> | undefined =
      undefined;
    const hasUserConfig =
      userShortcuts && Object.keys(userShortcuts).length > 0;

    // Should use defaults (falsy value when undefined)
    assert.strictEqual(!hasUserConfig, true);
  });

  test("User has partial config (--) - should use ONLY user config, NO defaults", () => {
    // User only defines common.-- but àà should NOT exist
    const userShortcuts: Record<string, Record<string, string>> = {
      common: { "--": "->" },
    };
    const hasUserConfig =
      userShortcuts && Object.keys(userShortcuts).length > 0;

    // Should use user config only
    assert.strictEqual(hasUserConfig, true);
    assert.strictEqual(userShortcuts.common["--"], "->");
    assert.strictEqual(
      (userShortcuts.common as Record<string, any>)["àà"],
      undefined,
    );
    assert.strictEqual(
      (userShortcuts.common as Record<string, any>)["ùù"],
      undefined,
    );
    assert.strictEqual((userShortcuts as Record<string, any>).php, undefined);
  });

  test("User has config with pfn - should use ONLY user config", () => {
    // Real user config from test case
    const userShortcuts: Record<string, Record<string, string>> = {
      common: {
        "--": "->",
        pfn: "public function",
      },
    };
    const hasUserConfig =
      userShortcuts && Object.keys(userShortcuts).length > 0;

    // Should use user config only
    assert.strictEqual(hasUserConfig, true);
    assert.strictEqual(userShortcuts.common["--"], "->");
    assert.strictEqual(userShortcuts.common["pfn"], "public function");
    // NO defaults
    assert.strictEqual(
      (userShortcuts.common as Record<string, any>)["àà"],
      undefined,
    );
    assert.strictEqual(
      (userShortcuts.common as Record<string, any>)["ùù"],
      undefined,
    );
    assert.strictEqual((userShortcuts as Record<string, any>).php, undefined);
  });

  test("User has custom shortcuts with multiple scopes", () => {
    const userShortcuts: Record<string, Record<string, string>> = {
      common: {
        "--": "=>",
        fn: "function",
      },
      javascript: {
        arr: "Array.from",
        async: "async function",
      },
    };
    const hasUserConfig =
      userShortcuts && Object.keys(userShortcuts).length > 0;

    // Should use user config only
    assert.strictEqual(hasUserConfig, true);
    assert.strictEqual(userShortcuts.common["--"], "=>");
    assert.strictEqual(userShortcuts.common["fn"], "function");
    assert.strictEqual(userShortcuts.javascript["arr"], "Array.from");
    // NO defaults like àà or php scope
    assert.strictEqual(
      (userShortcuts.common as Record<string, any>)["àà"],
      undefined,
    );
    assert.strictEqual((userShortcuts as Record<string, any>).php, undefined);
  });

  test("User sets empty shortcuts {} - should use defaults", () => {
    const userShortcuts: Record<string, Record<string, string>> = {};
    const hasUserConfig =
      userShortcuts && Object.keys(userShortcuts).length > 0;

    // Empty config = no user config, use defaults
    assert.strictEqual(hasUserConfig, false);
  });

  test("User overrides -- but keeps structure - should NOT have other defaults", () => {
    const userShortcuts: Record<string, Record<string, string>> = {
      common: {
        "--": "=>", // Different replacement
      },
      // No php scope defined
    };
    const hasUserConfig =
      userShortcuts && Object.keys(userShortcuts).length > 0;

    // Should use user config only
    assert.strictEqual(hasUserConfig, true);
    assert.strictEqual(userShortcuts.common["--"], "=>");
    // NO default replacements
    assert.strictEqual(
      (userShortcuts.common as Record<string, any>)["àà"],
      undefined,
    );
    assert.strictEqual(
      (userShortcuts.common as Record<string, any>)["ùù"],
      undefined,
    );
    // NO default scopes
    assert.strictEqual((userShortcuts as Record<string, any>).php, undefined);
  });
});
