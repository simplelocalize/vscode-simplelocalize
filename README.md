# SimpleLocalize VSC Extension

[SimpleLocalize](https://simplelocalize.io) VSC Extension is a tool designed to manage translations within your Visual Studio Code environment. With this extension, you can easily integrate SimpleLocalize, a user-friendly app for managing translations, directly into your development workflow. This extension simplifies the localization process, allowing you to focus on writing code while ensuring your application is accessible to a global audience.

## Features

Here is a short description of all available features:

- **Translations Management**: Easily edit, delete, and copy translation keys directly from the sidebar.
- **Project Details**: View project statistics, languages, namespaces, and translation hosting resources.
- **Code Actions**: Create, convert, update, and rename translation keys from selected text in your code.
- **Code Completion**: Get intelligent suggestions for translation keys as you type.
- **Open in Web UI**: Quick access to various tabs of your SimpleLocalize project in the web UI.
- **CLI Integration**: Execute common SimpleLocalize CLI commands from the Command Palette.

These features streamline the localization process, making it easier to manage translations within your development workflow.

### Sidebar

Sidebar has 3 sections:

#### Translations

Translations section is a tree of your project content. List of translation keys and translations. You can here edit translation keys and translation.

Functions:

- **Delete keys** - select one or more translaion keys and click "cmd + backpace" to delete keys,
- **Copy translation key** - select one or more translaion keys and click "cmd+c" to copy the key,
- **Translation key context menu** - right click on the translation key to see more options like "Change namespace", "Open in Web UI",

#### Project details

Project section shows you the basics of your project like number of translation keys, list of languages, namespaces, customers, and [translation hosting](https://simplelocalize.io/translation-hosting/) resources split by environment with option to preview every resource.

#### Help and Feedback

This section provides an option to configure the extension to suit your needs. You can set up your personal token and project details to ensure seamless integration with SimpleLocalize.

### Code Actions

Extension provides several code actions:

- **Create translation key from selected text**: Create a new translation key from the selected text
- **Convert selected text into translation key**: Convert the selected text into a translation key
- **Update translation with seleected text**: Update the translation for the selected text
- **Rename translation key from selected text**: select the translation key in your code and use "Reanme translation key" to rename it

To run one of the code actions, select a text or translation key.

### Code completition

Extension suggests translation keys directly in your code. As you type, the extension will provide intelligent suggestions for existing translation keys, making it easier to maintain consistency and avoid typos.

### Open in Web UI

We've added a several quick actions to get access to some tabs of the configured project in the SimpleLocalize Web UI:

- **Open Translations**: Opens the Translations tab,
- **Open Languages**: Opens the Languages tab,
- **Open Hosting**: Opens the Hosting tab,
- **Open Activity**: Opens the Activity tab,
- **Open Data**: Opens the Data tab,
- **Open Settings**: Opens the Settings tab.

### SimpleLocalize CLI integration

CLI integrations adds the most common commands to your Command Pallete. Commends doesn't run automatically, they opens 
a prepared command in the SimpleLocalize terminal. Such aproach allows developers to review the command before running it. 

- **Download translations**
- **Upload translations**
- **Auto-translate**
- **Hosting: Publish translations**
- **Hosting: Pull translations**

> The extension requires to have [SimpleLocalize CLI](https://simplelocalize.io/command-line-tool/) installed on your machine.

## Requirements

Integrations doesn't require any additional software to work, however some features like downloading translations, uploading translation,
and auto-translation requires [SimpleLocalize CLI](https://simplelocalize.io/command-line-tool/) to work. It's recommended
to have the CLI installed to use the full potential of the extension and simplify the whole process of managing your traslation files and strings.

## Extension Ccnfiguration

Open "SimpleLocalize" sidebar from on the left side, go to "Help & Feedback" and click "Configure extension". 
[Generate a personal token](https://simplelocalize.io/dashboard/security/) in SimpleLocalize, and choose option to configure the token, later choose a project. Now, your extension is ready to use.

## Contribution

Contributions are welcome! You can contribute in the following ways:

- **Pull Requests**: We welcome pull requests for new features, bug fixes, and improvements.
- **Feature Ideas**: Have an idea for a new feature? Open an issue to discuss it with us.
- **Bug Reports**: Found a bug? Please report it by opening an issue.

We appreciate your help in making this extension better!

## License

This extension is licensed under the MIT License.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of SimpleLocalize VSC Extension

