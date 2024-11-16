import * as vscode from 'vscode';
import { ProjectAPI } from './api';
import { ProjectDetails } from './apiTypes';
import { getProjectApiKey, getProjectToken, onContentChanged, onProjectChanged } from './extension';
import { repository } from './repository';
import { createMessageEntry, createQuickPickNamespacesItems, isProjectWithNamespaces } from './utils';

export function registerSidebarTranslations(context: vscode.ExtensionContext) {
    let recordsFiltered: SimpleLocalizeTranslationKeyItem[] = [];
    let records: SimpleLocalizeTranslationKeyItem[] = [];
    let isRefreshing = false;
    let project: ProjectDetails = repository.findProjectDetails();
    let searchQuery = "";
    let expandedItems = new Map<string, boolean>();

    const getProjectApi = (): ProjectAPI | null => {
        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return null;
        }
        return new ProjectAPI(apiKey);
    };

    const onDidChangeTreeData: vscode.EventEmitter<SimpleLocalizeTranslationKeyItem | undefined | void> = new vscode.EventEmitter<SimpleLocalizeTranslationKeyItem | undefined | void>();

    const getChildren = async (element?: SimpleLocalizeTranslationKeyItem): Promise<any[]> => {

        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return [createMessageEntry('Project not configured')];
        }

        if (element && element.type === "translaiton-key") {
            element.children = await fetchKeyDetails(element.translationKey, element.namespace);
            return Promise.resolve(element.children);
        }

        if (recordsFiltered.length === 0) {
            return [createMessageEntry('No translation keys found')];
        }

        return Promise.resolve(recordsFiltered.map(item => {
            item.collapsibleState = expandedItems.get(item.translationKey) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
            return item;
        }));
    };

    const fetchKeyDetails = async (translationKey: string, namespace: string = ""): Promise<SimpleLocalizeTranslationItem[]> => {

        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return [];
        }
        const projectApi = new ProjectAPI(apiKey);

        const keyTranslations = await projectApi.getTranslationsForKey(translationKey, namespace);
        const languageKeys = project?.languages?.map((lang) => lang.key) || [];
        return languageKeys
            .map((languageKey) => {
                const translation = keyTranslations.find((item: { language: string }) => item.language === languageKey)?.text || "";
                return createTranslationEntry(translationKey, namespace, languageKey!, translation);
            });

    };

    const refresh = async (): Promise<void> => {
        if (isRefreshing) {
            return;
        }

        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }

        console.log(`[Translations list] Refreshing translations list...`);
        isRefreshing = true;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Loading translations from SimpleLocalize...",
            cancellable: false
        }, async () => {
            try {
                project = await projectApi.getProjectDetails();
                repository.storeProjectDetails(project);

                const translationKeys = await projectApi.getAllTranslationKeys();

                const translationKeysEntities = translationKeys.map(item => ({ translationKey: item.key, namespace: item.namespace }));
                repository.storeTranslationKeys(translationKeysEntities);

                const recordsMapped = translationKeys.map(item => createKeyEntry(item.key, item.namespace));
                records = recordsMapped;
                recordsFiltered = recordsMapped;


            } catch (error: any) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            } finally {
                onDidChangeTreeData.fire();
                onContentChanged.fire();
                isRefreshing = false;
                console.log(`[Translations list] Refreshed translations list`);
            }
        });
    };

    const search = (query: string): void => {
        if (query) {
            recordsFiltered = records.filter(item => item.translationKey.includes(query));
        } else {
            recordsFiltered = records;
        }
        searchQuery = query;
        onDidChangeTreeData.fire();
    };

    const createTranslationEntry = (translationKey: string, namespace: string, languageKey: string, translation: string): SimpleLocalizeTranslationItem => {
        const item = new vscode.TreeItem(languageKey, vscode.TreeItemCollapsibleState.None);
        item.description = translation;
        item.contextValue = 'simplelocalizeTranslation';
        return { translationKey, namespace, languageKey, text: translation, type: "translation", ...item };
    };

    const createKeyEntry = (translationKey: string, namespace: string): SimpleLocalizeTranslationKeyItem => {
        const item = new vscode.TreeItem(translationKey, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = 'simplelocalizeTranslationKey';
        item.description = namespace;
        return { translationKey, namespace, type: "translaiton-key", children: [], ...item };
    };

    const treeDataProvider: vscode.TreeDataProvider<SimpleLocalizeTranslationKeyItem> = {
        onDidChangeTreeData: onDidChangeTreeData.event,
        getTreeItem: (element: SimpleLocalizeTranslationKeyItem) => element,
        getChildren
    };

    const treeView = vscode.window.createTreeView('simplelocalize.translationsList', {
        treeDataProvider,
        canSelectMany: true,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    vscode.commands.registerCommand('simplelocalize.searchTree', async () => {

        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }

        const searchInput = vscode.window.createQuickPick();
        searchInput.placeholder = 'Search keys...';
        searchInput.value = searchQuery;
        searchInput.onDidChangeValue(value => {
            search(value);
        });
        searchInput.show();
    });

    vscode.commands.registerCommand('simplelocalize.addTranslationKey', async (inputText: string) => {
        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }

        let namespace = "";
        const hasNamespaces = isProjectWithNamespaces();
        if (hasNamespaces) {
            const namespaceOptions = createQuickPickNamespacesItems();
            const selectedNamespace = await vscode.window.showQuickPick(namespaceOptions, {
                title: "Add new translation key (1/2)",
                placeHolder: "Choose namespace",
            });
            namespace = selectedNamespace?.value || "";
        }

        const localTranslationKeys = repository.findAllTranslationKeys();
        const localTranslationKeysByNamespace = localTranslationKeys.filter(item => item.namespace === namespace);

        const translationKey = await vscode.window.showInputBox({
            value: inputText || "",
            placeHolder: "Enter translation key",
            title: hasNamespaces ? "Add new translation key (2/2)" : "Add new translation key",
            validateInput: (value) => {
                if (!value) {
                    return "Key is required";
                }
                const exists = localTranslationKeysByNamespace.find(item => item.translationKey === value);
                if (exists) {
                    if (hasNamespaces) {
                        return `Key "${value}" already exists in namespace "${namespace}"`;
                    } else {
                        return `Key "${value}" already exists`;
                    }
                }
                return null;
            }
        });

        if (translationKey) {
            await projectApi.addTranslationKey(translationKey, namespace);
            onContentChanged.fire();
        }
    });

    vscode.commands.registerCommand('simplelocalize.copyTranslationKey', async (active: SimpleLocalizeTranslationKeyItem) => {

        const item = active || treeView?.selection?.[0];
        if (!item) {
            return;
        }

        const selectedItems = treeView.selection;
        const isSingleElement = selectedItems.length === 1;
        if (item || isSingleElement) {
            await vscode.env.clipboard.writeText(item.translationKey);
            vscode.window.showInformationMessage(`Copied key "${item.translationKey}" to clipboard.`);
            return;
        }

        if (selectedItems.length > 1) {
            vscode.window.showInformationMessage(`Copied ${selectedItems.length} keys to clipboard.`);
            const keys = selectedItems.map(item => item.translationKey).join('\n');
            await vscode.env.clipboard.writeText(keys);
            return;
        }
    });


    vscode.commands.registerCommand('simplelocalize.editEntry', async (item: SimpleLocalizeTranslationKeyItem | SimpleLocalizeTranslationItem) => {
        const isKey = item.type === "translaiton-key";
        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }

        if (isKey) {
            const newKey = await vscode.window.showInputBox({
                placeHolder: "Edit translation key",
                value: item.translationKey
            });
            if (newKey && newKey !== item.translationKey) {
                await projectApi.updateTranslationKey(item.translationKey, item.namespace, newKey, item.namespace);
                onContentChanged.fire();
            }
        }

        const isTranslation = item.type === "translation";
        if (isTranslation) {
            const translationItem = item as SimpleLocalizeTranslationItem;
            const newTranslation = await vscode.window.showInputBox({
                placeHolder: "Edit translation",
                value: translationItem.text
            });
            if (newTranslation && newTranslation !== translationItem.text) {
                await projectApi.updateTranslation(item.translationKey, item.namespace, translationItem.languageKey, newTranslation);
                onContentChanged.fire();
            }
        }
    });

    vscode.commands.registerCommand('simplelocalize.changeNamespace', async (active: SimpleLocalizeTranslationKeyItem) => {
        const item = active || treeView?.selection?.[0];
        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }
        if (!item) {
            return;
        }
        const selectedItems = treeView.selection;

        const newNamespace = await vscode.window.showInputBox({
            placeHolder: "Edit namespace",
            value: item.namespace
        });

        if (selectedItems.length > 1) {
            for (const item of selectedItems) {
                await projectApi.updateTranslationKey(item.translationKey, item.namespace, item.translationKey, newNamespace);
            }
        } else {
            await projectApi.updateTranslationKey(item.translationKey, item.namespace, item.translationKey, newNamespace);
        }
        onContentChanged.fire();
    });

    vscode.commands.registerCommand('simplelocalize.deleteTranslationKey', async (active: SimpleLocalizeTranslationKeyItem) => {
        const item = active || treeView?.selection?.[0];
        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }
        if (!item) {
            return;
        }
        const selectedItems = treeView.selection;
        if (selectedItems.length > 1) {
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete ${selectedItems.length} selected keys?`,
                { modal: true },
                'Yes'
            );

            if (confirm === 'Yes') {
                for (const item of selectedItems) {
                    await projectApi.deleteTranslationKey(item.translationKey, item.namespace);
                }
                onContentChanged.fire();
            }
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the key "${item.translationKey}"?`,
            { modal: true },
            'Yes'
        );
        if (confirm === 'Yes') {
            await projectApi.deleteTranslationKey(item.translationKey, item.namespace);
            onContentChanged.fire();
        }
    });


    vscode.commands.registerCommand('simplelocalize.openInWebUi', async (active: SimpleLocalizeTranslationKeyItem) => {
        const item = active || treeView?.selection?.[0];
        if (!item) {
            return;
        }
        const projectToken = getProjectToken();
        const namespace = item?.namespace || "";
        const translationKey = item.translationKey;
        const url = `https://simplelocalize.io/dashboard/projects/?hash=${projectToken}&translationKey.condition=EXACT_MATCH&translationKey.text=${translationKey}&translationKey.caseSensitive=true&namespace=${namespace}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
    });;

    treeView.onDidExpandElement(event => {
        const element = event.element as SimpleLocalizeTranslationKeyItem;
        expandedItems.set(element.translationKey, true);
    });

    treeView.onDidCollapseElement(event => {
        const element = event.element as SimpleLocalizeTranslationKeyItem;
        expandedItems.set(element.translationKey, false);
    });

    vscode.commands.registerCommand('simplelocalize.refreshTree', refresh);

    onProjectChanged.event(() => {
        recordsFiltered = [];
        records = [];
        isRefreshing = false;
        project = {};
        searchQuery = "";
        expandedItems = new Map<string, boolean>();
        onDidChangeTreeData.fire();
        refresh();
    });

    onContentChanged.event(() => {
        refresh();
    });


    const projectApi = getProjectApi();
    if (!projectApi) {
        return;
    }

    refresh();

}

interface SimpleLocalizeTranslationKeyItem extends vscode.TreeItem {
    translationKey: string;
    namespace: string;
    type: string;
    children?: SimpleLocalizeTranslationItem[];
}

interface SimpleLocalizeTranslationItem extends vscode.TreeItem {
    translationKey: string;
    namespace: string;
    type: string;
    languageKey: string;
    text: string;
}
