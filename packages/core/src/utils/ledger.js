import axios from 'axios';
const INDY_NETWORK_URL = 'https://raw.githubusercontent.com/hyperledger/indy-node-monitor/main/fetch-validator-status/networks.json';
const ERROR_TAG = 'LEDGER ERROR';
export var IndyLedger;
(function (IndyLedger) {
    IndyLedger["SOVRIN_BUILDER_NET"] = "sbn";
    IndyLedger["SOVRIN_STAGING_NET"] = "ssn";
    IndyLedger["SOVERIN_MAIN_NET"] = "smn";
    IndyLedger["LOCAL_VON_NETWORK"] = "vn";
    IndyLedger["LINUX_LOCAL_VON_NETWORK"] = "lln";
    IndyLedger["BCOVRIN_DEV"] = "bcd";
    IndyLedger["BCOVRIN_TEST"] = "bct";
    IndyLedger["BCOVRIN"] = "bcp";
    IndyLedger["GREENLIGHT_DEV_LEDGER"] = "gld";
    IndyLedger["INDICO_MAINNET"] = "imn";
    IndyLedger["INDICO_DEMONET"] = "idn";
    IndyLedger["INDICO_TESTNET"] = "itn";
    IndyLedger["CANDY_DEV_NETWORK"] = "cdn";
    IndyLedger["CANDY_TEST_NETWORK"] = "ctn";
    IndyLedger["CANDY_PRODUCTION_NETWORK"] = "cpn";
})(IndyLedger || (IndyLedger = {}));
/**
 * Fetches the content from a given URL and returns it as a Promise.
 *
 * @throws {Error} - Throws an error if the fetch operation fails.
 * @template T - The type of content expected from the URL.
 * @param {string} url - The URL to fetch content from.
 * @returns {*} {Promise<T>} - A promise that resolves to the content fetched from the URL
 */
export async function _fetchUrlContent(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    }
    catch (error) {
        throw new Error(`${ERROR_TAG}: Failed to fetch content from URL ${url}: ${error.message}`);
    }
}
/**
 * Fetches and returns a list of Indy ledgers based on the provided configurations.
 *
 * @throws {Error} - Throws an error if a ledgerConfig is not found in the IndyLedgersRecord.
 * @param {IndyLedgerConfig[]} indyLedgerConfigs - The list of supported Indy ledger configurations.
 * @returns {*} {Promise<IndyLedgerJSON[]>} - A promise that resolves to an array of ledgers.
 */
export async function getIndyLedgers(indyLedgerConfigs) {
    if (!indyLedgerConfigs.length) {
        return [];
    }
    const allIndyLedgers = await _fetchUrlContent(INDY_NETWORK_URL);
    const ledgers = [];
    // Iterate through the supported network configs and map them to the Indy ledgers
    for (const ledgerConfig of indyLedgerConfigs) {
        const indyLedger = allIndyLedgers[ledgerConfig.ledgerId];
        if (!indyLedger) {
            throw new Error(`${ERROR_TAG}: Ledger config for ${ledgerConfig.ledgerId} not found`);
        }
        const ledgerId = indyLedger.name
            .split(' ')
            .filter((word) => !/\W+/im.test(word))
            .join('');
        ledgers.push({
            id: ledgerId,
            indyNamespace: indyLedger.indyNamespace,
            isProduction: ledgerConfig.isProduction,
            connectOnStartup: !ledgerConfig.doNotConnectOnStartup,
            // This url will need to be fetched to get the genesis transactions
            genesisTransactions: indyLedger.genesisUrl,
        });
    }
    // Step 1: Collect all genesis transaction promises
    const genesisPromises = ledgers.map((ledger) => _fetchUrlContent(ledger.genesisTransactions));
    // Step 2: Await all promises to resolve in parallel
    const genesisTransactions = await Promise.all(genesisPromises);
    // Step 3: Assign the fetched genesis transactions back to the ledgers
    genesisTransactions.forEach((transactions, index) => {
        ledgers[index].genesisTransactions = transactions.trim();
    });
    return ledgers;
}
/**
 * Writes the provided Indy ledgers to a JSON file at the specified file path.
 *
 * @throws {Error} - Throws an error if writing to the file fails or if the file path is invalid.
 * @param {IndyLedgerFileSystem} fileSystem - The file system interface to use for writing the file.
 * @param {string} filePath - The path to the JSON file where the ledgers should be written.
 * @param {IndyLedgerJSON[]} ledgers - The array of Indy ledgers to write to the file.
 * @returns {*} {void}
 */
export function writeIndyLedgersToFile(fileSystem, filePath, ledgers) {
    try {
        if (!filePath.endsWith('.json')) {
            throw new Error('File path must point to a JSON file');
        }
        // Skip writing to file if the new ledgers are the same
        if (fileSystem.fileExists(filePath) &&
            JSON.stringify(readIndyLedgersFromFile(fileSystem, filePath)) === JSON.stringify(ledgers)) {
            return;
        }
        const jsonContent = JSON.stringify(ledgers, null, 2);
        // Convert to absolute path ie: ./ledgers.json -> /Users/username/project/ledgers.json
        const absoluteFilePath = fileSystem.pathResolve(filePath);
        fileSystem.writeFile(absoluteFilePath, jsonContent);
    }
    catch (error) {
        throw new Error(`${ERROR_TAG}: Failed to write ledgers to file ${filePath}: ${error.message}`);
    }
}
/**
 * Reads and parses Indy ledgers from a JSON file at the specified file path.
 *
 * @throws {Error} - Throws an error if reading from the file fails, if the file path is invalid, or if parsing fails.
 * @param {IndyLedgerFileSystem} fileSystem - The file system interface to use for reading the file.
 * @param {string} filePath - The path to the JSON file to read the ledgers from.
 * @returns {*} {IndyLedgerJSON[]} - An array of Indy ledgers read from the file.
 */
export function readIndyLedgersFromFile(fileSystem, filePath) {
    try {
        if (!filePath.endsWith('.json')) {
            throw new Error('File path must point to a JSON file');
        }
        // Convert to absolute path ie: ./ledgers.json -> /Users/username/project/ledgers.json
        const absoluteFilePath = fileSystem.pathResolve(filePath);
        const jsonContent = fileSystem.readFile(absoluteFilePath);
        return JSON.parse(jsonContent);
    }
    catch (error) {
        throw new Error(`${ERROR_TAG}: Failed to read ledgers from file ${filePath}: ${error.message}`);
    }
}
