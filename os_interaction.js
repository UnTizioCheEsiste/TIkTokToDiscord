const fs = require('fs');

async function readJSONFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`[JSON ERROR] Error reading JSON file from ${filePath}:`, error);
        throw error;
    }
}

async function writeJSONFile(filePath, data) {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.promises.writeFile(filePath, jsonData, 'utf8');
    } catch (error) {
        console.error(`[JSON ERROR] Error writing JSON file to ${filePath}:`, error);
        throw error;
    }
}

module.exports = {
    readJSONFile,
    writeJSONFile
};