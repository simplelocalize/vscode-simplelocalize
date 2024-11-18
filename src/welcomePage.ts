import * as vscode from 'vscode';
import { startInitalConfiguration } from './menuConfiguration';
import { getPersonalToken, getProjectToken } from './extension';

export function registerWelcomePage(context: vscode.ExtensionContext) {

    let currentPanel: vscode.WebviewPanel | undefined = undefined;

    context.subscriptions.push(
        vscode.commands.registerCommand('simplelocalize.welcome', () => {

            const columnToShowIn = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.viewColumn
                : undefined;

            if (currentPanel) {
                // If we already have a panel, show it in the target column
                currentPanel.reveal(columnToShowIn);
            } else {
                currentPanel = vscode.window.createWebviewPanel(
                    'welcomePage',
                    'Welcome to SimpleLocalize',
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );

                const isDarkMode = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
                const logoMediaPath = isDarkMode ? 'icon--light.svg' : 'icon.svg';
                const logoOnDiskPath = vscode.Uri.joinPath(context.extensionUri, 'media', logoMediaPath);
                const logo = currentPanel.webview.asWebviewUri(logoOnDiskPath);
                currentPanel.webview.html = getWebviewContent(logo);
                currentPanel.webview.onDidReceiveMessage(async message => {
                    if (message.command === 'configure') {
                        await startInitalConfiguration(context);
                    }
                });
                currentPanel.onDidDispose(
                    () => {
                        currentPanel = undefined;
                    },
                    null,
                    context.subscriptions
                );
            }

        })
    );

    const personalToken = getPersonalToken();
    if (!personalToken) {
        vscode.commands.executeCommand('simplelocalize.welcome');
    }
}

function getWebviewContent(logo: vscode.Uri): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SimpleLocalize Welcome Page</title>
        </head>
        <body>
            <img src=${logo} alt="SimpleLocalize Logo" style="margin-top: 20px;" height="50" />
            <h1>SimpleLocalize Extension</h1>
            <p>Welcome to SimpleLocalize Extension for Visual Studio Code.</p>
            <h2>Configuration</h2>
            <p>
                The extension requires a personal token and a project token to work.<br/>
                To start, you need to <a href="https://simplelocalize.io/dashboard/security/?source=vsc-extension">generate a personal token</a> and <a href="#" id="configure">run the initial setup</a>.
            </p>
            <h2>Sidebars</h2>
            <p>The extension provides a sidebar with a list of translations and a project details view.</p>
            <h2>Actions</h2>
            <p>
                The extension provides a set of actions including those that interact with the <a href="https://simplelocalize.io/docs/cli/get-started/">SimpleLocalize CLI</a>.
            </p>
            <script>
                const vscode = acquireVsCodeApi();
                const configureLink = document.getElementById('configure');
                configureLink.addEventListener('click', () => {
                    vscode.postMessage({ command: 'configure' });
                });
            </script>
        </body>
        </html>
    `;
}