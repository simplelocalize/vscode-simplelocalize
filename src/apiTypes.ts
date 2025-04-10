import { components } from "./schema";

export type ProjectDetails = components['schemas']['ApiProjectDetailsV2'];
export type ProjectDetailsItem = components['schemas']['ApiProjectDetailsItemV2'];
export type ProjectActivity = components['schemas']['ActivityItemResponseV1'];
export type AutoTranslateJob = components['schemas']['JobItemV2'];

export type KeyNamespace = {
    key: string;
    namespace: string;
}