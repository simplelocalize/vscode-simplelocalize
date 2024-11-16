import * as fs from 'fs';
import * as path from 'path';
import { getProjectToken } from './extension';
import { ProjectDetails } from './apiTypes';

export interface TranslationKey {
    translationKey: string;
    namespace: string;
}

const getTranslationKeysPath = (): string => {
    const projectToken = getProjectToken();
    const filePath = path.join(__dirname, `${projectToken}-translation-keys.json`);
    return filePath;
};


const getProjectDetailsPath = (): string => {
    const projectToken = getProjectToken();
    const filePath = path.join(__dirname, `${projectToken}-details.json`);
    return filePath;
};


const readData = (filePath: string, defaultValue: any): any => {
    if (!fs.existsSync(filePath)) {
        return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
};

const writeData = (filePath: string, data: any[] | any): void => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

export const repository = {
    findAllTranslationKeys: (): TranslationKey[] => {
        const filePath = getTranslationKeysPath();
        return readData(filePath, []);
    },
    storeTranslationKeys: (data: TranslationKey[]): void => {
        const filePath = getTranslationKeysPath();
        writeData(filePath, data);
    },
    findProjectDetails: (): ProjectDetails => {
        const filePath = getProjectDetailsPath();
        return readData(filePath, {});
    },
    storeProjectDetails: (data: ProjectDetails): void => {
        const filePath = getProjectDetailsPath();
        writeData(filePath, data);
    },
    purgeAll: (): void => {
        console.log('Purging all data');
        const translationKeysPath = getTranslationKeysPath();
        if (fs.existsSync(translationKeysPath)) {
            fs.unlinkSync(translationKeysPath);
            console.log('Deleted translation keys file');
        }

        const projectDetailsPath = getProjectDetailsPath();
        if (fs.existsSync(projectDetailsPath)) {
            fs.unlinkSync(projectDetailsPath);
            console.log('Deleted project details file');
        }
    }
};