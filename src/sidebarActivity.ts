import * as vscode from 'vscode';
import { ProjectAPI } from './api';
import { getProjectApiKey, onContentChanged, onProjectChanged } from './extension';
import { createMessageEntry } from './utils';
import { repository } from './repository';
import { ProjectActivity, ProjectDetails } from './apiTypes';
import { DateTime } from 'luxon';


export function registerSidebarActivity(context: vscode.ExtensionContext) {

    const onDidChangeTreeData: vscode.EventEmitter<ProjectEntry | undefined | void> = new vscode.EventEmitter<ProjectEntry | undefined | void>();
    let project: ProjectDetails = repository.findProjectDetails() || {};
    let lastFetchTimestamp = 0;
    let intervalId: NodeJS.Timeout | undefined;

    const getChildren = async (element?: ProjectEntry): Promise<ProjectEntry[]> => {

        const apiKey = getProjectApiKey()!;
        if (!apiKey) {
            return [createMessageEntry('Project not configured')];
        }

        if (!project.projectToken) {
            return [createMessageEntry('Project not configured')];
        }

        const projectApi = new ProjectAPI(apiKey);
        const activity = await projectApi.fetchActivity();
        console.log("Fetched activity", activity);
        if (!activity) {
            return [createMessageEntry('No activity found')];
        }

        const hasRunningActivity = activity.some((entry: ProjectActivity) => entry.running);

        if (hasRunningActivity && !intervalId) {
            startAutoRefresh();
        } else if (!hasRunningActivity && intervalId) {
            stopAutoRefresh();
        }

        return activity
            .map(mapActivityToEntry)
            .filter(activity => activity !== null);
    };

    const startAutoRefresh = () => {
        console.log("Starting auto-refresh for running activities...");
        intervalId = setInterval(() => {
            refresh();
        }, 5000); // Refresh every 5 seconds
    };

    const stopAutoRefresh = () => {
        console.log("Stopping auto-refresh, no running activities...");
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = undefined;
        }
    };

    const mapActivityToEntry = (entry: ProjectActivity): vscode.TreeItem | null => {
        const activityType = entry?.type ?? "unknown";
        const item = new vscode.TreeItem(activityType, vscode.TreeItemCollapsibleState.None);
        item.description = formatAsRelative(entry?.createdAt!);
        switch (activityType) {
            case "IMPORT":
                item.label = "Import";
                item.iconPath = new vscode.ThemeIcon("git-stash-pop");
                break;
            case "EXPORT":
                item.label = "Export";
                item.iconPath = new vscode.ThemeIcon("git-stash");
                break;
            case "AUTO_TRANSLATION_SUCCESS":
                item.label = "Auto translation";
                item.iconPath = new vscode.ThemeIcon("play");
                break;
            case "AUTO_TRANSLATION_FAILED":
                item.label = "Auto translation";
                item.iconPath = new vscode.ThemeIcon("run-errors");
                break;
            case "CHANGE":
                item.label = "Changes";
                item.iconPath = new vscode.ThemeIcon("diff-multiple");
                break;
            case 'PUBLICATION':
                item.label = "Publication (Latest)";
                item.iconPath = new vscode.ThemeIcon("cloud");
                break;
            case "ENVIRONMENT_PUBLICATION":
                item.label = `Publication (${entry?.environment?.name})`;
                item.iconPath = new vscode.ThemeIcon("cloud");
                break;
            case 'REVERT':
                item.label = "Revert publication";
                item.iconPath = new vscode.ThemeIcon("history");
                break;
            default:
                return null;
        }

        if (entry?.running) {
            item.iconPath = new vscode.ThemeIcon("loading~spin");
            item.description = "Running...";
        }

        item.contextValue = entry.type;

        return item;
    };

    const formatAsRelative = (datetime: string) => {
        const createdDateTimeAt = DateTime.fromISO(datetime, { zone: "utc" });
        const relativeDate = createdDateTimeAt.toLocal().toRelative();
        const isLessThan2Minutes = createdDateTimeAt.diffNow("minutes").minutes > -2;
        return isLessThan2Minutes ? "Just now" : relativeDate;
    };

    const treeDataProvider: vscode.TreeDataProvider<ProjectEntry> = {
        onDidChangeTreeData: onDidChangeTreeData.event,
        getTreeItem: (element: ProjectEntry) => element,
        getChildren
    };

    const treeView = vscode.window.createTreeView('simplelocalize.projectActivity', {
        treeDataProvider,
        canSelectMany: false,
        showCollapseAll: false
    });

    treeView.onDidChangeVisibility(() => {
        if (treeView.visible) {
            console.log("Project Activity Tree View is now visible. Refreshing activities...");
            refresh();
        }
    });


    vscode.commands.registerCommand('simplelocalize.refreshActivity', async () => {
        refresh();
    });

    vscode.commands.registerCommand('simplelocalize.openActivity', async () => {
        const url = `https://simplelocalize.io/dashboard/projects/?hash=${project.projectToken}&tab=activity`;
        vscode.env.openExternal(vscode.Uri.parse(url));
    });

    async function refresh() {


        if (Date.now() - lastFetchTimestamp < 1000 * 3) {
            console.log("Skipping refresh, last fetch was less than 3 seconds ago");
            return;
        }
        console.log("Refreshing activity");

        const apiKey = getProjectApiKey();
        if (!apiKey) {
            return;
        }
        const projectApi = new ProjectAPI(apiKey);
        project = await projectApi.getProjectDetails();
        repository.storeProjectDetails(project);
        onDidChangeTreeData.fire();
        lastFetchTimestamp = Date.now();
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