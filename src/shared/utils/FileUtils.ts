import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

/**
 * FileUtils utility class for handling file operations
 * Centralizes file upload path management and provides read/save methods
 */
export default class FileUtils {
  private static readonly DEFAULT_UPLOAD_DIR = './uploads';
  private static uploadDir: string | undefined;

  /**
   * Set the upload directory manually (usually used for testing purposes)
   */
  public static setUploadDir(uploadDir?: string): void {
    this.uploadDir = uploadDir || process.env.FILE_STORAGE_LOCAL_PATH || this.DEFAULT_UPLOAD_DIR;
  }

  /**
   * Get the configured upload directory from environment variables
   */
  private static getUploadDir(): string {
    if (!this.uploadDir) {
      this.setUploadDir();
    }
    return this.uploadDir!;
  }

  /**
   * Build a full path for file storage
   * @param relativePath - Relative path within the upload directory
   * @returns Absolute path for the file
   */
  public static buildPath(relativePath: string): string {
    return path.join(this.getUploadDir(), relativePath);
  }

  /**
   * Resolve a file path - if it's already within the upload directory, return as-is
   * Otherwise, prepend the upload directory
   * @param filePath - File path to resolve
   * @returns Resolved file path
   */
  private static resolvePath(filePath: string): string {
    const uploadDir = this.getUploadDir();

    // If it's an absolute path, return as-is
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    // Normalize both paths for comparison
    const normalizedFilePath = path.normalize(filePath);
    const normalizedUploadDir = path.normalize(uploadDir);

    // Check if the file path already starts with the upload directory
    // Handle both './uploads/file.txt' and 'uploads/file.txt' cases
    if (normalizedFilePath.startsWith(normalizedUploadDir + path.sep) ||
      normalizedFilePath === normalizedUploadDir) {
      return normalizedFilePath;
    }

    // Otherwise, build the full path
    return this.buildPath(filePath);
  }

  /**
   * Generate a date-based folder path (YYYY-MM-DD)
   * @param date - Optional date to use (defaults to today)
   * @returns Date folder string in YYYY-MM-DD format
   */
  public static getDateFolder(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  /**
   * Generate a unique filename with timestamp + random suffix.
   * El sufijo aleatorio es necesario además del timestamp: varios llamadores (ej. las
   * firmas dibujadas en `signature-flow`) guardan siempre con el mismo `originalFilename`
   * (p.ej. "signature.png"), así que dos requests concurrentes en el mismo milisegundo
   * generarían el mismo nombre — y por lo tanto el mismo path local y la misma key de S3 —
   * pisándose el archivo entre sí.
   * @param originalFilename - Original filename
   * @returns Unique filename with timestamp and random suffix
   */
  public static generateUniqueFilename(originalFilename: string): string {
    const basename = path.basename(originalFilename);
    const uniqueSuffix = randomBytes(8).toString('hex');
    return `${Date.now()}-${uniqueSuffix}-${basename}`;
  }

  /**
   * Save a file to the local filesystem
   * @param content - File content as Buffer or base64 string
   * @param filename - Original filename
   * @param options - Optional configuration
   * @returns Object containing the saved file path and metadata
   */
  public static async save(
    content: Buffer | string,
    filename: string,
    options: {
      useTimestamp?: boolean;
      subfolder?: string;
      encoding?: 'base64' | 'utf8' | 'binary';
    } = {},
  ): Promise<{
    path: string;
    filename: string;
    size: number;
  }> {
    const {
      useTimestamp = true,
      subfolder = this.getDateFolder(),
      encoding = 'base64',
    } = options;

    // Prepare the target directory
    const targetDir = this.buildPath(subfolder);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Generate filename
    const finalFilename = useTimestamp
      ? this.generateUniqueFilename(filename)
      : path.basename(filename);

    const filePath = path.join(targetDir, finalFilename);

    // Convert content to Buffer if it's a string
    const buffer = typeof content === 'string'
      ? Buffer.from(content, encoding)
      : content;

    // Write the file
    await fs.promises.writeFile(filePath, buffer);

    // Get file stats
    const stats = await fs.promises.stat(filePath);

    return {
      path: filePath,
      filename: finalFilename,
      size: stats.size,
    };
  }

  /**
   * Read a file from the local filesystem
   * @param filePath - Absolute or relative path to the file
   * @param options - Optional configuration
   * @returns File content as Buffer or string
   */
  public static async read(
    filePath: string,
    options?: {
      encoding?: BufferEncoding | null;
      asBase64?: boolean;
    },
  ): Promise<Buffer | string> {
    const { encoding = null, asBase64 = false } = options ?? {};

    // Resolve the full path
    const fullPath = this.resolvePath(filePath);

    // Check if file exists
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not found or not readable: ${fullPath}`);
    }

    // Read the file
    const buffer = await fs.promises.readFile(fullPath);

    // Return based on requested format
    if (asBase64) {
      return buffer.toString('base64');
    }

    if (encoding) {
      return buffer.toString(encoding);
    }

    return buffer;
  }

  /**
   * Delete a file from the local filesystem
   * @param filePath - Absolute or relative path to the file
   * @returns true if file was deleted, false if file didn't exist
   */
  public static async delete(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);

    try {
      await fs.promises.unlink(fullPath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  public static async removeDirectory(path: fs.PathLike, options?: fs.RmOptions): Promise<void> {
    try {
      await fs.promises.rm(path, options);
    } catch {
      // Ignore errors if directory doesn't exist
    }
  }

  /**
   * Check if a file exists
   * @param filePath - Absolute or relative path to the file
   * @returns true if file exists, false otherwise
   */
  public static async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);

    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param filePath - Absolute or relative path to the file
   * @returns File stats object
   */
  public static async getMetadata(filePath: string): Promise<{
    created: Date;
    isDirectory: boolean;
    isFile: boolean;
    modified: Date;
    size: number;
  }> {
    const fullPath = this.resolvePath(filePath);
    const stats = await fs.promises.stat(fullPath);

    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }
}
