const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());

// GET endpoint to read a JSON file
app.get('/api/read-json', async (req, res) => {
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    try {
        const data = await fs.readFile(path.resolve(filePath), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        if (error instanceof SyntaxError) {
            return res.status(400).json({ error: 'Invalid JSON file' });
        }
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// POST endpoint to write data to a JSON file
app.post('/api/write-json', async (req, res) => {
    const filePath = req.body.path;
    const data = req.body.data;

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    if (data === undefined) {
        return res.status(400).json({ error: 'Data is required' });
    }

    try {
        await fs.writeFile(path.resolve(filePath), JSON.stringify(data, null, 2), 'utf8');
        res.status(200).json({ message: 'File written successfully' });
    } catch (error) {
        console.error('Error writing file:', error);
        res.status(500).json({ error: 'Failed to write file' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// New endpoint to list files in a directory
const fsUtils = require('fs'); // Using Node.js 'fs' module for synchronous operations for simplicity here
app.get('/api/list-files', async (req, res) => {
    const directoryPathQuery = req.query.directoryPath;

    if (!directoryPathQuery) {
        return res.status(400).json({ error: 'Directory path is required' });
    }

    const resolvedPath = path.resolve(directoryPathQuery);

    try {
        // Ensure the path is within the project directory (basic security check)
        // This check might need to be more robust depending on how paths are constructed and used.
        if (!resolvedPath.startsWith(path.resolve('.'))) {
             return res.status(403).json({ error: 'Access to the specified directory is forbidden' });
        }

        const dirents = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
        const files = dirents
            .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
            .map(dirent => dirent.name);
        res.json(files);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: `Directory not found: ${resolvedPath}` });
        }
        console.error('Error listing files:', error);
        res.status(500).json({ error: `Failed to list files in directory: ${resolvedPath}` });
    }
});

// New endpoint to delete a file
app.post('/api/delete-file', async (req, res) => {
    const filePathToDelete = req.body.filePath;

    if (!filePathToDelete) {
        return res.status(400).json({ error: 'File path is required in the request body' });
    }

    const resolvedPath = path.resolve(filePathToDelete);

    // Basic security check: Ensure the path is within the project directory and targets a .json file
    // This check needs to be robust. For example, ensure it's within a 'campaigns' or 'assets' subdirectory.
    if (!resolvedPath.startsWith(path.resolve('.')) || !resolvedPath.endsWith('.json')) {
        return res.status(403).json({ error: 'Access to the specified file path is forbidden or invalid file type' });
    }
    // More specific check: only allow deletion within 'campaigns' or 'assets/definitions' for this tool for now
    const projectRoot = path.resolve('.');
    const campaignsDir = path.join(projectRoot, 'campaigns');
    const assetsDefinitionsDir = path.join(projectRoot, 'assets', 'definitions');

    if (!resolvedPath.startsWith(campaignsDir) && !resolvedPath.startsWith(assetsDefinitionsDir)) {
         return res.status(403).json({ error: 'File deletion is restricted to campaign and specific asset definition directories.' });
    }


    try {
        await fs.promises.unlink(resolvedPath);
        res.status(200).json({ message: `File '${filePathToDelete}' deleted successfully.` });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: `File not found: ${filePathToDelete}` });
        }
        console.error('Error deleting file:', error);
        res.status(500).json({ error: `Failed to delete file: ${filePathToDelete}. ${error.message}` });
    }
});
