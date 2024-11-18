import * as vscode from 'vscode';

export function registerSidebarHelp(context: vscode.ExtensionContext) {

    const createKeyEntry = (label: string, icon: string, link: string): LinkEntry => {
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon(icon);
        item.tooltip = label;
        item.contextValue = 'simplelocalizeHelpEntry';
        return {
            ...item,
            label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            icon,
            link,
            command: {
                command: 'simplelocalize.openLink',
                title: 'Open Link',
                arguments: [link]
            }
        };
    };

    const entries: LinkEntry[] = [
        createKeyEntry('Welcome page', 'home', 'welcome-page'),
        createKeyEntry('Configure extension', 'gear', 'configure-extension'),
        createKeyEntry('GitHub repository', 'mark-github', 'https://github.com/simplelocalize/vscode-simplelocalize-extension'),
        createKeyEntry('Report issue', 'bug', 'https://github.com/simplelocalize/vscode-simplelocalize-extension/issues'),
        createKeyEntry('Feature requests', 'lightbulb', 'https://github.com/simplelocalize/vscode-simplelocalize-extension/issues'),
        createKeyEntry('Join Discord', 'comment-discussion', 'https://discord.gg/wpm5PTCxxG'),
        createKeyEntry('Integrations', 'plug', 'https://simplelocalize.io/integrations/'),
        createKeyEntry('Swagger UI', 'code', 'https://api.simplelocalize.io/openapi/swagger-ui/index.html'),
        createKeyEntry('SimpleLocalize: Dashboard', 'browser', 'https://simplelocalize.io/dashboard'),
        createKeyEntry('Documentation', 'file-text', 'https://simplelocalize.io/docs/'),
        createKeyEntry('Documentation: CLI', 'terminal', 'https://simplelocalize.io/docs/cli/get-started/'),
        createKeyEntry('Documentation: API', 'globe', 'https://simplelocalize.io/docs/api/get-started/'),
        createKeyEntry('Contact', 'mail', 'https://simplelocalize.io/docs/general/support/'),
        createKeyEntry('Changelog', 'notebook', 'https://simplelocalize.io/changelog/'),
        createKeyEntry('Privacy Policy', 'lock', 'https://simplelocalize.io/privacy-policy/'),
        createKeyEntry('Terms of Service', 'law', 'https://simplelocalize.io/tos/')
    ];
    const onDidChangeTreeData: vscode.EventEmitter<LinkEntry | undefined | void> = new vscode.EventEmitter<LinkEntry | undefined | void>();

    const getChildren = async (element?: LinkEntry): Promise<any[]> => entries;

    const treeDataProvider: vscode.TreeDataProvider<LinkEntry> = {
        onDidChangeTreeData: onDidChangeTreeData.event,
        getTreeItem: (element: LinkEntry) => element,
        getChildren
    };

    vscode.commands.registerCommand('simplelocalize.openLink', (link: string) => {

        if('configure-extension' === link){
            vscode.commands.executeCommand('simplelocalize.configuration');
            return;
        }

        if('welcome-page' === link){
            vscode.commands.executeCommand('simplelocalize.welcome');
            return;
        }

        vscode.env.openExternal(vscode.Uri.parse(link));
    });

    const treeView = vscode.window.createTreeView('simplelocalize.help', {
        treeDataProvider,
        canSelectMany: false,
        showCollapseAll: false
    });
  
    context.subscriptions.push(treeView);
}

interface LinkEntry extends vscode.TreeItem {
    label: string;
    icon: string;
    link: string;
}