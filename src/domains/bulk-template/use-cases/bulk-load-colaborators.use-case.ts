import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { CreateColaboratorUseCase } from '@domains/colaborators/use-cases/create-colaborator.use-case';
import { CreateUserUseCase } from '@domains/user/use-cases/create-user.use-case';
import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { DocumentType, Gender, CivilStatus } from '@domains/colaborators/value-objects/colaborator-enums';
import { ConflictError, NotFoundError } from '@shared/domain/errors';


const COUNTRIES: Array<{ nameES: string; nameEN: string; iso2: string; iso3: string }> =
  createRequire(__filename)(path.join(__dirname, '../../../shared/data/countries.json'));

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface BulkLoadColaboratorsRequest {
  contentBase64: string;
  filename: string;
  mimeType?: string;
  contractId: string;
  createUsers: boolean;
  uploadedBy: string;
  userGroupId?: number;
}

export interface BulkLoadRowError {
  row: number;
  message: string;
}

export interface BulkLoadColaboratorsResult {
  processedCount: number;
  skippedCount: number;
  errors: BulkLoadRowError[];
}

// ---------------------------------------------------------------------------
// Field name mapping — mirrors the frontend validator so we can parse files
// produced by both form labels and DB snake_case / camelCase column names.
// ---------------------------------------------------------------------------

type FieldKey =
  | 'tipoDocumento' | 'numeroDocumento' | 'nombre'
  | 'apellidoPaterno' | 'apellidoMaterno' | 'nacionalidad'
  | 'sexo' | 'estadoCivil' | 'fechaNacimiento' | 'paisResidencia'
  | 'region' | 'comuna' | 'direccionResidencia' | 'telefono'
  | 'email' | 'profesion' | 'cargo' | 'contactoEmergencia' | 'telefonoEmergencia';

const FIELD_NAMES: Record<FieldKey, string[]> = {
  tipoDocumento:       ['Tipo de Documento',                            'tipo_documento',        'tipoDocumento'],
  numeroDocumento:     ['Número de Documento',                          'numero_documento',      'numeroDocumento'],
  nombre:              ['Nombre',                                        'nombre'],
  apellidoPaterno:     ['Apellido Paterno',                             'apellido_paterno',      'apellidoPaterno'],
  apellidoMaterno:     ['Apellido Materno (Opcional)', 'Apellido Materno', 'apellido_materno', 'apellidoMaterno'],
  nacionalidad:        ['Nacionalidad',                                  'nacionalidad'],
  sexo:                ['Sexo',                                          'sexo'],
  estadoCivil:         ['Estado Civil',                                  'estado_civil',          'estadoCivil'],
  fechaNacimiento:     ['Fecha de Nacimiento',                          'fecha_nacimiento',      'fechaNacimiento'],
  paisResidencia:      ['País de Residencia',                           'pais_residencia',       'paisResidencia'],
  region:              ['Región', 'region',                             'estado_region',         'estadoRegion'],
  comuna:              ['Comuna', 'comuna',                             'ciudad_municipio',      'ciudadMunicipio'],
  direccionResidencia: ['Dirección de Residencia',                      'direccion_residencia',  'direccionResidencia'],
  telefono:            ['Teléfono',                                      'telefono'],
  email:               ['Email',                                         'email'],
  profesion:           ['Profesión/Oficio', 'Profesión',               'profesion'],
  cargo:               ['Cargo',                                         'cargo'],
  contactoEmergencia:  ['Nombre Contacto Emergencia (Opcional)', 'Nombre Contacto Emergencia', 'contacto_emergencia', 'contactoEmergencia'],
  telefonoEmergencia:  ['Teléfono Contacto Emergencia (Opcional)', 'Teléfono Contacto Emergencia', 'telefono_emergencia', 'telefonoEmergencia'],
};

function normalizeHeader(s: string): string {
  return s.trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
}

const REVERSE_MAP = new Map<string, FieldKey>();
for (const [key, names] of Object.entries(FIELD_NAMES) as Array<[FieldKey, string[]]>) {
  for (const name of names) {
    REVERSE_MAP.set(normalizeHeader(name), key as FieldKey);
  }
}

// ---------------------------------------------------------------------------
// Enum value parsing — accepts both DB enum values and form display labels
// ---------------------------------------------------------------------------

const DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  'rut': DocumentType.RUT,
  'rut (chile)': DocumentType.RUT,
  'dni': DocumentType.DNI,
  'pasaporte': DocumentType.PASAPORTE,
  'otro': DocumentType.OTRO,
};

const GENDER_MAP: Record<string, Gender> = {
  'masculino': Gender.MASCULINO,
  'femenino': Gender.FEMENINO,
  'otro': Gender.OTRO,
};

const CIVIL_STATUS_MAP: Record<string, CivilStatus> = {
  'soltero': CivilStatus.SOLTERO,
  'soltero/a': CivilStatus.SOLTERO,
  'casado': CivilStatus.CASADO,
  'casado/a': CivilStatus.CASADO,
  'divorciado': CivilStatus.DIVORCIADO,
  'divorciado/a': CivilStatus.DIVORCIADO,
  'viudo': CivilStatus.VIUDO,
  'viudo/a': CivilStatus.VIUDO,
  'union_civil': CivilStatus.UNION_CIVIL,
  'unión civil': CivilStatus.UNION_CIVIL,
  'union civil': CivilStatus.UNION_CIVIL,
};

function toDocumentType(val: string): DocumentType | null {
  return DOCUMENT_TYPE_MAP[val.toLowerCase().trim()] ?? null;
}

function toGender(val: string): Gender | null {
  return GENDER_MAP[val.toLowerCase().trim()] ?? null;
}

function toCivilStatus(val: string): CivilStatus | null {
  return CIVIL_STATUS_MAP[val.toLowerCase().trim()] ?? null;
}

function formatRUT(rut: string): string {
  // Remove dots and spaces, preserve hyphen
  const clean = rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  const parts = clean.split('-');
  let body: string;
  let verifier: string;
  if (parts.length >= 2) {
    body = parts[0];
    verifier = parts[1];
  } else {
    body = clean.slice(0, -1);
    verifier = clean.slice(-1);
  }
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${verifier}`;
}

// ---------------------------------------------------------------------------
// Country name → ISO2 lookup
// ---------------------------------------------------------------------------

const COUNTRY_ISO2_MAP = new Map<string, string>();
for (const c of COUNTRIES) {
  if (c.nameES) COUNTRY_ISO2_MAP.set(c.nameES.toLowerCase().trim(), c.iso2);
  if (c.nameEN) COUNTRY_ISO2_MAP.set(c.nameEN.toLowerCase().trim(), c.iso2);
  if (c.iso2)   COUNTRY_ISO2_MAP.set(c.iso2.toLowerCase().trim(), c.iso2);
  if (c.iso3)   COUNTRY_ISO2_MAP.set(c.iso3.toLowerCase().trim(), c.iso2);
}

function toCountryISO2(val: string): string {
  return COUNTRY_ISO2_MAP.get(val.toLowerCase().trim()) ?? val;
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Excel / CSV parsing with exceljs
// ---------------------------------------------------------------------------

function getCellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('');
    if ('text' in v) return (v as ExcelJS.CellHyperlinkValue).text;
    if ('result' in v) return (v as ExcelJS.CellFormulaValue).result ?? '';
    if ('error' in v) return '';
  }
  return v;
}

async function parseFile(buffer: ArrayBuffer, filename: string, mimeType?: string): Promise<unknown[][]> {
  const ext = path.extname(filename).toLowerCase();
  const isCSV = ext === '.csv' || mimeType === 'text/csv' || mimeType === 'application/csv';

  const workbook = new ExcelJS.Workbook();

  if (isCSV) {
    const nodeBuffer = Buffer.from(buffer);
    const stream = Readable.from(nodeBuffer);
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const colCount = worksheet.columnCount;
    const values: unknown[] = [];
    for (let c = 1; c <= colCount; c++) {
      values.push(getCellValue(row.getCell(c)));
    }
    rows.push(values);
  });

  return rows;
}

// ---------------------------------------------------------------------------
// Use Case
// ---------------------------------------------------------------------------

export class BulkLoadColaboratorsUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly createColaboratorUseCase: CreateColaboratorUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  async execute(request: BulkLoadColaboratorsRequest): Promise<BulkLoadColaboratorsResult> {
    const rawBuffer = Buffer.from(request.contentBase64, 'base64');
    const buffer = rawBuffer.buffer.slice(rawBuffer.byteOffset, rawBuffer.byteOffset + rawBuffer.byteLength) as ArrayBuffer;

    // Resolve contract → groupId (prefer the uploading user's group)
    const contract = await this.contractRepository.findById(request.contractId);
    if (!contract) throw new NotFoundError('Contract');
    const groupId = request.userGroupId ?? contract.groupId;

    // Parse file
    const rows = await parseFile(buffer, request.filename, request.mimeType);
    if (rows.length < 2) {
      return { processedCount: 0, skippedCount: 0, errors: [] };
    }

    // Map headers to field keys
    const header = (rows[0] as unknown[]).map((c) => String(c ?? '').trim());
    const fieldIndex = new Map<FieldKey, number>();
    header.forEach((col, i) => {
      const key = REVERSE_MAP.get(normalizeHeader(col));
      if (key && !fieldIndex.has(key)) fieldIndex.set(key, i);
    });

    const getVal = (cells: unknown[], key: FieldKey): string => {
      const i = fieldIndex.get(key);
      return i !== undefined ? String(cells[i] ?? '').trim() : '';
    };

    const getRaw = (cells: unknown[], key: FieldKey): unknown => {
      const i = fieldIndex.get(key);
      return i !== undefined ? cells[i] : undefined;
    };

    const dataRows = rows.slice(1);
    let processedCount = 0;
    let skippedCount = 0;
    const errors: BulkLoadRowError[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowNum = i + 2; // 1-based, row 1 = header
      const cells = dataRows[i] as unknown[];

      // Skip completely empty rows
      const isEmpty = cells.every((c) => c === null || c === undefined || String(c).trim() === '');
      if (isEmpty) continue;

      const tipoDocumentoRaw = getVal(cells, 'tipoDocumento');
      const tipoDocumento = toDocumentType(tipoDocumentoRaw);
      if (!tipoDocumento) {
        errors.push({ row: rowNum, message: `Tipo de documento desconocido: "${tipoDocumentoRaw}"` });
        continue;
      }

      const sexoRaw = getVal(cells, 'sexo');
      const sexo = toGender(sexoRaw);
      if (!sexo) {
        errors.push({ row: rowNum, message: `Sexo desconocido: "${sexoRaw}"` });
        continue;
      }

      const estadoCivilRaw = getVal(cells, 'estadoCivil');
      const estadoCivil = toCivilStatus(estadoCivilRaw);
      if (!estadoCivil) {
        errors.push({ row: rowNum, message: `Estado civil desconocido: "${estadoCivilRaw}"` });
        continue;
      }

      const fechaNacimientoRaw = getRaw(cells, 'fechaNacimiento');
      const fechaNacimiento = parseDate(fechaNacimientoRaw);
      if (!fechaNacimiento) {
        errors.push({ row: rowNum, message: `Fecha de nacimiento inválida: "${fechaNacimientoRaw}"` });
        continue;
      }

      const nombre = getVal(cells, 'nombre');
      const apellidoPaterno = getVal(cells, 'apellidoPaterno');
      const numeroDocumentoRaw = getVal(cells, 'numeroDocumento');
      const numeroDocumento = tipoDocumento === DocumentType.RUT
        ? formatRUT(numeroDocumentoRaw)
        : numeroDocumentoRaw;
      const email = getVal(cells, 'email');

      if (!nombre || !apellidoPaterno || !numeroDocumento || !email) {
        errors.push({ row: rowNum, message: 'Faltan campos obligatorios (nombre, apellido, documento, email)' });
        continue;
      }

      // Duplicate check: skip if this document number already exists within the same group (excludes soft-deleted)
      const existingByDoc = await this.colaboratorRepository.findByNumeroDocumentoAndGroupId(numeroDocumento, groupId);
      if (existingByDoc) {
        skippedCount++;
        continue;
      }

      const paisResidencia = toCountryISO2(getVal(cells, 'paisResidencia'));
      const isChile = paisResidencia.toUpperCase() === 'CL';
      const regionVal = getVal(cells, 'region') || undefined;
      const comunaVal = getVal(cells, 'comuna') || undefined;

      try {
        const colaborador = await this.createColaboratorUseCase.execute({
          tipoDocumento,
          numeroDocumento,
          nombre,
          apellidoPaterno,
          apellidoMaterno: getVal(cells, 'apellidoMaterno') || undefined,
          nacionalidad: getVal(cells, 'nacionalidad'),
          sexo,
          estadoCivil,
          fechaNacimiento,
          paisResidencia,
          region: isChile ? regionVal : undefined,
          comuna: isChile ? comunaVal : undefined,
          estadoRegion: !isChile ? regionVal : undefined,
          ciudadMunicipio: !isChile ? comunaVal : undefined,
          direccionResidencia: getVal(cells, 'direccionResidencia'),
          telefono: getVal(cells, 'telefono'),
          email,
          contactoEmergencia: getVal(cells, 'contactoEmergencia') || undefined,
          telefonoEmergencia: getVal(cells, 'telefonoEmergencia') || undefined,
          profesion: getVal(cells, 'profesion'),
          cargo: getVal(cells, 'cargo'),
          groupId,
          contractIds: [request.contractId],
        });

        processedCount++;

        if (request.createUsers) {
          try {
            await this.createUserUseCase.execute({
              email: colaborador.email,
              firstName: colaborador.nombre,
              lastName: colaborador.apellidoPaterno,
              password: crypto.randomBytes(16).toString('hex'),
              groupId,
            });
          } catch (userError) {
            if (!(userError instanceof ConflictError)) {
              errors.push({ row: rowNum, message: `Colaborador creado, pero no se pudo crear usuario: ${(userError as Error).message}` });
            }
            // ConflictError means user with this email already exists — acceptable
          }
        }
      } catch (err) {
        errors.push({ row: rowNum, message: (err as Error).message });
      }
    }

    return { processedCount, skippedCount, errors };
  }
}
