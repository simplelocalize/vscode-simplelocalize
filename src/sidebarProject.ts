import * as vscode from 'vscode';
import { ProjectAPI } from './api';
import { getProjectApiKey, onContentChanged, onProjectChanged } from './extension';
import { createMessageEntry } from './utils';
import { repository } from './repository';
import { ProjectDetails } from './apiTypes';
import { c } from 'openapi-typescript/dist/index.js';

enum ProjectEntryType {
    PROJECT_NAME = 'project-name',
    LANGUAGES = 'languages',
    NAMESPACES = 'namespaces',
    CUSTOMERS = 'customers',
    ENVIRONMENTS = 'environments',
    LANGUAGE = 'language__',
    NAMESPACE = 'namespace__',
    CUSTOMER = 'customer__',
    ENVIRONMENT = 'environment__',
    RESOURCE = 'resource__'
}

export function registerSidebarProject(context: vscode.ExtensionContext) {

    const onDidChangeTreeData: vscode.EventEmitter<ProjectEntry | undefined | void> = new vscode.EventEmitter<ProjectEntry | undefined | void>();
    let project: ProjectDetails = repository.findProjectDetails() || {};

    const getChildren = async (element?: ProjectEntry): Promise<ProjectEntry[]> => {

        const apiKey = getProjectApiKey()!;
        if (!apiKey) {
            return [createMessageEntry('Project not configured')];
        }


        if (!project.projectToken) {
            return [createMessageEntry('Project not configured')];
        }

        if (element?.contextValue === ProjectEntryType.LANGUAGES) {
            const { languages = [] } = project;
            return languages.map((language: any) => {
                const item = new vscode.TreeItem(language.name, vscode.TreeItemCollapsibleState.None);
                item.description = language.key;
                item.languageKey = language.key;
                item.contextValue = ProjectEntryType.LANGUAGE + language.key;
                return item;
            });
        }

        if (element?.contextValue === ProjectEntryType.NAMESPACES) {
            const { namespaces = [] } = project;
            return namespaces.map((namespace: any) => {
                const item = new vscode.TreeItem(namespace.name, vscode.TreeItemCollapsibleState.None);
                return item;
            });
        }

        if (element?.contextValue === ProjectEntryType.CUSTOMERS) {
            const { customers = [] } = project;
            return customers.map((customer: any) => {
                const item = new vscode.TreeItem(customer.name, vscode.TreeItemCollapsibleState.None);
                return item;
            });
        }

        if (element?.contextValue === ProjectEntryType.ENVIRONMENTS) {
            const { environments = [] } = project;
            return environments.map((environment: any) => {
                const item = new vscode.TreeItem(environment.name, vscode.TreeItemCollapsibleState.Collapsed);
                item.description = environment.key;
                item.contextValue = ProjectEntryType.ENVIRONMENT + environment.key;
                return item;
            });
        }

        if (element?.contextValue?.startsWith(ProjectEntryType.ENVIRONMENT)) {

            const { hostingResources = [] } = project;
            const environmentKey = element.contextValue.replace(ProjectEntryType.ENVIRONMENT, "");
            const resources = hostingResources.filter((resource: any) => resource.key === environmentKey);
            return resources.map((resource: any) => {
                const simplifiedPath = resource.path.replace(project.projectToken + "/", "").replace(environmentKey + "/", "");
                const item = new vscode.TreeItem(simplifiedPath, vscode.TreeItemCollapsibleState.None);
                item.contextValue = ProjectEntryType.RESOURCE + resource.key;
                return {
                    ...item,
                    path: resource.path
                };
            });
        }


        const rootElements = [];

        const { keys = 0, name = "Unnamed" } = project;
        const projectNameItem = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
        projectNameItem.description = keys + ' keys';
        projectNameItem.contextValue = 'project-name';
        rootElements.push(projectNameItem);

        const { languages = [] } = project;
        const languagesItem = new vscode.TreeItem('Languages', vscode.TreeItemCollapsibleState.Collapsed);
        languagesItem.iconPath = new vscode.ThemeIcon('globe');
        languagesItem.description = languages.length + ' languages';
        languagesItem.contextValue = ProjectEntryType.LANGUAGES;
        rootElements.push(languagesItem);


        const { namespaces = [] } = project;
        const namespacesItem = new vscode.TreeItem('Namespaces', vscode.TreeItemCollapsibleState.Collapsed);
        namespacesItem.iconPath = new vscode.ThemeIcon('layers');
        namespacesItem.description = namespaces.length + ' namespaces';
        namespacesItem.contextValue = ProjectEntryType.NAMESPACES;
        if (namespaces.length > 0) {
            rootElements.push(namespacesItem);
        }

        const { customers = [] } = project;
        const customersItem = new vscode.TreeItem('Customers', vscode.TreeItemCollapsibleState.Collapsed);
        customersItem.iconPath = new vscode.ThemeIcon('organization');
        customersItem.description = project.customers + ' customers';
        customersItem.contextValue = ProjectEntryType.CUSTOMERS;
        if (customers.length > 0) {
            rootElements.push(customersItem);
        }

        const pendingChanges = project?.unpublishedChanges ?? 0;
        const hostingEnvironments = new vscode.TreeItem('Hosting', vscode.TreeItemCollapsibleState.Collapsed);
        hostingEnvironments.iconPath = new vscode.ThemeIcon('cloud');
        if (pendingChanges === 1) {
            hostingEnvironments.description = `${pendingChanges} unpublished change`;
        } else {
            hostingEnvironments.description = `${pendingChanges} unpublished changes`;
        }

        hostingEnvironments.contextValue = ProjectEntryType.ENVIRONMENTS;
        rootElements.push(hostingEnvironments);

        return rootElements;
    };

    const treeDataProvider: vscode.TreeDataProvider<ProjectEntry> = {
        onDidChangeTreeData: onDidChangeTreeData.event,
        getTreeItem: (element: ProjectEntry) => element,
        getChildren
    };

    const treeView = vscode.window.createTreeView('simplelocalize.projectDetails', {
        treeDataProvider,
        canSelectMany: false,
        showCollapseAll: false
    });

    vscode.commands.registerCommand('simplelocalize.refreshProject', async () => {
        refresh();
    });

    vscode.commands.registerCommand('simplelocalize.openProject', async () => {
        const url = `https://simplelocalize.io/dashboard/projects/?hash=${project.projectToken}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
    });

    vscode.commands.registerCommand('simplelocalize.openResource', async (item: ProjectEntry) => {
        if (item.contextValue?.startsWith(ProjectEntryType.RESOURCE)) {
            const url = `https://cdn.simplelocalize.io/${item.path}`;
            vscode.env.openExternal(vscode.Uri.parse(url));
        }
    });

    let isPublishing = false;
    vscode.commands.registerCommand('simplelocalize.publishTranslations', async () => {
        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return;
        }

        if (isPublishing) {
            vscode.window.showErrorMessage("Publishing is already in progress.");
            return;
        }

        const projectApi = new ProjectAPI(apiKey);
        const confirmation = await vscode.window.showWarningMessage(
            `Are you sure you want to publish current translations to the 'Latest' environment?`,
            { modal: true },
            "Yes",
            "No"
        );

        if (confirmation !== "Yes") {
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Publishing translations",
            cancellable: false
        }, async (progress) => {
            try {
                console.log("Publishing translations...");
                isPublishing = true;
                progress.report({ increment: 0 });
                await projectApi.publishTranslations();
                await new Promise(resolve => setTimeout(resolve, 5000));
                progress.report({ increment: 100 });
                vscode.window.setStatusBarMessage("✔ Translations published", 5000); // Message disappears after 5 seconds
            } catch (error: any) {
                console.error("Error during publishing translations:", error);
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            } finally {
                onDidChangeTreeData.fire();
                await vscode.commands.executeCommand('simplelocalize.refreshActivity');
                await vscode.commands.executeCommand('simplelocalize.refreshProject');
                isPublishing = false;
            }
        });
    });

    vscode.commands.registerCommand('simplelocalize.autoTranslate', async (item: any) => {
        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return;
        }
        const projectApi = new ProjectAPI(apiKey);
        let languageKeysToAutoTranslate = [];
        let message = "";
        if (item?.languageKey) {
            languageKeysToAutoTranslate = [item.languageKey];
            message = `Are you sure you want to auto-translate ${item.languageKey}?`;
        } else {
            const project = await projectApi.getProjectDetails();
            languageKeysToAutoTranslate = (project?.languages ?? []).map((language: any) => language.key);
            message = `Are you sure you want to auto-translate ${languageKeysToAutoTranslate.length} languages?`;
        }

        const confirmation = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            "Yes",
            "No"
        );

        if (confirmation !== "Yes") {
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Auto-translation",
            cancellable: true
        }, async (progress, token) => {
            try {

                if (await hasRunningJobs(apiKey)) {
                    vscode.window.showErrorMessage("There are running jobs. Please wait for them to finish.");
                    return;
                }

                console.log("Languages to auto-translate:", languageKeysToAutoTranslate);

                const totalLanguages = languageKeysToAutoTranslate.length;
                if (totalLanguages === 0) {
                    vscode.window.showErrorMessage("No languages to auto-translate");
                    return;
                }

                let processedLanguagesCount = 0;
                for (var languageKey of languageKeysToAutoTranslate) {
                    if (token.isCancellationRequested) {
                        console.log("Auto-translation canceled by the user.");
                        vscode.window.showWarningMessage("Auto-translation canceled by the user.");
                        return;
                    }
                    console.log(`Starting auto-translation for ${languageKey}`);
                    progress.report({
                        message: `${languageKey}`,
                        increment: (1 / totalLanguages) * 100
                    });
                    await projectApi.startAutoTranslation([languageKey]);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    while (await hasRunningJobs(apiKey)) {
                        console.log("Waiting for running jobs to finish...");
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    processedLanguagesCount++;
                }
                vscode.window.setStatusBarMessage("✔ Auto-translation completed", 5000); // Message disappears after 5 seconds
            } catch (error: any) {
                console.error("Error during auto translation:", error);
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            } finally {
                onDidChangeTreeData.fire();
                await vscode.commands.executeCommand('simplelocalize.refreshActivity');
                await vscode.commands.executeCommand('simplelocalize.refreshProject');
                await vscode.commands.executeCommand('simplelocalize.refreshTranslations');
            }
        });
    });

    async function hasRunningJobs(apiKey: string) {
        const projectApi = new ProjectAPI(apiKey);
        const runningJobs = await projectApi.fetchRunningJobs();
        return runningJobs.length > 0;
    }

    async function refresh() {
        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return;
        }
        const projectApi = new ProjectAPI(apiKey);
        project = await projectApi.getProjectDetails();
        console.log("Fetched project details", project);
        repository.storeProjectDetails(project);
        onDidChangeTreeData.fire();
    }

    onProjectChanged.event(() => {
        project = {};
        onDidChangeTreeData.fire();
        refresh();
    });

    onContentChanged.event(() => {
        refresh();
    });

    context.subscriptions.push(treeView);
}

interface ProjectEntry extends vscode.TreeItem {
    path?: string;
}