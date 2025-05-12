import * as fs from 'fs';
import JSZip from 'jszip';
import * as path from 'path';

/**
 * Represents a file or directory inside a Zip archive.
 */
interface FileSystemNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileSystemNode[];
}

/**
 * Transparent unzipping interface over a file tree. Zip files are treated as logical directories.
 */
class FileSystem {
  private zipCache: Map<string, JSZip> = new Map();

  /**
   * List files in a directory or zip file
   */
  async listFiles(dirPath: string): Promise<FileSystemNode[]> {
    if (this.hasZipExt(dirPath)) {
      return this.listZipFiles(dirPath);
    }

    const entries = fs.readdirSync(dirPath, {withFileTypes: true});
    const nodes: FileSystemNode[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const node: FileSystemNode = {
        name: entry.name,
        path: entryPath,
        isDirectory: entry.isDirectory(),
      };

      if (node.isDirectory) {
        node.children = await this.listFiles(entryPath);
      } else if (this.hasZipExt(entryPath)) {
        // Handle zip files as directories
        const zipChildren = await this.listZipFiles(entryPath);
        if (zipChildren.length > 0) {
          node.children = zipChildren;
          node.isDirectory = true; // Treat as directory if it contains files
        }
      }

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Read file content, handling both regular files and files inside zip archives
   */
  async readFile(filePath: string): Promise<Buffer> {
    // Check if the path refers to a file inside a zip
    const zipMatch = filePath.match(/^(.+\.zip)#(.+)$/);

    if (zipMatch) {
      const [, zipPath, innerPath] = zipMatch;
      const zip = await this.getZipInstance(zipPath);
      const file = zip.file(innerPath);

      if (!file) {
        throw new Error(`File not found in zip: ${innerPath}`);
      }

      return Buffer.from(await file.async('nodebuffer'));
    }

    // Regular file
    return fs.readFileSync(filePath);
  }

  /**
   * Process a file tree and run a callback on files only.
   */
  async processFileTree(node: FileSystemNode, visitFile: (path: string, content: Buffer<ArrayBufferLike>) => void): Promise<void> {
    if (node.isDirectory && node.children) {
      for (const child of node.children) {
        await this.processFileTree(child, visitFile);
      }
    } else {
      const content: Buffer<ArrayBufferLike> = await this.readFile(node.path);
      visitFile(node.path, content);
    }
  }

  private hasZipExt(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.zip');
  }

  /**
   * Get or create a JSZip instance for a zip file
   */
  private async getZipInstance(zipPath: string): Promise<JSZip> {
    if (this.zipCache.has(zipPath)) {
      return this.zipCache.get(zipPath)!;
    }

    const zipData = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipData);
    this.zipCache.set(zipPath, zip);
    return zip;
  }

  /**
   * List files inside a zip file
   */
  private async listZipFiles(zipPath: string): Promise<FileSystemNode[]> {
    const zip = await this.getZipInstance(zipPath);
    const nodes: FileSystemNode[] = [];
    const directories = new Map<string, FileSystemNode>();

    // Add root directory
    directories.set('', {
      name: '',
      path: zipPath,
      isDirectory: true,
      children: nodes
    });

    // Process each file in the zip
    zip.forEach((relativePath, file) => {
      const parts = relativePath.split('/');
      const fileName = parts.pop() || '';
      const dirPath = parts.join('/');

      // Skip directories (they end with /)
      if (file.dir || !fileName) {
        return;
      }

      // Ensure parent directories exist
      let currentPath = '';
      for (const part of parts) {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!directories.has(currentPath)) {
          const dirNode: FileSystemNode = {
            name: part,
            path: `${zipPath}#${currentPath}`,
            isDirectory: true,
            children: []
          };
          directories.set(currentPath, dirNode);

          // Add to parent
          const parent = directories.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(dirNode);
          }
        }
      }

      // Add file node
      const fileNode: FileSystemNode = {
        name: fileName,
        path: `${zipPath}#${relativePath}`,
        isDirectory: false
      };

      // Add to parent directory
      const parent = directories.get(dirPath);
      if (parent && parent.children) {
        parent.children.push(fileNode);
      }
    });

    return nodes;
  }

}

// Example usage
async function main() {
  const fs = new FileSystem();
  const rootDir = './roms';

  // Process all files, automatically handling zips as directories
  const rootNode: FileSystemNode = {
    name: path.basename(rootDir),
    path: rootDir,
    isDirectory: true,
    children: await fs.listFiles(rootDir)
  };

  const printPath = (path: string) => {
    console.log(path);
  }

  await fs.processFileTree(rootNode, printPath);
}

// main().catch(console.error);