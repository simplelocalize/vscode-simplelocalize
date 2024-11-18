import * as vscode from 'vscode';
import { getProjectToken } from './extension';


export async function registerWebUiActionsMenu(context: vscode.ExtensionContext) {

    function validateConfiguration() {
        if (!getProjectToken()) {
            vscode.window.showErrorMessage("SimpleLocalize extension is not configured.");
            return;
        }
    }

    vscode.commands.registerCommand('simplelocalize.web.translations', async () => {
        validateConfiguration();
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}`));
    });

    vscode.commands.registerCommand('simplelocalize.web.languages', async () => {
        validateConfiguration();
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=languages`));
    });

    vscode.commands.registerCommand('simplelocalize.web.hosting', async () => {
        validateConfiguration();
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=hosting`));
    });

    vscode.commands.registerCommand('simplelocalize.web.activity', async () => {
        validateConfiguration();
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=activity`));
    });

    vscode.commands.registerCommand('simplelocalize.web.data', async () => {
        validateConfiguration();
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=data`));
    });

    vscode.commands.registerCommand('simplelocalize.web.settings', async () => {
        validateConfiguration();
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=settings`));
    });
}