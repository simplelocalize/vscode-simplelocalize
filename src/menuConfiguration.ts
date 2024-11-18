import * as vscode from 'vscode';
import { PersonalAPI, ProjectAPI } from './api';
import { clearAll, getPersonalToken, getProjectApiKey, updatePersonalToken, updateProject } from './extension';
import { repository } from './repository';

interface ProjectQuickPickItem extends vscode.QuickPickItem {
    projectToken: string;
    apiKey: string;
}

async function requestProjectConfiguration() {
    const personalToken = await getPersonalToken();

    if (!personalToken) {
        vscode.window.showErrorMessage('Please configure your personal token first.');
        return;
    }

    const personalApi = new PersonalAPI(personalToken);
    const projects = await personalApi.getProjects();

    const quickPickOptions: ProjectQuickPickItem[] = projects.map((project => {
        const numberOfLanguages = (project?.languages || []).length;
        const numberOfLanguagesFormatted = numberOfLanguages === 1 ? "1 language" : numberOfLanguages + " languages";
        const numberOfKeysFormatted = project.keys === 1 ? "1 key" : project.keys + " keys";

        const detail = numberOfKeysFormatted + " • " + numberOfLanguagesFormatted + " • " + project.projectToken;
        return ({
            label: project?.name || "Unnamed project",
            detail,
            projectToken: project.projectToken!,
            apiKey: project.apiKey!
        });
    }));
    const selectedProject = await vscode.window.showQuickPick(quickPickOptions,
        {
            placeHolder: "Select a project",
            title: 'Choose a project for this workspace',
        }
    );

    if (!selectedProject) {
        vscode.window.showErrorMessage('No project selected.');
        return;
    }

    await updateProject(selectedProject.apiKey, selectedProject.projectToken);
}

async function requestPersonalTokenConfiguration() {
    const personalToken = await vscode.window.showInputBox({
        placeHolder: "Enter your SimpleLocalize personal token",
        password: false,
        ignoreFocusOut: true,
        title: 'Your Personal Token',
        validateInput(value) {

            if (!value.includes("slper_")) {
                return "It's not a valid personal token.";
            }

            if (value.length < 20) {
                return "Personal token is too short.";
            }

            return null;
        },
    }) || "";

    if (!personalToken) {
        return;
    }

    const personalApi = new PersonalAPI(personalToken);
    try {
        await personalApi.getProjects();
    } catch (error) {
        vscode.window.showErrorMessage('Invalid personal token.');
        return;
    }

    await updatePersonalToken(personalToken);

    requestProjectConfiguration();
}

async function resetConfiguration(context: vscode.ExtensionContext) {

    const buttonLabel = 'Reset configuration';
    const userResponse = await vscode.window.showWarningMessage(
        `Are you sure you want to reset the configuration?`,
        { modal: true },
        buttonLabel
    );

    if (userResponse === buttonLabel) {
        await clearAll();
        vscode.window.showInformationMessage('Configuration has been reset.');
    }
}

export async function startInitalConfiguration(context: vscode.ExtensionContext) {

    const personalToken = await getPersonalToken();

    if (!personalToken) {
        await clearAll();
        await requestPersonalTokenConfiguration();
    } else {
        const reinitializeLabel = 'Start initial configuration';
        const userResponse = await vscode.window.showWarningMessage(
            'You already have a personal token configured. Do you want to restart the initial configuration?',
            { modal: true },
            reinitializeLabel
        );

        if (userResponse === reinitializeLabel) {
            await clearAll();
            await requestPersonalTokenConfiguration();
        }
    }
}

export async function registerConfigurationMenu(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('simplelocalize.configuration', async () => {
        const options = [
            {
                label: 'Generate Personal Token',
                detail: "Open the SimpleLocalize dashboard to generate a personal token.",
                action: () => vscode.env.openExternal(vscode.Uri.parse('https://simplelocalize.io/dashboard/security/'))
            },
            {
                label: 'Setup Personal Token',
                detail: "Configure your personal token to access your projects.",
                action: requestPersonalTokenConfiguration
            },
            {
                label: 'Setup Project',
                detail: "Confgure the project for this workspace.",
                action: requestProjectConfiguration
            },
            {
                label: 'Clear Settings',
                detail: "Clear all settings and start from scratch.",
                action: resetConfiguration
            },
        ];

        const selectedOption = await vscode.window.showQuickPick(options, {
            placeHolder: "Select an action",
            title: 'Configure extension',
            ignoreFocusOut: true
        });

        if (selectedOption) {
            await selectedOption.action(context);
        }
    });
}


export async function initializeProject(context: vscode.ExtensionContext) {
    const personalToken = await getPersonalToken();

    if (!personalToken) {
        return;
    }

    const personalApi = new PersonalAPI(personalToken);
    let projects = [];
    try {
        projects = await personalApi.getProjects();
    } catch (error) {
        vscode.window.showErrorMessage('Invalid or expired personal token.');
        return;
    }

    if (projects.length === 0) {
        return;
    }

    const storedApiKey = getProjectApiKey();
    if (!storedApiKey) {
        return;
    }

    const hasAccessToProject = projects.some(p => p.apiKey === storedApiKey);
    if (!hasAccessToProject) {
        vscode.window.showErrorMessage('The configured API key does not match any of your projects.');
        return;
    }

    const projectApi = new ProjectAPI(storedApiKey);
    const projectDetails = await projectApi.getProjectDetails();
    if (!projectDetails) {
        vscode.window.showErrorMessage('Failed to fetch project details.');
        return;
    }
    repository.storeProjectDetails(projectDetails);

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Project "${projectDetails.name}" loaded`,
        cancellable: false
    }, async (progress) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return;
    });
}