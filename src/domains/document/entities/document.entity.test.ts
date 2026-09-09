///<reference types="bun" />
import { describe, it, expect } from 'bun:test';
import { Document, DocumentProps } from './document.entity';
import { ValidationError } from '@shared/domain/errors';
import { DocumentStatus } from '../value-objects/document-enums';

describe('Document Entity', () => {
  const validProps: DocumentProps = {
    documentModelId: 'model-1',
    name: 'Test Document',
    groupId: 1,
    status: DocumentStatus.DRAFT,
  };

  it('should create a valid document', () => {
    const doc = Document.create(validProps);
    expect(doc).toBeDefined();
  });

  it('should throw error if requiredExpirationDate is true, documentUrl is present, and expirationDate is missing', () => {
    const props: DocumentProps = {
      ...validProps,
      documentUrl: 'http://example.com/doc.pdf',
      issuedDate: new Date(),
      requiredExpirationDate: true,
    };
    expect(() => Document.create(props)).toThrow(ValidationError);
    expect(() => Document.create(props)).toThrow('La fecha de expiración es requerida para este documento');
  });

  it('should NOT throw error if requiredExpirationDate is true but documentUrl is missing', () => {
    const props: DocumentProps = {
      ...validProps,
      requiredExpirationDate: true,
    };
    const doc = Document.create(props);
    expect(doc).toBeDefined();
  });

  it('should NOT throw error if requiredExpirationDate is true, documentUrl is present, and expirationDate is present', () => {
    const props: DocumentProps = {
      ...validProps,
      documentUrl: 'http://example.com/doc.pdf',
      issuedDate: new Date(),
      expirationDate: new Date(Date.now() + 86400000), // tomorrow
      requiredExpirationDate: true,
    };
    const doc = Document.create(props);
    expect(doc).toBeDefined();
  });

  it('updateDates should throw error if requiredExpirationDate is true, documentUrl is present, and new expirationDate is null', () => {
    const props: DocumentProps = {
      ...validProps,
      documentUrl: 'http://example.com/doc.pdf',
      issuedDate: new Date(),
      expirationDate: new Date(Date.now() + 86400000),
      requiredExpirationDate: true,
    };
    const doc = Document.create(props);

    expect(() => doc.updateDates(new Date(), null)).toThrow(ValidationError);
  });
});
