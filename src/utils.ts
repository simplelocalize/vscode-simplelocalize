
import * as vscode from 'vscode';
import { repository, TranslationKey } from './repository';

export const createMessageEntry = (message: string): vscode.TreeItem => {
    return {
        label: message,
        iconPath: new vscode.ThemeIcon('info'),
        contextValue: 'info-state',
        collapsibleState: vscode.TreeItemCollapsibleState.None
    };
};


interface LanguageKeyQuickPickItem extends vscode.QuickPickItem {
    key: string;
}

export const createQuickPickLanguageItems = (): LanguageKeyQuickPickItem[] => {
    const project = repository.findProjectDetails();
    const languages = project?.languages || [];

    if (languages.length === 0) {
        vscode.window.showErrorMessage("No languages found in project");
        return [];
    }

    return languages.map(entry => ({
        label: entry.name || "No display name",
        detail: entry.key,
        key: entry.key!,
        iconPath: new vscode.ThemeIcon("globe")
    }));
};

interface TranslationKeyQuickPickItem extends vscode.QuickPickItem {
    translationKey: string;
    namespace: string;
}

export const isProjectWithNamespaces = (): boolean => {
    const project = repository.findProjectDetails();
    return (project?.namespaces || []).length > 0;
};


export const createQuickPickTranslationKeyItems = (): TranslationKeyQuickPickItem[] => {
    const translationKeys = repository.findAllTranslationKeys();
    return translationKeys.map(entry => ({
        label: entry.translationKey,
        detail: entry.namespace,
        translationKey: entry.translationKey,
        namespace: entry?.namespace || ""
    }));
};

interface NamespaceQuickPickItem extends vscode.QuickPickItem {
    value: string;
}

export const createQuickPickNamespacesItems = (): NamespaceQuickPickItem[] => {
    const project = repository.findProjectDetails();
    const namespaceNames = (project?.namespaces || [])?.map(entry => entry.name) || [];
    const translationKeys = repository.findAllTranslationKeys();
    const namespaceOptions = ["", ...namespaceNames];
    const uniqueNamespaceOptions = Array.from(new Set(namespaceOptions));
    return uniqueNamespaceOptions
        .map(namespaceName => {
            const countTranslationKeys = translationKeys.filter(translationKey => translationKey.namespace === namespaceName).length;
            return ({
                label: namespaceName || "No namespace",
                value: namespaceName || "",
                detail: `${countTranslationKeys} translation keys`
            });
        });
};