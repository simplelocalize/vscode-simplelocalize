import * as vscode from 'vscode';
import { getProjectApiKey, getProjectToken } from './extension';


export async function registerActionsMenu(context: vscode.ExtensionContext) {

    vscode.commands.registerCommand('simplelocalize.web.translations', async () => {
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}`));
    });

    vscode.commands.registerCommand('simplelocalize.web.languages', async () => {
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=languages`));
    });

    vscode.commands.registerCommand('simplelocalize.web.hosting', async () => {
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=hosting`));
    });

    vscode.commands.registerCommand('simplelocalize.web.activity', async () => {
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=activity`));
    });

    vscode.commands.registerCommand('simplelocalize.web.data', async () => {
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=data`));
    });

    vscode.commands.registerCommand('simplelocalize.web.settings', async () => {
        vscode.env.openExternal(vscode.Uri.parse(`https://simplelocalize.io/dashboard/projects/?hash=${getProjectToken()}&tab=settings`));
    });
}