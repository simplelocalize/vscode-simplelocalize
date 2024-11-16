import * as vscode from 'vscode';
import { repository, TranslationKey } from './repository';
import { onContentChanged, onProjectChanged } from './extension';

export class SimpleLocalizeCompletionProvider implements vscode.CompletionItemProvider {

	private translationKeys: TranslationKey[] = [];

	refresh() {
		console.log('[Code completition] Refreshing translation keys');
		this.translationKeys = repository.findAllTranslationKeys();
		console.log(`[Code completition] Found ${this.translationKeys.length} translation keys`);
	}

	clear() {
		console.log('[Code completition] Clearing translation keys');
		this.translationKeys = [];
	}

	provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): vscode.CompletionItem[] {
		return this.translationKeys.map(entry => {
			const { translationKey, namespace } = entry;
			const item = new vscode.CompletionItem(translationKey, vscode.CompletionItemKind.Keyword);
			item.detail = "Translation key in SimpleLocalize";
			return item;
		});
	}
}

export function registerCodeCompletition(context: vscode.ExtensionContext) {

	const provider = new SimpleLocalizeCompletionProvider();
	onContentChanged.event(() => {
		provider.refresh();
	});

	onProjectChanged.event(() => {
		provider.clear();
	});

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: '*' }, provider));
}

export function deactivate() { }