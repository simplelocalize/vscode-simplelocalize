import * as vscode from 'vscode';
import { ProjectAPI } from './api';
import { ProjectDetails } from './apiTypes';
import { getProjectApiKey, onContentChanged, onProjectChanged } from './extension';
import { repository, TranslationKey } from './repository';
import { createQuickPickLanguageItems, createQuickPickNamespacesItems, createQuickPickTranslationKeyItems, isProjectWithNamespaces } from './utils';


enum ActionType {
	CreateTranslationKey = "Create",
	ConvertTextToTranslationKey = "Convert",
	UpdateTranslation = "Update",
	RenameTranslationKey = "Rename"
}

class SimpleLocalizeCodeActionProvider implements vscode.CodeActionProvider {

	private namespacelessTranslationKeys: string[] = [];

	refresh() {
		this.namespacelessTranslationKeys = repository.findAllTranslationKeys().map(entry => entry.translationKey);
	}

	clear() {
		this.namespacelessTranslationKeys = [];
	}

	provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | Thenable<vscode.CodeAction[]> {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.selection.isEmpty) {
			return [];
		}
		const selectedText = editor.document.getText(editor.selection);

		const isTranslationKeyExistsInAnyNamespace = this.namespacelessTranslationKeys.indexOf(selectedText) > -1;
		const apiKey = getProjectApiKey();
		if (!apiKey) {
			return [];
		}


		const outputActions = [];
		if (isTranslationKeyExistsInAnyNamespace) {
			const renameAction = new vscode.CodeAction(`Rename "${selectedText}" key in SimpleLocalize`, vscode.CodeActionKind.RefactorRewrite);
			renameAction.command = { command: 'simplelocalize.codeAction', title: 'SimpleLocalize', arguments: [selectedText, ActionType.RenameTranslationKey] };
			outputActions.push(renameAction);

			//TODO: Add "Move to namespace" action
			//TODO: Open translation key in the web app
			//TODO: Deprecated translation key
		} else {
			const createNewTranslationKeyActon = new vscode.CodeAction(`Create "${selectedText}" key in SimpleLocalize`, vscode.CodeActionKind.RefactorRewrite);
			createNewTranslationKeyActon.isPreferred = true;
			createNewTranslationKeyActon.command = { command: 'simplelocalize.codeAction', title: 'SimpleLocalize', arguments: [selectedText, ActionType.CreateTranslationKey] };
			outputActions.push(createNewTranslationKeyActon);

			const getTranslationAndCreateKeyAction = new vscode.CodeAction(`Convert text to translation key in SimpleLocalize`, vscode.CodeActionKind.RefactorRewrite);
			getTranslationAndCreateKeyAction.isPreferred = true;
			getTranslationAndCreateKeyAction.command = { command: 'simplelocalize.codeAction', title: 'SimpleLocalize', arguments: [selectedText, ActionType.ConvertTextToTranslationKey] };
			outputActions.push(getTranslationAndCreateKeyAction);

			const updateTranslation = new vscode.CodeAction(`Update translation in SimpleLocalize`, vscode.CodeActionKind.RefactorRewrite);
			updateTranslation.isPreferred = true;
			updateTranslation.command = { command: 'simplelocalize.codeAction', title: 'SimpleLocalize', arguments: [selectedText, ActionType.UpdateTranslation] };
			outputActions.push(updateTranslation);

		}
		return outputActions;
	}
}



export function registerCodeActions(context: vscode.ExtensionContext) {

	let translationKeys: TranslationKey[] = [];
	let project: ProjectDetails = {};
	let projectNamespaces: string[] = [];

	const refresh = () => {
		translationKeys = repository.findAllTranslationKeys();
		project = repository.findProjectDetails();
		projectNamespaces = project?.namespaces?.map(entry => entry?.name!) || [];
	};

	const clear = () => {
		translationKeys = [];
		project = {};
		projectNamespaces = [];
	};

	const provider = new SimpleLocalizeCodeActionProvider();
	onContentChanged.event(() => {
		provider.refresh();
		refresh();
	});

	onProjectChanged.event(() => {
		provider.clear();
		clear();
	});

	const customCodeProvider = vscode.languages.registerCodeActionsProvider('*', provider, {
		providedCodeActionKinds: [vscode.CodeActionKind.Empty]
	});

	const runCustomCodeAction = vscode.commands.registerCommand('simplelocalize.codeAction', async (selectedText: string, actionType: ActionType) => {
		const apiKey = getProjectApiKey();
		if (!apiKey) {
			return;
		}
		switch (actionType) {
			case ActionType.CreateTranslationKey:
				await createTranslationKeyAction(selectedText);
				break;
			case ActionType.RenameTranslationKey:
				await renameTranslationKeyAction(selectedText);
				break;
			case ActionType.ConvertTextToTranslationKey:
				await convertTextToTranslationKey(selectedText);
				break;
			case ActionType.UpdateTranslation:
				await updateTranslation(selectedText);
				break;
			default:
				console.warn("Unknown action type", actionType);
		}
	});

	context.subscriptions.push(customCodeProvider, runCustomCodeAction);

}

async function createTranslationKeyAction(selectedText: string) {
	vscode.commands.executeCommand("simplelocalize.addTranslationKey", selectedText);
}

async function renameTranslationKeyAction(selectedText: string) {

	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.selection.isEmpty) {
		return;
	}

	const apiKey = getProjectApiKey();
	if (!apiKey) {
		return;
	}


	const translationKeys = repository.findAllTranslationKeys();
	const matchingTranslationKeys = translationKeys.filter(entry => entry.translationKey === selectedText);
	if (matchingTranslationKeys.length === 0) {
		return;
	}

	let hasNamespaces = isProjectWithNamespaces();
	let namespace = matchingTranslationKeys?.[0]?.namespace || "";

	const isSameTranslationKeyInDifferentNamespaces = matchingTranslationKeys.length > 1 || hasNamespaces;
	const maxSteps = isSameTranslationKeyInDifferentNamespaces ? 3 : 2;

	if (isSameTranslationKeyInDifferentNamespaces) {
		hasNamespaces = true;
		const namespaceQuickPick = await vscode.window.showQuickPick(matchingTranslationKeys.map(entry => entry.namespace), {
			title: `Step 1/${maxSteps}: Choose current namespace`,
			placeHolder: "Choose current namespace"
		});
		if (namespaceQuickPick) {
			namespace = namespaceQuickPick;
		} else {
			return;
		}
	}

	const newTranslationKey = await vscode.window.showInputBox({
		title: hasNamespaces ? `Step 2/${maxSteps}: Enter new translation key` : undefined,
		placeHolder: "Enter new translation key",
		value: selectedText
	}) || "";

	if (!newTranslationKey) {
		return;
	}


	let newNamespace: string = "";
	if (hasNamespaces) {
		const userNamespace = await vscode.window.showQuickPick(createQuickPickNamespacesItems(), {
			title: hasNamespaces ? `Step 3/${maxSteps}: Choose new namespace` : undefined,
			placeHolder: "Choose namespace"
		});
		if (userNamespace) {
			newNamespace = userNamespace?.value || "";
		} else {
			return;
		}
	}

	const projectApi = new ProjectAPI(apiKey);
	await projectApi.updateTranslationKey(selectedText, namespace, newTranslationKey, newNamespace);
	onContentChanged.fire();

	editor.edit(editBuilder => {
		editBuilder.replace(editor.selection, newTranslationKey);
	});
}

async function convertTextToTranslationKey(selectedText: string) {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.selection.isEmpty) {
		return;
	}

	const apiKey = getProjectApiKey();
	if (!apiKey) {
		return;
	}

	const hasNamespaces = isProjectWithNamespaces();
	const maxSteps = hasNamespaces ? 3 : 2;

	const languageQuickPickOptions = createQuickPickLanguageItems();
	const selectedLanguage = await vscode.window.showQuickPick(languageQuickPickOptions, {
		title: `Step 1/${maxSteps}: Choose language`,
		placeHolder: "Choose language"
	});

	if (!selectedLanguage) {
		return;
	}

	const namespaceQuickPickOptions = createQuickPickNamespacesItems();
	const namespace = await vscode.window.showQuickPick(namespaceQuickPickOptions, {
		title: `Step 2/${maxSteps}: Choose namespace`,
		placeHolder: "Choose namespace"
	});


	const suggestedTranslationKey = selectedText.toLowerCase().replace(/[^a-z0-9]/g, "_").trim();
	const translationKey = await vscode.window.showInputBox({
		title: `Step 3/${maxSteps}: Create translation key`,
		placeHolder: "Enter new translation key",
		value: suggestedTranslationKey
	}) || "";

	if (!translationKey) {
		return;
	}

	const projectApi = new ProjectAPI(apiKey);
	await projectApi.addTranslationKey(translationKey, namespace?.value);
	await projectApi.updateTranslation(translationKey, namespace?.value, selectedLanguage.key, selectedText);

	editor.edit(editBuilder => {
		editBuilder.replace(editor.selection, translationKey);
	});

	onContentChanged.fire();
}

async function updateTranslation(selectedText: string) {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.selection.isEmpty) {
		return;
	}

	const apiKey = getProjectApiKey();
	if (!apiKey) {
		return;
	}

	const languageQuickPickOptions = createQuickPickLanguageItems();
	const selectedLanguage = await vscode.window.showQuickPick(languageQuickPickOptions, {
		title: "Choose language",
	});

	if (!selectedLanguage) {
		return;
	}

	const translationKeyQuickPickOptions = createQuickPickTranslationKeyItems();
	const selectedTranslationKey = await vscode.window.showQuickPick(translationKeyQuickPickOptions, {
		title: "Choose translation key"
	});

	if (!selectedTranslationKey) {
		return;
	}

	const projectApi = new ProjectAPI(apiKey);
	await projectApi.updateTranslation(selectedTranslationKey.translationKey, selectedTranslationKey.namespace, selectedLanguage.key, selectedText);
	onContentChanged.fire();
}

