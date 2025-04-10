import * as vscode from 'vscode';
import { registerCodeActions } from './codeAction';
import { registerCodeCompletition } from './codeCompletition';
import { registerActionsMenu } from './menuCliActions';
import { initializeProject, registerConfigurationMenu } from './menuConfiguration';
import { repository } from './repository';
import { registerSidebarHelp } from './sidebarHelp';
import { registerSidebarProject } from './sidebarProject';
import { registerSidebarTranslations as registerTranslationsList } from './sidebarTranslations';
import { registerWelcomePage } from './welcomePage';
import { registerWebUiActionsMenu } from './menuWebActions';
import { registerSidebarActivity } from './sidebarActivity';
let globalContext: vscode.ExtensionContext;

export const onProjectChanged = new vscode.EventEmitter<void>();
export const onContentChanged = new vscode.EventEmitter<void>();

export async function activate(context: vscode.ExtensionContext) {
	globalContext = context;
	initializeProject(context);
	registerConfigurationMenu(context);
	registerCodeCompletition(context);
	registerCodeActions(context);
	registerActionsMenu(context);
	registerWebUiActionsMenu(context);
	registerTranslationsList(context);
	registerSidebarProject(context);
	registerSidebarActivity(context);
	registerSidebarHelp(context);
	registerWelcomePage(context);

	onProjectChanged.event(() => {
		console.log('Project changed event');
	});

	onContentChanged.event(() => {
		console.log('Content changed event');
	});
}

// Project //
export async function updateProject(apiKey: string, projectToken: string) {
	await globalContext.workspaceState.update('apiKey', apiKey);
	await globalContext.workspaceState.update('projectToken', projectToken);
	onProjectChanged.fire();
}

export function getProjectToken(): string | undefined {
	return globalContext.workspaceState.get('projectToken');
}

export function getProjectApiKey(): string | undefined {
	return globalContext.workspaceState.get('apiKey');
}

export async function clearProject() {
	console.log('Clearing project credentials');
	await globalContext.workspaceState.update('apiKey', undefined);
	await globalContext.workspaceState.update('projectToken', undefined);
	onProjectChanged.fire();
}

// Personal Token //
export async function updatePersonalToken(token: string): Promise<string | undefined> {
	const secretStorage = globalContext.secrets;
	await secretStorage.store('simplelocalize.personalToken', token);
	return token;
}

export async function getPersonalToken(): Promise<string | undefined> {
	const secretStorage = globalContext.secrets;
	const personalToken = await secretStorage.get('simplelocalize.personalToken');
	return personalToken;
}

export function clearPersonalToken() {
	console.log('Clearing personal token');
	const secretStorage = globalContext.secrets;
	secretStorage.delete('simplelocalize.personalToken');
}

// Clear all //
export async function clearAll() {
	repository.purgeAll();
	await clearProject();
	await clearPersonalToken();
}

// This method is called when your extension is deactivated
export function deactivate() { }

