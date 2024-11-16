import * as vscode from 'vscode';
import { ProjectAPI } from './api';
import { getProjectApiKey, onProjectChanged } from './extension';
import { createMessageEntry } from './utils';
import { repository } from './repository';
import { ProjectDetails } from './apiTypes';


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

        if (element?.contextValue === 'languages') {
            const { languages = [] } = project;
            return languages.map((language: any) => {
                const item = new vscode.TreeItem(language.name, vscode.TreeItemCollapsibleState.None);
                item.description = language.key;
                return item;
            });
        }

        if (element?.contextValue === 'namespaces') {
            const { namespaces = [] } = project;
            return namespaces.map((namespace: any) => {
                const item = new vscode.TreeItem(namespace.name, vscode.TreeItemCollapsibleState.None);
                return item;
            });
        }

        if (element?.contextValue === 'customers') {
            const { customers = [] } = project;
            return customers.map((customer: any) => {
                const item = new vscode.TreeItem(customer.name, vscode.TreeItemCollapsibleState.None);
                return item;
            });
        }

        if (element?.contextValue === 'environemnts') {
            const { environments = [] } = project;
            return environments.map((environment: any) => {
                const item = new vscode.TreeItem(environment.name, vscode.TreeItemCollapsibleState.Collapsed);
                item.description = environment.key;
                item.contextValue = "environment__" + environment.key;
                return item;
            });
        }

        if (element?.contextValue?.startsWith("environment__")) {

            const { hostingResources = [] } = project;
            const environmentKey = element.contextValue.replace("environment__", "");
            const resources = hostingResources.filter((resource: any) => resource.key === environmentKey);
            return resources.map((resource: any) => {
                const simplifiedPath = resource.path.replace(project.projectToken + "/", "").replace(environmentKey + "/", "");
                const item = new vscode.TreeItem(simplifiedPath, vscode.TreeItemCollapsibleState.None);
                item.contextValue = "resource__" + resource.key;
                return {
                    ...item,
                    path: resource.path
                };
            });
        }


        const rootElements = [];

        const { keys = 0, name = "Unamed" } = project;
        const projectNameItem = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
        projectNameItem.description = keys + ' keys';
        projectNameItem.contextValue = 'project-name';
        rootElements.push(projectNameItem);

        const { languages = [] } = project;
        const languagesItem = new vscode.TreeItem('Languages', vscode.TreeItemCollapsibleState.Collapsed);
        languagesItem.iconPath = new vscode.ThemeIcon('globe');
        languagesItem.description = languages.length + ' languages';
        languagesItem.contextValue = 'languages';
        rootElements.push(languagesItem);


        const { namespaces = [] } = project;
        const namespacesItem = new vscode.TreeItem('Namespaces', vscode.TreeItemCollapsibleState.Collapsed);
        namespacesItem.iconPath = new vscode.ThemeIcon('layers');
        namespacesItem.description = namespaces.length + ' namespaces';
        namespacesItem.contextValue = 'namespaces';
        if (namespaces.length > 0) {
            rootElements.push(namespacesItem);
        }

        const { customers = [] } = project;
        const customersItem = new vscode.TreeItem('Customers', vscode.TreeItemCollapsibleState.Collapsed);
        customersItem.iconPath = new vscode.ThemeIcon('organization');
        customersItem.description = project.customers + ' customers';
        customersItem.contextValue = 'customers';
        if (customers.length > 0) {
            rootElements.push(customersItem);
        }

        const { environments = [] } = project;
        const hostingEnvironments = new vscode.TreeItem('Hosting', vscode.TreeItemCollapsibleState.Collapsed);
        hostingEnvironments.iconPath = new vscode.ThemeIcon('cloud');
        hostingEnvironments.description = environments.length + ' environments';
        hostingEnvironments.contextValue = 'environemnts';
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
        if (item.contextValue?.startsWith("resource__")) {
            const url = `https://cdn.simplelocalize.io/${item.path}`;
            vscode.env.openExternal(vscode.Uri.parse(url));
        }
    });



    async function refresh() {
        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return;
        }
        const projectApi = new ProjectAPI(apiKey);
        project = await projectApi.getProjectDetails();
        repository.storeProjectDetails(project);
        onDidChangeTreeData.fire();
    }

    onProjectChanged.event(() => {
        project = {};
        onDidChangeTreeData.fire();
        refresh();
    });


    context.subscriptions.push(treeView);
}

interface ProjectEntry extends vscode.TreeItem {
    path?: string;
}