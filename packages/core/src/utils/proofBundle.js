import { getProofRequestTemplates } from '@bifold/verifier';
import { useState, useEffect } from 'react';
import { TOKENS, useServices } from '../container-api';
import { templateBundleStorageDirectory, templateCacheDataFileName, templateBundleIndexFileName } from '../constants';
import { FileCache } from './fileCache';
const calculatePreviousYear = (yearOffset) => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() + yearOffset);
    return parseInt(pastDate.toISOString().split('T')[0].replace(/-/g, ''));
};
export const applyTemplateMarkers = (templates) => {
    if (!templates) {
        return templates;
    }
    const markerActions = {
        now: () => Math.floor(new Date().getTime() / 1000).toString(),
        currentDate: (offset) => calculatePreviousYear(parseInt(offset)).toString(),
    };
    let templateString = JSON.stringify(templates);
    // regex to find all markers in the template so we can replace
    // them with computed values
    const markers = [...templateString.matchAll(/"@\{(\w+)(?:\((\S*)\))?\}"/gm)];
    markers.forEach((marker) => {
        const markerValue = markerActions[marker[1]](marker[2]);
        templateString = templateString.replace(marker[0], markerValue);
    });
    return JSON.parse(templateString);
};
export const applyDevRestrictions = (templates) => {
    return templates.map((temp) => {
        return {
            ...temp,
            payload: {
                ...temp.payload,
                data: temp.payload.data.map((data) => {
                    return {
                        ...data,
                        requestedAttributes: data.requestedAttributes?.map((attr) => {
                            return {
                                ...attr,
                                restrictions: [...(attr.restrictions ?? []), ...(attr.devRestrictions ?? [])],
                                devRestrictions: [],
                            };
                        }),
                        requestedPredicates: data.requestedPredicates?.map((pred) => {
                            return {
                                ...pred,
                                restrictions: [...(pred.restrictions ?? []), ...(pred.devRestrictions ?? [])],
                                devRestrictions: [],
                            };
                        }),
                    };
                }),
            },
        };
    });
};
export const useRemoteProofBundleResolver = (indexFileBaseUrl, log) => {
    const [proofRequestTemplates] = useServices([TOKENS.UTIL_PROOF_TEMPLATE]);
    const [resolver, setResolver] = useState(new DefaultProofBundleResolver(proofRequestTemplates));
    useEffect(() => {
        if (indexFileBaseUrl) {
            setResolver(new RemoteProofBundleResolver(indexFileBaseUrl, log));
        }
        else {
            setResolver(new DefaultProofBundleResolver(proofRequestTemplates));
        }
    }, [log, indexFileBaseUrl, proofRequestTemplates]);
    return resolver;
};
export class RemoteProofBundleResolver extends FileCache {
    templateData;
    cacheDataFileName = templateCacheDataFileName;
    constructor(indexFileBaseUrl, log) {
        super(indexFileBaseUrl, templateBundleStorageDirectory, templateCacheDataFileName, log);
    }
    async resolve(acceptDevRestrictions) {
        let templateData;
        if (!this.templateData) {
            await this.checkForUpdates();
        }
        if (!this.templateData) {
            return [];
        }
        templateData = this.templateData;
        if (acceptDevRestrictions) {
            templateData = applyDevRestrictions(this.templateData);
        }
        return Promise.resolve(templateData);
    }
    async resolveById(templateId, acceptDevRestrictions) {
        let templateData;
        if (!this.templateData) {
            return (await this.resolve(acceptDevRestrictions))?.find((template) => template.id === templateId);
        }
        templateData = this.templateData;
        if (acceptDevRestrictions) {
            templateData = applyDevRestrictions(templateData);
        }
        return templateData.find((template) => template.id === templateId);
    }
    async checkForUpdates() {
        await this.createWorkingDirectoryIfNotExists();
        if (!this.fileEtag) {
            this.log?.info('Loading cache data');
            const cacheData = await this.loadCacheData();
            if (cacheData) {
                this.fileEtag = cacheData.fileEtag;
            }
        }
        this.log?.info('Loading index now');
        await this.loadBundleIndex(templateBundleIndexFileName);
    }
    loadBundleIndex = async (filePath) => {
        let remoteFetchSucceeded = false;
        try {
            const response = await this.axiosInstance.get(filePath);
            const { status } = response;
            const { etag } = response.headers;
            if (status !== 200) {
                this.log?.error(`Failed to fetch remote resource at ${filePath}`);
                throw new Error('Failed to fetch remote resource');
            }
            if (etag && this.compareWeakEtags(this.fileEtag, etag)) {
                this.log?.info(`Index file ${filePath} has not changed, etag ${etag}`);
                // etag is the same, no need to refresh
                this.templateData = response.data;
                return;
            }
            this.fileEtag = etag;
            this.templateData = response.data;
            remoteFetchSucceeded = true;
            await this.saveFileToLocalStorage(filePath, JSON.stringify(this.templateData));
        }
        catch (error) {
            this.log?.error(`Failed to fetch remote file index ${filePath}`);
        }
        if (remoteFetchSucceeded) {
            return;
        }
        const data = await this.loadFileFromLocalStorage(filePath);
        if (!data) {
            this.log?.error(`Failed to load index file ${filePath} from cache`);
            return;
        }
        this.log?.info(`Using index file ${filePath} from cache`);
        this.templateData = JSON.parse(data);
    };
}
export class DefaultProofBundleResolver {
    proofRequestTemplates;
    constructor(proofRequestTemplates) {
        this.proofRequestTemplates = proofRequestTemplates ?? getProofRequestTemplates;
    }
    async resolve(acceptDevRestrictions) {
        return Promise.resolve(this.proofRequestTemplates(acceptDevRestrictions));
    }
    async resolveById(templateId, acceptDevRestrictions) {
        return Promise.resolve(this.proofRequestTemplates(acceptDevRestrictions).find((template) => template.id === templateId));
    }
}
