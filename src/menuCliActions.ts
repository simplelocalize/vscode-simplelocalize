import * as vscode from 'vscode';
import { getProjectApiKey } from './extension';

const TERMINAL_NAME = 'SimpleLocalize CLI Extension';

function selectTerminal(context: vscode.ExtensionContext): any {
    const terminals = vscode.window.terminals;
    const foundTerminal = terminals.find(t => t.name === TERMINAL_NAME);
    if (foundTerminal) {
        return foundTerminal;
    }

    const terminal = vscode.window.createTerminal({
        iconPath: {
            light: vscode.Uri.joinPath(context.extensionUri, "media", "icon.svg"),
            dark: vscode.Uri.joinPath(context.extensionUri, "media", "icon--light.svg")
        },
        name: TERMINAL_NAME,
        hideFromUser: false
    });
    return terminal;
}


export async function registerActionsMenu(context: vscode.ExtensionContext) {
    let NEXT_TERM_ID = 1;

    vscode.commands.registerCommand('simplelocalize.cli.download', async () => {
        selectTerminal(context).sendText('simplelocalize download --apiKey ' + getProjectApiKey(), false);
        selectTerminal(context).show();
    });
    vscode.commands.registerCommand('simplelocalize.cli.upload', async () => {
        selectTerminal(context).sendText('simplelocalize upload --apiKey ' + getProjectApiKey(), false);
        selectTerminal(context).show();
    });

    vscode.commands.registerCommand('simplelocalize.cli.auto-translate', async () => {
        selectTerminal(context).sendText('simplelocalize auto-translate --apiKey ' + getProjectApiKey(), false);
        selectTerminal(context).show();
    });

    vscode.commands.registerCommand('simplelocalize.cli.hosting.publish', async () => {
        selectTerminal(context).sendText('simplelocalize publish --apiKey ' + getProjectApiKey(), false);
        selectTerminal(context).show();
    });

    vscode.commands.registerCommand('simplelocalize.cli.hosting.pull', async () => {
        selectTerminal(context).sendText('simplelocalize pull --apiKey ' + getProjectApiKey(), false);
        selectTerminal(context).show();
    });
}