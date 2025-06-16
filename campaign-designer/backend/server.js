const express = require('express');
const fs = require('fs').promises; // Using promises version of fs
const nodeFs = require('fs'); // Using Node.js 'fs' module for synchronous operations if needed elsewhere or for specific checks
const path = require('path');

const app = express();
const port = 3000;

// Define Project Root: This should point to the directory that CONTAINS 'campaigns', 'assets', etc.
// Assuming server.js is in campaign-designer/backend/, to get to campaign-designer/
// you might go up one level if 'backend' is directly inside 'campaign-designer'.
// If 'campaign-designer' is the root of your repo and contains 'backend' and 'frontend'
// then __dirname (current dir: backend) -> path.resolve(__dirname, '..') would be 'campaign-designer'
const projectRoot = path.resolve(__dirname, '..');
// Verification log (optional, good for debugging setup)
// console.log(`Project Root determined as: ${projectRoot}`);


app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // Serve static files from frontend


// GET endpoint to read a JSON file
app.get('/api/read-json', async (req, res) => {
    const clientPath = req.query.path;

    if (!clientPath) {
        return res.status(400).json({ error: 'File path is required.' });
    }

    try {
        const decodedClientPath = decodeURIComponent(clientPath);

        // Basic check for path traversal components before resolving
        // More robust check is to see if the resolved path is within the project root.
        if (decodedClientPath.includes('..')) {
            console.warn(`Attempt to use '..' in path: ${decodedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }

        const intendedPath = path.normalize(decodedClientPath); // Normalize for OS (e.g. / vs \) and remove redundant separators.

        // path.join will create the correct path for the OS, path.resolve will make it absolute from projectRoot
        // Using path.resolve from projectRoot is generally safer as it prevents escaping the root via symlinks if not careful.
        const absoluteServerPath = path.resolve(projectRoot, intendedPath);

        // Security check: Ensure the resolved path is still within the project root.
        // It must start with projectRoot followed by a path separator, or be projectRoot itself (if allowing access to root files).
        if (!absoluteServerPath.startsWith(projectRoot + path.sep) && absoluteServerPath !== projectRoot) {
            console.warn(`Path traversal attempt or invalid path. Resolved: '${absoluteServerPath}', ProjectRoot: '${projectRoot}'`);
            return res.status(403).json({ error: 'Access denied: Path is outside the allowed project directory.' });
        }

        // Additional check: ensure we are not trying to read directories like '.' or '..' directly even if they resolve within project root
        const baseName = path.basename(absoluteServerPath);
        if (baseName === '.' || baseName === '..') {
            console.warn(`Attempt to read invalid directory name: ${baseName}`);
            return res.status(400).json({ error: 'Invalid file name.' });
        }

        // Asynchronously read the file
        try {
            const fileData = await fs.readFile(absoluteServerPath, 'utf8');
            try {
                const jsonData = JSON.parse(fileData);
                res.json(jsonData);
            } catch (parseErr) {
                console.error(`Error parsing JSON from ${absoluteServerPath}:`, parseErr);
                res.status(500).json({ error: `Failed to parse JSON data from file: ${intendedPath}` });
            }
        } catch (fileErr) {
            if (fileErr.code === 'ENOENT') {
                console.error(`File not found: ${absoluteServerPath}`);
                return res.status(404).json({ error: `File not found: ${intendedPath}` });
            }
            console.error(`Error reading file ${absoluteServerPath}:`, fileErr);
            return res.status(500).json({ error: `Failed to read file: ${intendedPath}` });
        }

    } catch (error) { // Catch errors from decodeURIComponent or path operations
        console.error("Error processing path:", error);
        return res.status(400).json({ error: "Invalid file path provided." });
    }
});

// POST endpoint to write data to a JSON file
app.post('/api/write-json', async (req, res) => {
    const clientPath = req.body.path; // Path from the project root
    const data = req.body.data;

    if (!clientPath) {
        return res.status(400).json({ error: 'File path is required in the request body' });
    }
    if (data === undefined) {
        return res.status(400).json({ error: 'Data is required in the request body' });
    }

    try {
        const decodedClientPath = decodeURIComponent(clientPath);

        if (decodedClientPath.includes('..')) {
            console.warn(`Attempt to use '..' in write path: ${decodedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }

        const intendedPath = path.normalize(decodedClientPath);
        const absoluteServerPath = path.resolve(projectRoot, intendedPath);

        if (!absoluteServerPath.startsWith(projectRoot + path.sep) && absoluteServerPath !== projectRoot) {
            console.warn(`Path traversal attempt or invalid write path. Resolved: '${absoluteServerPath}', ProjectRoot: '${projectRoot}'`);
            return res.status(403).json({ error: 'Access denied: Path is outside the allowed project directory for writing.' });
        }

        // Ensure the directory exists before writing
        const dirname = path.dirname(absoluteServerPath);
        await fs.mkdir(dirname, { recursive: true });

        await fs.writeFile(absoluteServerPath, JSON.stringify(data, null, 2), 'utf8');
        res.status(200).json({ message: `File written successfully to ${intendedPath}` });
    } catch (error) {
        console.error(`Error writing file to ${clientPath}:`, error);
        res.status(500).json({ error: `Failed to write file. ${error.message}` });
    }
});

// New endpoint to list files in a directory
app.get('/api/list-files', async (req, res) => {
    const directoryPathQuery = req.query.directoryPath;

    if (!directoryPathQuery) {
        return res.status(400).json({ error: 'Directory path is required' });
    }

    try {
        const decodedDirPath = decodeURIComponent(directoryPathQuery);

        if (decodedDirPath.includes('..')) {
            console.warn(`Attempt to use '..' in list-files path: ${decodedDirPath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }

        const intendedPath = path.normalize(decodedDirPath);
        const absoluteServerPath = path.resolve(projectRoot, intendedPath);

        if (!absoluteServerPath.startsWith(projectRoot + path.sep) && absoluteServerPath !== projectRoot) {
            console.warn(`Path traversal attempt or invalid list-files path. Resolved: '${absoluteServerPath}', ProjectRoot: '${projectRoot}'`);
            return res.status(403).json({ error: 'Access denied: Path is outside the allowed project directory.' });
        }

        const dirents = await fs.readdir(absoluteServerPath, { withFileTypes: true });
        const files = dirents
            .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
            .map(dirent => dirent.name);
        res.json(files);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: `Directory not found: ${directoryPathQuery}` });
        }
        console.error('Error listing files:', error);
        res.status(500).json({ error: `Failed to list files in directory: ${directoryPathQuery}. ${error.message}` });
    }
});

// New endpoint to delete a file
app.post('/api/delete-file', async (req, res) => {
    const filePathToDelete = req.body.filePath;

    if (!filePathToDelete) {
        return res.status(400).json({ error: 'File path is required in the request body' });
    }

    try {
        const decodedFilePath = decodeURIComponent(filePathToDelete);

        if (decodedFilePath.includes('..')) {
            console.warn(`Attempt to use '..' in delete path: ${decodedFilePath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }

        const intendedPath = path.normalize(decodedFilePath);
        const absoluteServerPath = path.resolve(projectRoot, intendedPath);

        if (!absoluteServerPath.startsWith(projectRoot + path.sep) || !absoluteServerPath.endsWith('.json')) {
            console.warn(`Path traversal attempt or invalid file type for deletion. Resolved: '${absoluteServerPath}', ProjectRoot: '${projectRoot}'`);
            return res.status(403).json({ error: 'Access denied: Deletion restricted or invalid file type.' });
        }
        // More specific check for allowed directories (optional, based on security needs)
        const campaignsDir = path.join(projectRoot, 'campaigns');
        // const assetsDefinitionsDir = path.join(projectRoot, 'assets', 'definitions'); // Example if other dirs were allowed
        if (!absoluteServerPath.startsWith(campaignsDir) /* && !absoluteServerPath.startsWith(assetsDefinitionsDir) */) {
            return res.status(403).json({ error: 'File deletion is restricted to campaign directories.' });
        }

        await fs.unlink(absoluteServerPath);
        res.status(200).json({ message: `File '${intendedPath}' deleted successfully.` });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: `File not found: ${filePathToDelete}` });
        }
        console.error('Error deleting file:', error);
        res.status(500).json({ error: `Failed to delete file: ${filePathToDelete}. ${error.message}` });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
