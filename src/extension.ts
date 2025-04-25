import * as vscode from 'vscode';

type Shortcuts = Record<string, Record<string, string>>;

export function activate(context: vscode.ExtensionContext) {
	let editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
	let accumulatedChars = '';
	let maxShortcutLength = vscode.workspace.getConfiguration('fasttyping').get<number>('maxShortcutLength', 10);
	let fileExtension: string | undefined = editor?.document.fileName.split('.').pop();
	let shortcuts: Shortcuts = getEffectiveShortcuts();

	// Mise à jour des raccourcis si modifiés dans les paramètres
	const subOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('fasttyping.shortcuts')) {
			shortcuts = getEffectiveShortcuts();
		}
		if (event.affectsConfiguration('fasttyping.maxShortcutLength')) {
			maxShortcutLength = vscode.workspace.getConfiguration('fasttyping').get<number>('maxShortcutLength', 10);
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
				accumulatedChars = '';
				return;
			}

			accumulatedChars += change.text;

            // Limite la taille de la chaîne accumulée
            if (accumulatedChars.length > maxShortcutLength) {
                accumulatedChars = accumulatedChars.slice(-maxShortcutLength);
            }

            // Recherche du raccourci correspondant
            const scopedShortcuts = shortcuts[fileExtension ?? ''] ?? {};
            let replacement: string | undefined;

            // Vérifie les raccourcis dans l'ordre décroissant de longueur
            for (let i = accumulatedChars.length; i > 0; i--) {
                const substring = accumulatedChars.slice(-i); // Extrait les derniers `i` caractères
                replacement = scopedShortcuts[substring] ?? shortcuts['common']?.[substring];
                if (replacement) {
                    applyShortcut(change, replacement, i); // Applique le raccourci si trouvé
                    return;
                }
            }
		}
	});

	// Fonction de remplacement du raccourci
	function applyShortcut(change: vscode.TextDocumentContentChangeEvent, replacement: string, shortcutLength: number) {
		if (!editor) return;

		const document = editor.document;

		const cursorPos = change.range.end.translate(0, 1);

		const cursorOffset = document.offsetAt(cursorPos);

		if (cursorOffset < shortcutLength) {
			console.error('Not enough characters before cursor to apply shortcut');
			return;
		}

		const startOffset = cursorOffset - shortcutLength;
		const start = document.positionAt(startOffset);
		const end = cursorPos;

		const replaceRange = new vscode.Range(start, end);
		const textToReplace = document.getText(replaceRange);
		console.log('Text to replace:', textToReplace);

		editor.edit((editBuilder) => {
			editBuilder.replace(replaceRange, replacement);
		});

		accumulatedChars = '';
	}

	// Commande pour ouvrir le fichier settings.json
	const openConfig = vscode.commands.registerCommand('fasttyping.openConfig', () => {
		vscode.commands.executeCommand('workbench.action.openSettingsJson');
	});

	// Enregistrement des subscriptions
	context.subscriptions.push(disposable);
	context.subscriptions.push(subOnDidChangeConfiguration);
	context.subscriptions.push(openConfig);
}

export function deactivate() {}
