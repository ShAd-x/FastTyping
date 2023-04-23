import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let lastTwoChars = '';
	let countSelection = 0;

	let disposable = vscode.workspace.onDidChangeTextDocument(event => {
        for (const change of event.contentChanges) {
			// On ne modifie pas quand c'est sur plusieurs lignes
			// Ou les copier/coller
			if (change.text.length != 1) {
				// console.log("ERROR : change.text.length != 1");
				lastTwoChars = '';
				return;
			}
			if (lastTwoChars.length == 1) {
				lastTwoChars = lastTwoChars + change.text;
				// console.log("[1] DEBUG : " + lastTwoChars);
				if (lastTwoChars === '--') {
					// console.log("[1] DEBUG START : " + change.range.start.translate(0, -1).character);
					// console.log("[1] DEBUG END : " + change.range.end.translate(0, 1-countSelection).character);
					const replaceRange = new vscode.Range(change.range.start.translate(0, -1), change.range.end.translate(0, 1-countSelection));
					editor?.edit(edit => edit.replace(replaceRange, '->'));
				}
			}
        }
    });

	let subOnDidChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(async function () {
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		// On recupere la selection
		let selection = editor.selection;

		countSelection = 0;
		// On a une selection donc on recupere le nombre de caractere selectionné
		// Pour que le remplacement se fasse correctement sans supprimer le reste de la ligne
		if (!selection.isEmpty) {
			// Compte le nombre de caractere selectionné sur la même ligne
			if (selection.start.line == selection.end.line) {
				// console.log("DEBUG : " + (selection.end.character - selection.start.character));
				countSelection = selection.end.character - selection.start.character;
			} else {
				// Si on a une selection sur plusieurs ligne, on annule le remplacement car ça ne marche pas
				// console.log("ERROR : selection.start.line != selection.end.line");
				lastTwoChars = '';
				return;
			}
		}
		
		// Si on est au début de la ligne il n'y a pas de caractere avant
		if (selection.start.character == 0) {
			// console.log("ERROR : selection.start.character == 0");
			lastTwoChars = '';
			return;
		}
		let charBeforeSelection = editor.document.getText(new vscode.Range(selection.start.translate(0, -1), selection.start));
		lastTwoChars = charBeforeSelection;
		// console.log("[MOVED] DEBUG : " + charBeforeSelection);
	});

    context.subscriptions.push(disposable);
	context.subscriptions.push(subOnDidChangeTextEditorSelection);
}

export function deactivate() {}
