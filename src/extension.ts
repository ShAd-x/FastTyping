import * as vscode from 'vscode';

type Shortcuts = Record<string, Record<string, string>>;

export function activate(context: vscode.ExtensionContext) {
	let editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
	let lastTwoChars = '';
	let countSelection = 0;
	let fileExtension: string | undefined = editor?.document.fileName.split('.').pop();
	let shortcuts: Shortcuts = getEffectiveShortcuts();

	// Mise à jour des raccourcis si modifiés dans les paramètres
	const subOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('fasttyping.shortcuts')) {
			shortcuts = getEffectiveShortcuts();
		}
	});

	type ShortcutMap = Record<string, Record<string, string>>;
	function getEffectiveShortcuts(): ShortcutMap {
		const config = vscode.workspace.getConfiguration('fasttyping');
		const inspected = config.inspect<ShortcutMap>('shortcuts');

		// Récupère la valeur utilisateur (priorité : workspace > global)
		const userShortcuts = inspected?.workspaceValue || inspected?.globalValue;

		// Si aucun paramètre utilisateur n’est défini, on fallback sur les defaults
		if (!userShortcuts || Object.keys(userShortcuts).length === 0) {
			return inspected?.defaultValue || {};
		}

		return userShortcuts;
	}

	// Ecoute des modifications de texte
	const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
		editor = vscode.window.activeTextEditor;
		if (!editor || editor.document !== event.document) {
			return;
		}

		for (const change of event.contentChanges) {
			if (change.text.length !== 1) {
				lastTwoChars = '';
				return;
			}

			if (lastTwoChars.length === 1) {
				lastTwoChars += change.text;

				const scopedShortcuts = shortcuts[fileExtension ?? ''] ?? {};
				const replacement = scopedShortcuts[lastTwoChars] ?? shortcuts['common']?.[lastTwoChars];

				if (replacement) {
					applyShortcut(change, replacement);
					return;
				}
			} else {
				lastTwoChars = change.text;
			}
		}
	});

	// Écoute des sélections et déplacement du curseur
	const subOnDidChangeSelection = vscode.window.onDidChangeTextEditorSelection((event) => {
		editor = event.textEditor;
		if (!editor) {
			return;
		}

		const selection = editor.selection;
		fileExtension = editor.document.fileName.split('.').pop();
		countSelection = 0;

		if (!selection.isEmpty) {
			if (selection.start.line === selection.end.line) {
				countSelection = selection.end.character - selection.start.character;
			} else {
				lastTwoChars = '';
				return;
			}
		}

		if (selection.start.character === 0) {
			lastTwoChars = '';
			return;
		}

		const charBefore = editor.document.getText(
			new vscode.Range(selection.start.translate(0, -1), selection.start)
		);
		lastTwoChars = charBefore;
	});

	// Fonction de remplacement du raccourci
	function applyShortcut(change: vscode.TextDocumentContentChangeEvent, replacement: string) {
		if (!editor) {
			return;
		}

		const start = change.range.start.translate(0, -1);
		const end = change.range.end.translate(0, 1 - countSelection);
		const replaceRange = new vscode.Range(start, end);

		editor.edit((editBuilder) => {
			editBuilder.replace(replaceRange, replacement);
		});
	}

	// Commande pour ouvrir le fichier settings.json
	const openConfig = vscode.commands.registerCommand('fasttyping.openConfig', () => {
		vscode.commands.executeCommand('workbench.action.openSettingsJson');
	});

	// Enregistrement des subscriptions
	context.subscriptions.push(disposable);
	context.subscriptions.push(subOnDidChangeSelection);
	context.subscriptions.push(subOnDidChangeConfiguration);
	context.subscriptions.push(openConfig);
}

export function deactivate() {}
