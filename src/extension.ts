import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let editor : vscode.TextEditor | undefined = vscode.window.activeTextEditor;
	let shortcuts : vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('fasttyping.shortcuts');
	let lastTwoChars : string = '';
	let countSelection : number = 0;
	let fileExtension : string | undefined = editor?.document.fileName.split('.').pop();

	let disposable = vscode.workspace.onDidChangeTextDocument(event => {
		editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

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
	
				Object.keys(shortcuts).forEach(key => {
					let shortcut = shortcuts[key][lastTwoChars];
					if (shortcut) {
						// console.log(`Shortcut exists for ${key}: ${shortcut}`);
						
						// On a un raccourci pour cette extension de fichier
						// Ou c'est un racourci global (et le raccourci n'existe pas pour le fichier)
						// On vérifie aussi si l'extension est dans les clés de raccourcis sinon on peut pas
						// vérifier si le raccourci pour l'extension existe
						if (
							key == fileExtension || 
							(
								key == 'common' &&
									(
										!shortcuts.hasOwnProperty(fileExtension!) ||
										!JSON.stringify(shortcuts[fileExtension!]).includes(shortcut)
									)
							)
						)  {
							// console.log("[1] DEBUG START : " + change.range.start.translate(0, -1).character);
							// console.log("[1] DEBUG END : " + change.range.end.translate(0, 1 - countSelection).character);
							const replaceRange = new vscode.Range(change.range.start.translate(0, -1), change.range.end.translate(0, 1 - countSelection));
							editor?.edit(edit => edit.replace(replaceRange, shortcut));
						}
					}
				});
			}
        }
    });

	let subOnDidChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(async function (event) {
		editor = event.textEditor;
		if (!editor) {
			return;
		}

		// On recupere la selection
		let selection : vscode.Selection = editor.selection;
		fileExtension = editor.document.fileName.split('.').pop();

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

	let subOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('fasttyping.shortcuts')) {
		  	// Les raccourcis ont été modifiés
		  	shortcuts = vscode.workspace.getConfiguration('fasttyping.shortcuts');
		}
	});

	// Enregistrer la commande pour ouvrir la configuration de l'extension
	context.subscriptions.push(
        vscode.commands.registerCommand('fasttyping.openConfig', openConfig)
    );

    context.subscriptions.push(disposable);
	context.subscriptions.push(subOnDidChangeTextEditorSelection);
	context.subscriptions.push(subOnDidChangeConfiguration);
}

/**
 * Ouvre la configuration de l'extension dans les paramètres utilisateur
 */
function openConfig() {
	vscode.commands.executeCommand('workbench.action.openSettingsJson', '@ext:fasttyping');
}

export function deactivate() {}
