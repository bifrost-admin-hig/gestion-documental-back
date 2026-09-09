import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import FileUtils from './FileUtils';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = 'uploads/file-utils-tests';
const TEST_UPLOAD_DIR = `./${UPLOAD_DIR}`;

describe('FileUtils Utility Class', () => {
  beforeAll(async () => {
    // Set FileUtils upload to test directory
    FileUtils.setUploadDir(TEST_UPLOAD_DIR);

    // Clean up test directory if it exists
    try {
      await fs.promises.rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  afterAll(async () => {
    // Restore default FileUtils upload directory
    FileUtils.setUploadDir();

    // Clean up test directory
    try {
      await fs.promises.rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('buildPath', () => {
    it('should build a path within the upload directory', () => {
      const relativePath = 'documents/test.pdf';
      const result = FileUtils.buildPath(relativePath);
      expect(result).toBe(path.join(TEST_UPLOAD_DIR, relativePath));
    });

    it('should handle paths with leading slash', () => {
      const relativePath = '/documents/test.pdf';
      const result = FileUtils.buildPath(relativePath);
      expect(result).toContain('documents/test.pdf');
    });
  });

  describe('getDateFolder', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      const result = FileUtils.getDateFolder();
      const today = new Date().toISOString().slice(0, 10);
      expect(result).toBe(today);
    });

    it('should return specific date in YYYY-MM-DD format', () => {
      const testDate = new Date('2025-11-25T10:00:00Z');
      const result = FileUtils.getDateFolder(testDate);
      expect(result).toBe('2025-11-25');
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate a unique filename with timestamp and random suffix', () => {
      const original = 'document.pdf';
      const result = FileUtils.generateUniqueFilename(original);

      expect(result).toContain('document.pdf');
      expect(result).toMatch(/^\d+-[0-9a-f]{16}-document\.pdf$/);
    });

    it('should handle filenames with paths', () => {
      const original = 'path/to/document.pdf';
      const result = FileUtils.generateUniqueFilename(original);

      expect(result).toContain('document.pdf');
      expect(result).not.toContain('path/to/');
    });

    it('should generate different filenames for consecutive calls, even within the same millisecond', () => {
      // Mismo nombre original repetido (ej. "signature.png" para toda firma dibujada) —
      // sin el sufijo aleatorio, dos llamadas en el mismo milisegundo colisionarían.
      const original = 'signature.png';
      const first = FileUtils.generateUniqueFilename(original);
      const second = FileUtils.generateUniqueFilename(original);

      expect(first).not.toBe(second);
    });
  });

  describe('save', () => {
    it('should save a file from base64 content', async () => {
      const content = 'Hello, World!';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'test.txt';

      const result = await FileUtils.save(base64Content, filename);

      expect(result.filename).toContain('test.txt');
      expect(result.path).toContain(UPLOAD_DIR);
      expect(result.size).toBeGreaterThan(0);

      // Verify file exists and content is correct
      const savedContent = await fs.promises.readFile(result.path, 'utf8');
      expect(savedContent).toBe(content);
    });

    it('should save a file from Buffer content', async () => {
      const content = 'Buffer content test';
      const buffer = Buffer.from(content);
      const filename = 'buffer-test.txt';

      const result = await FileUtils.save(buffer, filename, { encoding: 'utf8' });

      expect(result.filename).toContain('buffer-test.txt');
      expect(result.size).toBe(buffer.length);

      // Verify content
      const savedContent = await fs.promises.readFile(result.path, 'utf8');
      expect(savedContent).toBe(content);
    });

    it('should save file in date-based subfolder by default', async () => {
      const content = Buffer.from('Test content');
      const filename = 'dated-file.txt';

      const result = await FileUtils.save(content, filename, { encoding: 'utf8' });

      const today = new Date().toISOString().slice(0, 10);
      expect(result.path).toContain(today);
    });

    it('should save file in custom subfolder', async () => {
      const content = Buffer.from('Custom folder test');
      const filename = 'custom.txt';
      const subfolder = 'custom-folder';

      const result = await FileUtils.save(content, filename, {
        subfolder,
        encoding: 'utf8',
      });

      expect(result.path).toContain(subfolder);
      expect(result.path).not.toContain(FileUtils.getDateFolder());
    });

    it('should save file without timestamp when useTimestamp is false', async () => {
      const content = Buffer.from('No timestamp');
      const filename = 'exact-name.txt';

      const result = await FileUtils.save(content, filename, {
        useTimestamp: false,
        encoding: 'utf8',
      });

      expect(result.filename).toBe('exact-name.txt');
      expect(result.filename).not.toMatch(/^\d+-/);
    });

    it('should create nested directories if they do not exist', async () => {
      const content = Buffer.from('Nested test');
      const filename = 'nested.txt';
      const subfolder = 'level1/level2/level3';

      const result = await FileUtils.save(content, filename, {
        subfolder,
        encoding: 'utf8',
      });

      expect(result.path).toContain('level1/level2/level3');

      // Verify file exists
      const exists = await FileUtils.exists(result.path);
      expect(exists).toBe(true);
    });
  });

  describe('read', () => {
    it('should read a file as Buffer by default', async () => {
      const content = 'Read test content';
      const { path: filePath } = await FileUtils.save(
        Buffer.from(content),
        'read-test.txt',
        { encoding: 'utf8' },
      );

      const result = await FileUtils.read(filePath);

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).toString('utf8')).toBe(content);
    });

    it('should read a file as string with encoding', async () => {
      const content = 'Encoded read test';
      const { path: filePath } = await FileUtils.save(
        Buffer.from(content),
        'encoded-read.txt',
        { encoding: 'utf8' },
      );

      const result = await FileUtils.read(filePath, { encoding: 'utf8' });

      expect(typeof result).toBe('string');
      expect(result).toBe(content);
    });

    it('should read a file as base64', async () => {
      const content = 'Base64 test content';
      const expectedBase64 = Buffer.from(content).toString('base64');

      const { path: filePath } = await FileUtils.save(
        Buffer.from(content),
        'base64-read.txt',
        { encoding: 'utf8' },
      );

      const result = await FileUtils.read(filePath, { asBase64: true });

      expect(typeof result).toBe('string');
      expect(result).toBe(expectedBase64);
    });

    it('should read file using relative path', async () => {
      const content = 'Relative path test';
      const subfolder = 'relative-test';

      const { filename } = await FileUtils.save(
        Buffer.from(content),
        'relative.txt',
        { subfolder, encoding: 'utf8', useTimestamp: false },
      );

      const relativePath = path.join(subfolder, filename);
      const result = await FileUtils.read(relativePath, { encoding: 'utf8' });

      expect(result).toBe(content);
    });

    it('should throw error when file does not exist', async () => {
      const nonExistentPath = 'non-existent/file.txt';

      await expect(FileUtils.read(nonExistentPath)).rejects.toThrow('File not found or not readable');
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const content = Buffer.from('Delete test');
      const { path: filePath } = await FileUtils.save(content, 'delete-test.txt', {
        encoding: 'utf8',
      });

      // Verify file exists
      let exists = await FileUtils.exists(filePath);
      expect(exists).toBe(true);

      // Delete file
      const result = await FileUtils.delete(filePath);
      expect(result).toBe(true);

      // Verify file no longer exists
      exists = await FileUtils.exists(filePath);
      expect(exists).toBe(false);
    });

    it('should return false when deleting non-existent file', async () => {
      const result = await FileUtils.delete('non-existent-file.txt');
      expect(result).toBe(false);
    });

    it('should delete file using relative path', async () => {
      const subfolder = 'delete-relative';
      const { filename } = await FileUtils.save(
        Buffer.from('Delete relative'),
        'delete-rel.txt',
        { subfolder, encoding: 'utf8', useTimestamp: false },
      );

      const relativePath = path.join(subfolder, filename);
      const result = await FileUtils.delete(relativePath);

      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const { path: filePath } = await FileUtils.save(
        Buffer.from('Exists test'),
        'exists-test.txt',
        { encoding: 'utf8' },
      );

      const result = await FileUtils.exists(filePath);
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const result = await FileUtils.exists('non-existent-file.txt');
      expect(result).toBe(false);
    });

    it('should work with relative paths', async () => {
      const subfolder = 'exists-relative';
      const { filename } = await FileUtils.save(
        Buffer.from('Exists relative'),
        'exists-rel.txt',
        { subfolder, encoding: 'utf8', useTimestamp: false },
      );

      const relativePath = path.join(subfolder, filename);
      const result = await FileUtils.exists(relativePath);

      expect(result).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('should return file metadata', async () => {
      const content = 'Metadata test content';
      const { path: filePath } = await FileUtils.save(
        Buffer.from(content),
        'metadata-test.txt',
        { encoding: 'utf8' },
      );

      const metadata = await FileUtils.getMetadata(filePath);

      expect(metadata.size).toBe(content.length);
      expect(metadata.created).toBeInstanceOf(Date);
      expect(metadata.modified).toBeInstanceOf(Date);
      expect(metadata.isFile).toBe(true);
      expect(metadata.isDirectory).toBe(false);
    });

    it('should work with relative paths', async () => {
      const subfolder = 'metadata-relative';
      const content = 'Metadata relative test';

      const { filename } = await FileUtils.save(
        Buffer.from(content),
        'metadata-rel.txt',
        { subfolder, encoding: 'utf8', useTimestamp: false },
      );

      const relativePath = path.join(subfolder, filename);
      const metadata = await FileUtils.getMetadata(relativePath);

      expect(metadata.size).toBe(content.length);
      expect(metadata.isFile).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      await expect(FileUtils.getMetadata('non-existent.txt')).rejects.toThrow();
    });
  });

  describe('Integration: save and read workflow', () => {
    it('should save and read a file successfully', async () => {
      const originalContent = 'Integration test: save and read';
      const filename = 'integration-test.txt';

      // Save file
      const saveResult = await FileUtils.save(
        Buffer.from(originalContent),
        filename,
        { encoding: 'utf8' },
      );

      expect(saveResult.size).toBe(originalContent.length);

      // Read file
      const readContent = await FileUtils.read(saveResult.path, { encoding: 'utf8' });

      expect(readContent).toBe(originalContent);
    });

    it('should handle binary files (images)', async () => {
      // Create a simple binary content (simulating an image)
      const binaryContent = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const filename = 'test-image.jpg';

      // Save binary file
      const saveResult = await FileUtils.save(binaryContent, filename, {
        encoding: 'binary',
      });

      // Read as buffer
      const readBuffer = await FileUtils.read(saveResult.path);

      expect(readBuffer).toBeInstanceOf(Buffer);
      expect(Buffer.compare(readBuffer as Buffer, binaryContent)).toBe(0);
    });

    it('should handle base64 round-trip', async () => {
      const originalContent = 'Base64 round-trip test';
      const base64Content = Buffer.from(originalContent).toString('base64');

      // Save from base64
      const saveResult = await FileUtils.save(base64Content, 'base64-roundtrip.txt');

      // Read as base64
      const readBase64 = await FileUtils.read(saveResult.path, { asBase64: true });

      expect(readBase64).toBe(base64Content);

      // Verify original content
      const decodedContent = Buffer.from(readBase64 as string, 'base64').toString('utf8');
      expect(decodedContent).toBe(originalContent);
    });
  });
});
