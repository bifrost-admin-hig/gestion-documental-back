import path from 'path';
import archiver, { type Archiver } from 'archiver';
import { type DocumentRepository } from '../repositories/document.repository';
import { Document } from '../entities/document.entity';
import { type TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { File } from '@domains/file/entities/file.entity';
import { ValidationError, ForbiddenError } from '@shared/domain/errors';

const MAX_DOCUMENTS_PER_ZIP = 100;
const MAX_ZIP_SOURCE_BYTES = 500 * 1024 * 1024; // 500MB

function sanitizeForZipPath(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'Sin nombre';
}

function uniqueEntryName(entryDir: string, baseName: string, extension: string, usedNames: Map<string, number>): string {
  const key = `${entryDir}/${baseName}${extension}`;
  const count = usedNames.get(key) ?? 0;
  usedNames.set(key, count + 1);
  if (count === 0) return `${entryDir}/${baseName}${extension}`;
  return `${entryDir}/${baseName} (${count})${extension}`;
}

export class DownloadDocumentsZipUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly fileRepository: TypeOrmFileRepository,
  ) {}

  /**
   * Arma el ZIP de forma asíncrona pero solo después de validar cantidad, pertenencia al
   * grupo del solicitante y tamaño total — así cualquier rechazo ocurre antes de enviar
   * encabezados HTTP, y el resto (lectura de archivos) se transmite en streaming.
   */
  async execute(documentIds: string[], requesterGroupId?: number): Promise<Archiver> {
    if (!documentIds || documentIds.length === 0) {
      throw new ValidationError('Debe proporcionar al menos un documento', 'documentIds');
    }
    if (documentIds.length > MAX_DOCUMENTS_PER_ZIP) {
      throw new ValidationError(`No se pueden descargar más de ${MAX_DOCUMENTS_PER_ZIP} documentos a la vez`, 'documentIds');
    }

    const documents = await this.documentRepository.findByIds(documentIds);

    if (requesterGroupId !== undefined) {
      const hasForbiddenDocument = documents.some((document) => document.groupId !== requesterGroupId);
      if (hasForbiddenDocument) {
        throw new ForbiddenError('No tiene acceso a uno o más de los documentos solicitados');
      }
    }

    const filesByFileId = await this.loadFiles(documents);
    this.assertWithinSizeLimit(filesByFileId);

    const archive: Archiver = archiver('zip', { zlib: { level: 9 } });

    this.buildArchive(archive, documents, filesByFileId).catch((error) => {
      console.error('Error building documents zip:', error);
      archive.emit('error', error instanceof Error ? error : new Error('Error building zip'));
    });

    return archive;
  }

  private async loadFiles(documents: Document[]): Promise<Map<string, File>> {
    const filesByFileId = new Map<string, File>();

    for (const document of documents) {
      if (!document.documentUrl || filesByFileId.has(document.documentUrl)) continue;
      const file = await this.fileRepository.findById(document.documentUrl);
      if (file) filesByFileId.set(document.documentUrl, file);
    }

    return filesByFileId;
  }

  private assertWithinSizeLimit(filesByFileId: Map<string, File>): void {
    let totalBytes = 0;
    for (const file of filesByFileId.values()) {
      totalBytes += file.size ?? 0;
    }

    if (totalBytes > MAX_ZIP_SOURCE_BYTES) {
      const maxMb = Math.floor(MAX_ZIP_SOURCE_BYTES / (1024 * 1024));
      throw new ValidationError(`El tamaño total de los documentos supera el máximo permitido (${maxMb}MB)`, 'documentIds');
    }
  }

  private async buildArchive(archive: Archiver, documents: Document[], filesByFileId: Map<string, File>): Promise<void> {
    const usedNames = new Map<string, number>();

    for (const document of documents) {
      if (!document.documentUrl) continue;
      const file = filesByFileId.get(document.documentUrl);
      if (!file) continue;

      try {
        const buffer = await this.fileRepository.getContent(file);

        const entryDir = [
          sanitizeForZipPath(document.familyName || 'Sin familia'),
          sanitizeForZipPath(document.documentTypeName || 'Sin tipo'),
          sanitizeForZipPath(document.documentSubtypeName || 'Sin subtipo'),
        ].join('/');
        const extension = path.extname(file.originalName);
        const baseName = sanitizeForZipPath(document.name);
        const entryName = uniqueEntryName(entryDir, baseName, extension, usedNames);

        archive.append(buffer, { name: entryName });
      } catch (error) {
        console.error(`Error adding document ${document.id} to zip:`, error);
      }
    }

    await archive.finalize();
  }
}
