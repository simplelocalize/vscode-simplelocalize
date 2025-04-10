import * as vscode from 'vscode';
import { ProjectAPI } from './api';
import { ProjectDetails } from './apiTypes';
import { getProjectApiKey, getProjectToken, onContentChanged, onProjectChanged } from './extension';
import { repository } from './repository';
import { createMessageEntry, createQuickPickLanguageItems, createQuickPickNamespacesItems, isProjectWithNamespaces } from './utils';
import { Key } from 'readline';

enum TreeKeyType {
    TranslationKey = "translation-key",
    Translation = "translation",
    ViewTranslations = "translation-group",
    ViewTags = "tag-group",
    ViewDescription = "description-group",
    Tag = "tag"
}

interface KeyNamespace {
    key: string;
    namespace: string;
}

interface SimpleLocalizeTranslationKeyItem extends vscode.TreeItem {
    keyNamespace: KeyNamespace;
    type: TreeKeyType;
    children?: SimpleLocalizeOptionsItem[];
}

interface SimpleLocalizeOptionsItem extends vscode.TreeItem {
    keyNamespace: KeyNamespace;
    type: TreeKeyType;
    keyDetails?: any;
}

interface SimpleLocalizeTranslationItem extends vscode.TreeItem {
    keyNamespace: KeyNamespace;
    type: TreeKeyType;
    languageKey: string;
    text: string;
}


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

        if (element) {
            const keyNamespace = element.keyNamespace;
            if (element.type === TreeKeyType.TranslationKey) {
                const apiKey = getProjectApiKey();
                if (!apiKey) {
                    return [];
                }

                const projectApi = new ProjectAPI(apiKey);
                const { key, namespace } = keyNamespace;
                const translationKeyDetails = await projectApi.getTranslationKeyDetails(key, namespace);

                const charactersLimit = translationKeyDetails?.charactersLimit || 0;
                const formattedLimit = charactersLimit > 0 ? `max ${charactersLimit} characters` : "";
                element.children = [
                    createGroupEntry('Translations', 'quote', formattedLimit, TreeKeyType.ViewTranslations, keyNamespace, translationKeyDetails)
                ];

                const tags = translationKeyDetails?.tags || [];
                if (tags.length > 0) {
                    const formattedTagNumber = tags.length > 0 ? `${tags.length}` : "";
                    const entry = createGroupEntry('Tags', 'tag', formattedTagNumber, TreeKeyType.ViewTags, keyNamespace, translationKeyDetails)
                    element.children.push(entry);
                }

                const description = translationKeyDetails?.description || "";
                if (description) {
                    const descriptionItem = new vscode.TreeItem(description, vscode.TreeItemCollapsibleState.None);
                    descriptionItem.iconPath = new vscode.ThemeIcon('note');
                    descriptionItem.tooltip = description;
                    descriptionItem.type = TreeKeyType.ViewDescription;
                    element.children.push(descriptionItem);
                }
                return Promise.resolve(element?.children ?? []);
            }
            if (element.type === TreeKeyType.ViewTranslations) {
                element.children = await createTranslationEntries(keyNamespace);
                return Promise.resolve(element?.children ?? []);
            }
            if (element.type === TreeKeyType.ViewTags) {
                return Promise.resolve(element?.children ?? []);
            }
        }

        if (recordsFiltered.length === 0) {
            return [createMessageEntry('No translation keys found')];
        }

        return Promise.resolve(recordsFiltered.map(item => {
            item.collapsibleState = expandedItems.get(item?.keyNamespace?.key) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
            return item;
        }));
    };

    const createTranslationEntry = (keyNamespace: KeyNamespace, languageKey: string, translation: string): SimpleLocalizeTranslationItem => {
        const item = new vscode.TreeItem(languageKey, vscode.TreeItemCollapsibleState.None);
        item.description = translation;
        item.contextValue = 'simplelocalizeTranslation';
        return { keyNamespace, languageKey, text: translation, type: TreeKeyType.Translation, ...item };
    };

    const createKeyEntry = (keyNamespace: KeyNamespace): SimpleLocalizeTranslationKeyItem => {
        const item = new vscode.TreeItem(keyNamespace?.key, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = 'simplelocalizeTranslationKey';
        item.description = keyNamespace?.namespace || "";
        return { keyNamespace, type: TreeKeyType.TranslationKey, children: [], ...item };
    };

    const createGroupEntry = (name: string, icon: string, description: string, type: TreeKeyType, keyNamespace: KeyNamespace, keyDetails: any): any => {
        const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon(icon);
        item.description = description;
        const tagEntries = createTagEntries(keyNamespace, keyDetails);
        return { type, children: tagEntries, keyNamespace, keyDetails, ...item };
    };

    const createTagEntries = (keyNamespace: KeyNamespace, keyDetails: any): SimpleLocalizeOptionsItem[] => {
        const tags = keyDetails?.tags || [];
        if (tags.length === 0) {
            return [createMessageEntry('No tags found')];
        }
        return tags.map((tag: { name: string }) => createTagEntry(tag.name, keyNamespace));
    };

    const createTagEntry = (tag: string, keyNamespace: KeyNamespace): SimpleLocalizeOptionsItem => {
        const item = new vscode.TreeItem(tag, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'simplelocalizeTag';
        item.iconPath = new vscode.ThemeIcon("tag");
        return { type: TreeKeyType.Tag, keyNamespace, ...item };
    };


    const createTranslationEntries = async (keyNamespace: KeyNamespace): Promise<SimpleLocalizeTranslationItem[]> => {

        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return [];
        }
        const projectApi = new ProjectAPI(apiKey);

        const { key, namespace } = keyNamespace;
        const keyTranslations = await projectApi.getTranslationsForKey(key, namespace);
        const languageKeys = project?.languages?.map((lang) => lang.key) || [];
        return languageKeys
            .map((languageKey) => {
                const translation = keyTranslations.find((item: { language: string }) => item.language === languageKey)?.text || "";
                return createTranslationEntry(keyNamespace, languageKey!, translation);
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

                const recordsMapped = translationKeys.map(item => createKeyEntry({
                    key: item.key,
                    namespace: item?.namespace || ""
                }));
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
            recordsFiltered = records.filter(item => item?.keyNamespace?.key.includes(query));
        } else {
            recordsFiltered = records;
        }
        searchQuery = query;
        onDidChangeTreeData.fire();
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
        let maxSteps = 3;
        let currentStep = 1;
        const hasNamespaces = isProjectWithNamespaces();
        if (hasNamespaces) {
            maxSteps = 4;
            const namespaceOptions = createQuickPickNamespacesItems();
            const selectedNamespace = await vscode.window.showQuickPick(namespaceOptions, {
                title: `Add new translation key (${currentStep++}/${maxSteps})`,
                placeHolder: "Choose namespace",
            });
            namespace = selectedNamespace?.value || "";
        }

        const localTranslationKeys = repository.findAllTranslationKeys();
        const localTranslationKeysByNamespace = localTranslationKeys.filter(item => item.namespace === namespace);



        const translationKey = await vscode.window.showInputBox({
            value: inputText || "",
            placeHolder: "Enter translation key",
            title: `Add new translation key (${currentStep++}/${maxSteps})`,
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


        if (!translationKey) {
            return;
        }

        await projectApi.addTranslationKey(translationKey, namespace);
        onContentChanged.fire();
        vscode.window.showInformationMessage(`Translation key "${translationKey}" added.`);

        const languageQuickPickOptions = createQuickPickLanguageItems();
        const selectedLanguage = await vscode.window.showQuickPick(languageQuickPickOptions, {
            title: `Choose language for translation (${currentStep++}/${maxSteps})`,
            placeHolder: "Choose language"
        });

        if (!selectedLanguage) {
            return;
        }

        const translation = await vscode.window.showInputBox({
            value: "",
            placeHolder: "Enter translation",
            title: `Add translation (${currentStep}/${maxSteps})`,
        });

        await projectApi.updateTranslation(translationKey, namespace, selectedLanguage.key, translation);
        onContentChanged.fire();
    });

    vscode.commands.registerCommand('simplelocalize.copyTranslationKey', async (active: SimpleLocalizeTranslationKeyItem) => {

        const item = active || treeView?.selection?.[0];
        if (!item) {
            return;
        }

        const selectedItems = treeView.selection;
        const isSingleElement = selectedItems.length === 1;
        if (item || isSingleElement) {

            if (item.type === TreeKeyType.ViewDescription) {
                await vscode.env.clipboard.writeText(item?.description || "");
                vscode.window.showInformationMessage(`Copied description to clipboard.`);
                return;
            }

            await vscode.env.clipboard.writeText(item?.keyNamespace?.key);
            vscode.window.showInformationMessage(`Copied key "${item?.keyNamespace?.key}" to clipboard.`);
            return;
        }

        if (selectedItems.length > 1) {
            vscode.window.showInformationMessage(`Copied ${selectedItems.length} keys to clipboard.`);
            const keys = selectedItems.map(item => item?.keyNamespace?.key).join('\n');
            await vscode.env.clipboard.writeText(keys);
            return;
        }
    });

    vscode.commands.registerCommand('simplelocalize.editEntry', async (item: SimpleLocalizeTranslationKeyItem | SimpleLocalizeTranslationItem) => {
        const isKey = item.type === TreeKeyType.TranslationKey;
        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }

        if (isKey) {
            const newKey = await vscode.window.showInputBox({
                placeHolder: "Edit translation key",
                value: item?.keyNamespace?.key
            });
            if (newKey && newKey !== item?.keyNamespace?.key) {
                await projectApi.updateTranslationKey(item?.keyNamespace?.key, item?.keyNamespace?.namespace, newKey, item?.keyNamespace?.namespace);
                onContentChanged.fire();
            }
        }

        const isTranslation = item.type === TreeKeyType.Translation;
        if (isTranslation) {
            const translationItem = item as SimpleLocalizeTranslationItem;
            const newTranslation = await vscode.window.showInputBox({
                placeHolder: "Edit translation",
                value: translationItem.text
            });
            if (newTranslation && newTranslation !== translationItem.text) {
                await projectApi.updateTranslation(item?.keyNamespace?.key, item?.keyNamespace?.namespace, translationItem.languageKey, newTranslation);
                onContentChanged.fire();
            }
        }
        await vscode.commands.executeCommand('simplelocalize.refreshProject');
    });

    vscode.commands.registerCommand('simplelocalize.clearTranslation', async (item: SimpleLocalizeTranslationKeyItem | SimpleLocalizeTranslationItem) => {
        const projectApi = getProjectApi();
        if (!projectApi) {
            return;
        }

        const isTranslation = item.type === TreeKeyType.Translation;
        if (isTranslation) {
            console.log("Clearing translation for item", item?.keyNamespace);
            const translationItem = item as SimpleLocalizeTranslationItem;
            await projectApi.updateTranslation(item?.keyNamespace?.key, item?.keyNamespace?.namespace, translationItem.languageKey, '');
            onContentChanged.fire();
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
            value: item?.keyNamespace?.namespace
        });

        if (selectedItems.length > 1) {
            for (const item of selectedItems) {
                await projectApi.updateTranslationKey(item?.keyNamespace?.key, item?.keyNamespace?.namespace, item?.keyNamespace?.key, newNamespace);
            }
        } else {
            await projectApi.updateTranslationKey(item?.keyNamespace?.key, item?.keyNamespace?.namespace, item?.keyNamespace?.key, newNamespace);
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
                    await projectApi.deleteTranslationKey(item?.keyNamespace?.key, item?.keyNamespace?.namespace);
                }
                onContentChanged.fire();
            }
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the key "${item?.keyNamespace?.key}"?`,
            { modal: true },
            'Yes'
        );
        if (confirm === 'Yes') {
            await projectApi.deleteTranslationKey(item?.keyNamespace?.key, item?.keyNamespace?.namespace);
            onContentChanged.fire();
        }
    });

    vscode.commands.registerCommand('simplelocalize.openInWebUi', async (active: SimpleLocalizeTranslationKeyItem) => {
        const item = active || treeView?.selection?.[0];
        if (!item) {
            return;
        }
        const projectToken = getProjectToken();
        const namespace = item?.keyNamespace?.namespace || "";
        const translationKey = item?.keyNamespace?.key;
        const url = `https://simplelocalize.io/dashboard/projects/?hash=${projectToken}&translationKey.condition=EXACT_MATCH&translationKey.text=${translationKey}&translationKey.caseSensitive=true&namespace=${namespace}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
    });;

    treeView.onDidExpandElement(event => {
        const element = event.element as SimpleLocalizeTranslationKeyItem;
        expandedItems.set(element?.keyNamespace?.key, true);
    });

    treeView.onDidCollapseElement(event => {
        const element = event.element as SimpleLocalizeTranslationKeyItem;
        expandedItems.set(element?.keyNamespace?.key, false);
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
