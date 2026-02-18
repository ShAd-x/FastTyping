import * as assert from "assert";
import { ShortcutEngine } from "../../shortcutEngine";

suite("ShortcutEngine Test Suite", () => {
  let engine: ShortcutEngine;

  // Setup before each test
  setup(() => {
    engine = new ShortcutEngine();
  });

  // ============================================
  // Character Buffer Tests
  // ============================================

  test("should accumulate typed characters", () => {
    engine.configure({ common: { "--": "->" } }, 10);
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    assert.strictEqual(engine.getBuffer(), "--");
  });

  test("should keep only last N characters when exceeding maxBufferLength", () => {
    engine.configure({ common: {} }, 5);
    engine.onCharacterTyped("a");
    engine.onCharacterTyped("b");
    engine.onCharacterTyped("c");
    engine.onCharacterTyped("d");
    engine.onCharacterTyped("e");
    engine.onCharacterTyped("f");
    engine.onCharacterTyped("g");
    // Buffer should now contain only 'cdefg' (last 5 chars)
    assert.strictEqual(engine.getBuffer(), "cdefg");
  });

  test("should clear buffer when requested", () => {
    engine.configure({ common: {} }, 10);
    engine.onCharacterTyped("a");
    engine.onCharacterTyped("b");
    engine.clearBuffer();
    assert.strictEqual(engine.getBuffer(), "");
  });

  // ============================================
  // Shortcut Detection Tests
  // ============================================

  test("should find exact shortcut match", () => {
    engine.configure({ common: { "--": "->" } }, 10);
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.pattern, "--");
    assert.strictEqual(match.replacement, "->");
  });

  test("should find longest matching shortcut first", () => {
    engine.configure(
      {
        common: {
          "-": "short",
          "--": "medium",
          "---": "long",
        },
      },
      10,
    );
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "long");
  });

  test("should prioritize scope-specific over common shortcuts", () => {
    engine.configure(
      {
        common: { ";;": "common_dot" },
        php: { ";;": "php_dot" },
      },
      10,
      "php",
    );
    engine.onCharacterTyped(";");
    engine.onCharacterTyped(";");
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "php_dot");
    assert.strictEqual(match.scope, "php");
  });

  test("should fallback to common shortcuts if scope not found", () => {
    engine.configure(
      {
        common: { "--": "->" },
        php: { ";;": "." },
      },
      10,
      "javascript",
    );
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "->");
    assert.strictEqual(match.scope, "common");
  });

  test("should return undefined if no shortcut matches", () => {
    engine.configure({ common: { "--": "->" } }, 10);
    engine.onCharacterTyped("x");
    engine.onCharacterTyped("y");
    const match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined);
  });

  // ============================================
  // Scope Tests
  // ============================================

  test("should set and get scope correctly", () => {
    engine.setScope("php");
    assert.strictEqual(engine.getScope(), "php");
    engine.setScope("javascript");
    assert.strictEqual(engine.getScope(), "javascript");
  });

  // ============================================
  // PR Tests: Shortcuts Longer than 2 Characters
  // ============================================

  test("PR: should detect && shortcut (2 chars)", () => {
    engine.configure(
      {
        common: { "&&": "and" },
      },
      10,
    );
    engine.onCharacterTyped("&");
    engine.onCharacterTyped("&");
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "and");
  });

  test("PR: should detect &&& shortcut (3 chars)", () => {
    engine.configure(
      {
        common: { "&&&": "test" },
      },
      10,
    );
    engine.onCharacterTyped("&");
    engine.onCharacterTyped("&");
    engine.onCharacterTyped("&");
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "test");
  });

  test("PR: should support long shortcuts with maxBufferLength=20", () => {
    const longPattern = "asyncfunction";
    engine.configure(
      {
        common: { [longPattern]: "async () => {}" },
      },
      20,
    );
    // Simulate typing "asyncfunction"
    for (const char of longPattern) {
      engine.onCharacterTyped(char);
    }
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "async () => {}");
  });

  test("PR: should NOT detect shortcut longer than maxBufferLength", () => {
    const longPattern = "verylongpattern";
    engine.configure(
      {
        common: { [longPattern]: "replacement" },
      },
      5, // maxBufferLength = 5
    );
    // Simulate typing the long pattern
    for (const char of longPattern) {
      engine.onCharacterTyped(char);
    }
    // Buffer should only contain last 5 chars: 'ttern'
    assert.strictEqual(engine.getBuffer(), "ttern");
    // Should not find the full pattern
    const match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined);
  });

  test("PR: should handle unicode characters (àà, ùù)", () => {
    engine.configure(
      {
        common: {
          àà: "@",
          ùù: "%",
        },
      },
      10,
    );
    engine.onCharacterTyped("à");
    engine.onCharacterTyped("à");
    let match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "@");

    engine.clearBuffer();
    engine.onCharacterTyped("ù");
    engine.onCharacterTyped("ù");
    match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "%");
  });

  // ============================================
  // Edge Cases
  // ============================================

  test("should handle empty shortcut definitions", () => {
    engine.configure({ common: {} }, 10);
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    const match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined);
  });

  test("should handle multiple shortcut replacements in sequence", () => {
    engine.configure({ common: { "--": "->", ";;": "." } }, 10);

    // First shortcut
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    let match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "->");

    // Clear and try second shortcut
    engine.clearBuffer();
    engine.onCharacterTyped(";");
    engine.onCharacterTyped(";");
    match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, ".");
  });

  test("should correctly report shortcut existence", () => {
    engine.configure(
      {
        common: { "--": "->" },
        php: { ";;": "." },
      },
      10,
      "php",
    );
    assert.strictEqual(engine.hasShortcut("--"), true);
    assert.strictEqual(engine.hasShortcut(";;"), true);
    assert.strictEqual(engine.hasShortcut("xxx"), false);
  });

  test("should get shortcuts for specific scope", () => {
    const shortcuts = {
      common: { "--": "->" },
      php: { ";;": "." },
    };
    engine.configure(shortcuts, 10);
    const phpShortcuts = engine.getShortcutsForScope("php");
    assert.strictEqual(phpShortcuts[";;"], ".");
    assert.strictEqual(phpShortcuts["--"], undefined);
  });

  // Buffer persistence and reset tests
  test("Buffer persistence: should accumulate chars while typing continuously", () => {
    engine.configure(
      {
        common: { "pfn": "function() {}" },
      },
      10,
    );

    // Simulate continuous typing: p, f, n
    engine.onCharacterTyped("p");
    assert.strictEqual(engine.getBuffer(), "p");

    engine.onCharacterTyped("f");
    assert.strictEqual(engine.getBuffer(), "pf");

    engine.onCharacterTyped("n");
    assert.strictEqual(engine.getBuffer(), "pfn");

    // After typing 3 chars, buffer should be "pfn"
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.pattern, "pfn");
  });

  test("Buffer reset: should clear buffer when explicitly cleared", () => {
    engine.configure(
      {
        common: { "--": "->" },
      },
      10,
    );

    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    assert.strictEqual(engine.getBuffer(), "--");

    // Simulate cursor movement (click elsewhere)
    engine.clearBuffer();
    assert.strictEqual(engine.getBuffer(), "");

    // Next char should start fresh
    engine.onCharacterTyped("x");
    assert.strictEqual(engine.getBuffer(), "x");
  });

  test("Buffer reset: should NOT find shortcut after clear", () => {
    engine.configure(
      {
        common: { "--": "->", "xx": "test" },
      },
      10,
    );

    // Type "--"
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    let match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.pattern, "--");

    // Clear buffer (simulating cursor movement)
    engine.clearBuffer();

    // Type "xx" after clear
    engine.onCharacterTyped("x");
    engine.onCharacterTyped("x");
    match = engine.findMatchingShortcut();

    assert.ok(match);
    assert.strictEqual(match.pattern, "xx");
    assert.strictEqual(match.replacement, "test");
  });

  test("Buffer reset on scope change: typing continues in new scope", () => {
    engine.configure(
      {
        common: { "--": "common_arrow" },
        php: { "--": "php_concat" },
      },
      10,
    );

    // Start in common scope
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    let match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "common_arrow");

    // Change scope
    engine.setScope("php");
    // Buffer should still have "--" but now match should be php version
    match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.replacement, "php_concat");
  });

  test("Buffer with long shortcuts: should handle typing of long patterns", () => {
    engine.configure(
      {
        common: { "asyncfunction": "async () => {}" },
      },
      20, // maxBufferLength = 20
    );

    const chars = "asyncfunction".split("");
    for (const char of chars) {
      engine.onCharacterTyped(char);
    }

    assert.strictEqual(engine.getBuffer(), "asyncfunction");
    const match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.pattern, "asyncfunction");
  });

  test("Buffer maxLength: should trim oldest chars when exceeding maxBufferLength", () => {
    engine.configure(
      {
        common: { "xy": "test" },
      },
      3, // maxBufferLength = 3
    );

    // Type 5 characters: a, b, c, d, e
    engine.onCharacterTyped("a");
    engine.onCharacterTyped("b");
    engine.onCharacterTyped("c");
    assert.strictEqual(engine.getBuffer(), "abc");

    engine.onCharacterTyped("d");
    assert.strictEqual(engine.getBuffer(), "bcd"); // 'a' should be trimmed

    engine.onCharacterTyped("e");
    assert.strictEqual(engine.getBuffer(), "cde"); // 'b' should be trimmed
  });

  test("Buffer persistence across failed matches: should keep accumulating", () => {
    engine.configure(
      {
        common: { "pfn": "function() {}" },
      },
      10,
    );

    // Type: a, b, c, p, f, n
    engine.onCharacterTyped("a");
    let match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined); // no match for "a"
    assert.strictEqual(engine.getBuffer(), "a");

    engine.onCharacterTyped("b");
    match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined); // no match for "ab"
    assert.strictEqual(engine.getBuffer(), "ab");

    engine.onCharacterTyped("c");
    match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined); // no match for "abc"
    assert.strictEqual(engine.getBuffer(), "abc");

    engine.onCharacterTyped("p");
    match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined); // no match for "abcp"
    assert.strictEqual(engine.getBuffer(), "abcp");

    engine.onCharacterTyped("f");
    match = engine.findMatchingShortcut();
    assert.strictEqual(match, undefined); // no match for "abcpf"
    assert.strictEqual(engine.getBuffer(), "abcpf");

    engine.onCharacterTyped("n");
    match = engine.findMatchingShortcut();
    assert.ok(match); // MATCH! "pfn" found in "abcpfn"
    assert.strictEqual(match.pattern, "pfn");
    assert.strictEqual(engine.getBuffer(), "abcpfn");
  });

  test("Buffer clear between replacements: should start fresh after replacement", () => {
    engine.configure(
      {
        common: { "--": "->", ";;": "." },
      },
      10,
    );

    // First replacement: "--"
    engine.onCharacterTyped("-");
    engine.onCharacterTyped("-");
    let match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.pattern, "--");

    // Simulate replacement (clear buffer)
    engine.clearBuffer();
    assert.strictEqual(engine.getBuffer(), "");

    // Type new shortcut: ";;"
    engine.onCharacterTyped(";");
    engine.onCharacterTyped(";");
    match = engine.findMatchingShortcut();
    assert.ok(match);
    assert.strictEqual(match.pattern, ";;");
    assert.strictEqual(match.replacement, ".");
  });
});
