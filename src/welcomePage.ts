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

                const headerPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'header.png');
                const header = currentPanel.webview.asWebviewUri(headerPath);

                const helpPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'help.png');
                const help = currentPanel.webview.asWebviewUri(helpPath);

                currentPanel.webview.html = getWebviewContent(logo, header, help);

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
function getWebviewContent(logo: vscode.Uri, header: vscode.Uri, help: vscode.Uri) {
    const isDarkMode = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    const logoMediaPath = isDarkMode ? 'icon--light.svg' : 'icon.svg';

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SimpleLocalize Welcome Page</title>
        </head>
        <body>
            <img src="${logo}" alt="SimpleLocalize Logo" style="margin-top: 20px;" height="50" />
            <h1>
            SimpleLocalize: Welcome page
            </h1>
            <p>
            Welcome to SimpleLocalize Extension for Visual Studio Code!<br/>
            SimpleLocalize is an app that helps you to manage your translations in a more efficient way.<br/>
            To start, you will need to:
            <br/>
            <br/>
            1. <a href="https://simplelocalize.io">Sign up</a> or <a href="https://simplelocalize.io/dashboard">sign in</a> to SimpleLocalize
            <br/><br/>
            2. <a href="https://simplelocalize.io/dashboard/security/">Get your personal token</a> from your profile page
            <br/><br/>
            3. <a href="#" id="configure">Configure extension</a> with your personal token and choose a project for your workspace

            </p>

            <img 
            src=${header} 
            alt="header" 
            style="object-fit: contain;" 
            height="400"
             />

           
            <h2>Need help?</h2>
            <p>
            If you need help, you can visit our extension <a href="https://github.com/simplelocalize/vscode-simplelocalize">GitHub repository</a> page or <a href="https://simplelocalize.io/docs/general/support/">contact us directly</a>.
            <br/>You will find more useful links in the "Help and Feedback" section.
            </p>

            <img src=${help} alt="help" 
            style="object-fit: contain;"
            height="400" />

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