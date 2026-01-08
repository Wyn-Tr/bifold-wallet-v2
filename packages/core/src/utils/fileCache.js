import axios from 'axios';
import { CachesDirectoryPath, readFile, writeFile, exists, mkdir } from 'react-native-fs';
export class FileCache {
    axiosInstance;
    _fileEtag;
    log;
    workspace;
    cacheFileName;
    constructor(indexFileBaseUrl, workspace, cacheDataFileName, log) {
        this.axiosInstance = axios.create({
            baseURL: indexFileBaseUrl,
        });
        this.workspace = workspace;
        this.cacheFileName = cacheDataFileName;
        this.log = log;
    }
    set fileEtag(value) {
        if (!value) {
            return;
        }
        this._fileEtag = value;
        this.saveCacheData({
            fileEtag: value,
            updatedAt: new Date(),
        }).catch((error) => {
            this.log?.error(`Failed to save cache data, ${error}`);
        });
    }
    get fileEtag() {
        return this._fileEtag || '';
    }
    loadCacheData = async () => {
        const cacheFileExists = await this.checkFileExists(this.cacheFileName);
        if (!cacheFileExists) {
            return;
        }
        const data = await this.loadFileFromLocalStorage(this.cacheFileName);
        if (!data) {
            return;
        }
        const cacheData = JSON.parse(data);
        return cacheData;
    };
    saveCacheData = async (cacheData) => {
        const cacheDataAsString = JSON.stringify(cacheData);
        return this.saveFileToLocalStorage(this.cacheFileName, cacheDataAsString);
    };
    saveFileToLocalStorage = async (fileName, data) => {
        const pathToFile = `${this.fileStoragePath()}/${fileName}`;
        try {
            await writeFile(pathToFile, data, 'utf8');
            this.log?.info(`File ${fileName} saved to ${pathToFile}`);
            return true;
        }
        catch (error) {
            this.log?.error(`Failed to save file ${fileName} to ${pathToFile}, ${error}`);
        }
        return false;
    };
    fileStoragePath = () => {
        return `${CachesDirectoryPath}/${this.workspace}`;
    };
    createWorkingDirectoryIfNotExists = async () => {
        const path = this.fileStoragePath();
        const pathDoesExist = await exists(path);
        if (!pathDoesExist) {
            try {
                await mkdir(path);
                return true;
            }
            catch (error) {
                this.log?.error(`Failed to create directory ${path}`);
                return false;
            }
        }
        return true;
    };
    loadFileFromLocalStorage = async (fileName) => {
        const pathToFile = `${this.fileStoragePath()}/${fileName}`;
        try {
            const fileExists = await this.checkFileExists(fileName);
            if (!fileExists) {
                this.log?.warn(`Missing ${fileName} from ${pathToFile}`);
                return;
            }
            const data = await readFile(pathToFile, 'utf8');
            this.log?.info(`File ${fileName} loaded from ${pathToFile}`);
            return data;
        }
        catch (error) {
            this.log?.error(`Failed to load file ${fileName} from ${pathToFile}`);
        }
    };
    checkFileExists = async (fileName) => {
        const pathToFile = `${this.fileStoragePath()}/${fileName}`;
        try {
            const fileExists = await exists(pathToFile);
            this.log?.info(`File ${fileName} ${fileExists ? 'does' : 'does not'} exist at ${pathToFile}`);
            return fileExists;
        }
        catch (error) {
            this.log?.error(`Failed to check existence of ${fileName} at ${pathToFile}`);
        }
        return false;
    };
    stripWeakEtag = (etag) => {
        if (etag.startsWith('W/')) {
            return etag.slice(2).replace(/"/g, '');
        }
        return etag.replace(/"/g, '');
    };
    compareWeakEtags = (etag1, etag2) => {
        const cleanEtag1 = this.stripWeakEtag(etag1);
        const cleanEtag2 = this.stripWeakEtag(etag2);
        return cleanEtag1 === cleanEtag2;
    };
}
