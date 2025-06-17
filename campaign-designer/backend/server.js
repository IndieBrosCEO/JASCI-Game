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
const projectRoot = path.resolve(__dirname, '..', '..');
// Verification log (optional, good for debugging setup)
console.log(`[Server] Project Root Initialized: ${projectRoot}`);


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

        // Path validation: Reject absolute paths and ensure it's within expected structure
        if (path.isAbsolute(decodedClientPath) || /^[a-zA-Z]:\\/.test(decodedClientPath) || decodedClientPath.startsWith('/')) {
            console.warn(`[Server] /api/read-json: Access denied: Absolute path received: ${decodedClientPath}`);
            return res.status(400).json({ error: 'Access denied: Absolute paths are not allowed. Please use paths relative to the project root (e.g., campaigns/yourcampaign/campaign.json or assets/yourfile.json).' });
        }
        // Ensure path uses forward slashes for internal consistency and starts with 'campaigns/' or 'assets/'
        const normalizedClientPath = decodedClientPath.replace(/\\/g, '/');
        if (normalizedClientPath.includes('..')) {
            console.warn(`[Server] /api/read-json: Access denied: Path contains '..': ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }
        if (!normalizedClientPath.startsWith('campaigns/') && !normalizedClientPath.startsWith('assets/')) {
            console.warn(`[Server] /api/read-json: Access denied: Path must start with 'campaigns/' or 'assets/'. Received: ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Path must be under campaigns/ or assets/.' });
        }
        // Use normalizedClientPath for further operations instead of decodedClientPath
        const intendedPath = path.normalize(normalizedClientPath); // path.normalize will use OS specific separators internally for resolution.
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
        console.log(`[Server] Read API: Attempting to access ${absoluteServerPath} (Original client path: ${normalizedClientPath})`);
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

        if (path.isAbsolute(decodedClientPath) || /^[a-zA-Z]:\\/.test(decodedClientPath) || decodedClientPath.startsWith('/')) {
            console.warn(`[Server] /api/write-json: Access denied: Absolute path received: ${decodedClientPath}`);
            return res.status(400).json({ error: 'Access denied: Absolute paths are not allowed for writing.' });
        }
        const normalizedClientPath = decodedClientPath.replace(/\\/g, '/');
        if (normalizedClientPath.includes('..')) {
            console.warn(`[Server] /api/write-json: Access denied: Path contains '..': ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }
        // For writing, be even more restrictive. Only allow writes within 'campaigns/'
        if (!normalizedClientPath.startsWith('campaigns/')) {
            console.warn(`[Server] /api/write-json: Access denied: Write path must start with 'campaigns/'. Received: ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Files can only be written to subdirectories within the campaigns/ folder.' });
        }
        // Use normalizedClientPath for further operations
        const intendedPath = path.normalize(normalizedClientPath);
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

        if (path.isAbsolute(decodedDirPath) || /^[a-zA-Z]:\\/.test(decodedDirPath) || decodedDirPath.startsWith('/')) {
            console.warn(`[Server] /api/list-files: Access denied: Absolute path received: ${decodedDirPath}`);
            return res.status(400).json({ error: 'Access denied: Absolute paths are not allowed for listing.' });
        }
        const normalizedClientPath = decodedDirPath.replace(/\\/g, '/');
        if (normalizedClientPath.includes('..')) {
            console.warn(`[Server] /api/list-files: Access denied: Path contains '..': ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }
        // Restrict listing to 'campaigns/' subdirectories (primarily for dialogue)
        if (!normalizedClientPath.startsWith('campaigns/')) { // Or be more specific if it's always 'campaigns/.../dialogue/'
            console.warn(`[Server] /api/list-files: Access denied: Directory listing must be within 'campaigns/'. Received: ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Directory listing is restricted to subdirectories within campaigns/.' });
        }
        // Use normalizedClientPath for further operations
        const intendedPath = path.normalize(normalizedClientPath);
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

        if (path.isAbsolute(decodedFilePath) || /^[a-zA-Z]:\\/.test(decodedFilePath) || decodedFilePath.startsWith('/')) {
            console.warn(`[Server] /api/delete-file: Access denied: Absolute path received: ${decodedFilePath}`);
            return res.status(400).json({ error: 'Access denied: Absolute paths are not allowed for deletion.' });
        }
        const normalizedClientPath = decodedFilePath.replace(/\\/g, '/');
        if (normalizedClientPath.includes('..')) {
            console.warn(`[Server] /api/delete-file: Access denied: Path contains '..': ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Invalid path components (contains "..").' });
        }
        // Restrict deletion to 'campaigns/' subdirectories
        if (!normalizedClientPath.startsWith('campaigns/') || !normalizedClientPath.endsWith('.json')) { // Also ensure it's a JSON file
            console.warn(`[Server] /api/delete-file: Access denied: Deletion restricted to .json files within 'campaigns/'. Received: ${normalizedClientPath}`);
            return res.status(403).json({ error: 'Access denied: Deletion is restricted to .json files within subdirectories of campaigns/.' });
        }
        // Use normalizedClientPath for further operations
        const intendedPath = path.normalize(normalizedClientPath);
        const absoluteServerPath = path.resolve(projectRoot, intendedPath);

        if (!absoluteServerPath.startsWith(projectRoot + path.sep) || !absoluteServerPath.endsWith('.json')) { // Redundant check for absoluteServerPath, but good for safety
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
