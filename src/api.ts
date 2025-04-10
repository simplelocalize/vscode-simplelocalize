import axios, { AxiosInstance } from 'axios';
import { AutoTranslateJob, KeyNamespace, ProjectActivity, ProjectDetails, ProjectDetailsItem } from './apiTypes';

const API_BASE_URL = 'https://api.simplelocalize.io/api';
const CLIENT_NAME = 'vsc-extension';

class ProjectAPI {

    private api: AxiosInstance;

    constructor(apiKey: string) {
        this.api = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'X-SimpleLocalize-Token': apiKey,
                'X-SimpleLocalize-Client': CLIENT_NAME,
            },
        });
    }

    async addTranslationKey(key: string, namespace: string = "") {
        try {
            const response = await this.api.post('/v1/translation-keys', {
                key,
                namespace
            });
            return response.data;
        } catch (error) {
            console.error('Error creating translation key:', error);
            throw error;
        }
    }

    async getAllTranslationKeys(): Promise<KeyNamespace[]> {
        try {
            const response = await this.api.get('/v1/translation-keys/list');
            return response?.data?.data || [];
        } catch (error) {
            console.error('Error fetching translations:', error);
            throw error;
        }
    }

    // Fetch all translations
    async getTranslations() {
        try {
            const response = await this.api.get('/v1/translations');
            return response.data;
        } catch (error) {
            console.error('Error fetching translations:', error);
            throw error;
        }
    }

    async getTranslationsForKey(key: string, namespace: string) {
        try {
            const response = await this.api.get('/v2/translations', {
                params: {
                    key,
                    namespace,
                    baseOnly: true
                }
            });
            return response?.data?.data || [];
        } catch (error) {
            console.error('Error fetching translations:', error);
            throw error;
        }
    }

    // Fetch a specific translation key
    async getTranslationKeyDetails(key: string, namespace: string = "") {
        try {
            const response = await this.api.get(`/v1/translation-keys/details`, {
                params: {
                    key,
                    namespace
                }
            });
            return response?.data?.data || {};
        } catch (error) {
            console.error(`Error fetching translation key ${key}:`, error);
            throw error;
        }
    }


    async getProjectDetails(): Promise<ProjectDetails> {
        try {
            const response = await this.api.get(`/v2/project`);
            return response?.data?.data;
        } catch (error) {
            console.error(`Error fetching project details:`, error);
            throw error;
        }
    }

    async isTranslationKeyExists(key: string, namespace: string = "") {
        try {
            const response = await this.api.get(`/v1/translation-keys/`, {
                params: {
                    key,
                    namespace,
                    page: 0,
                    size: 1
                }
            });
            return response.data.totalElements > 0;
        } catch (error) {
            console.error(`Error fetching translation key ${key}:`, error);
            throw error;
        }
    }

    async updateTranslationKey(key: string, namespace: string = "", newKey: string, newNamespace: string = "") {
        try {
            const response = await this.api.patch(`/v1/translation-keys`, {
                key: newKey,
                namespace: newNamespace
            }, {
                params: {
                    key,
                    namespace
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Error updating translation key ${key}:`, error);
            throw error;
        }
    }

    async updateTranslation(key: string, namespace: string = "", language: string, text: string = "") {
        try {
            const response = await this.api.patch(`/v2/translations`, {
                key,
                namespace,
                language,
                text
            });
            return response.data;
        } catch (error) {
            console.error(`Error updating translation ${key}:`, error);
            throw error;
        }
    }

    // Delete a translation key
    async deleteTranslationKey(key: string, namespace: string = "") {
        try {
            const response = await this.api.delete(`/v1/translation-keys`, {
                params: {
                    key,
                    namespace
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Error deleting translation key ${key}:`, error);
            throw error;
        }
    }

    async fetchActivity(): Promise<ProjectActivity[]> {
        try {
            const response = await this.api.get('/v1/activity', {
                params: {
                    page: 0,
                    size: 10
                }
            });
            return response?.data?.data || [];
        } catch (error) {
            console.error('Error fetching activity:', error);
            throw error;
        }
    }

    async startAutoTranslation(languageKeys: string[]) {
        try {
            const response = await this.api.post('/v2/jobs/auto-translate', {
                languageKeys
            });
            return response.data;
        } catch (error) {
            console.error('Error starting auto-translation:', error);
            throw error;
        }
    }

    async fetchRunningJobs(): Promise<AutoTranslateJob[]> {
        try {
            const response = await this.api.get('/v2/jobs', {
                params: {
                    status: 'RUNNING'
                }
            });
            return response?.data?.data || [];
        } catch (error) {
            console.error('Error fetching running jobs:', error);
            throw error;
        }
    }

    async publishTranslations() {
        try {
            const environment = `_latest`;
            await this.api.post(`/v2/environments/${environment}/publish`);
        } catch (error) {
            console.error('Error publishing translations:', error);
            throw error;
        }
    }
}

class PersonalAPI {
    private api: AxiosInstance;

    constructor(personalToken: string) {
        this.api = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Authorization': personalToken,
                'X-SimpleLocalize-Client': CLIENT_NAME,
            },
        });
    }

    async getProjects(): Promise<ProjectDetailsItem[]> {
        try {
            const response = await this.api.get('/v2/projects');
            return response?.data?.data || [];
        } catch (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
    }
}

export {
    PersonalAPI, ProjectAPI
};
