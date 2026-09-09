const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', '..', 'src', 'shared', 'infrastructure', 'database', 'migrations');
const entitiesDir = path.join(__dirname, '..', '..', 'src', 'shared', 'infrastructure', 'database', 'entities');

const normalize = s => s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

function extractUpMethod(content) {
  // Find "public async up" or just "up" followed by params and opening brace
  // Typical signature: public async up(queryRunner: QueryRunner): Promise<void> {
  const upMatch = content.match(/(\bpublic\s+async\s+up\b|\basync\s+up\b|\bup\b)\s*\([^\)]*\)[^{]*\{/);
  if (!upMatch) return content; // Fallback: process whole file if up method not clearly found

  const startIndex = upMatch.index + upMatch[0].length - 1; // Index of the opening '{'
  let depth = 1;
  for (let i = startIndex + 1; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;

    if (depth === 0) {
      return content.substring(startIndex + 1, i);
    }
  }
  return content;
}

function extractTableEffects(fileContent) {
  const content = extractUpMethod(fileContent);
  const tableEffects = {};

  // Detect full Table definitions: new Table({ name: 'table', columns: [...] })
  const fullRegex = /new\s+Table\(\s*\{\s*name:\s*['"]([a-z0-9_]+)['"]([\s\S]*?)\}\s*\)/g;
  let fullMatch;
  while ((fullMatch = fullRegex.exec(content))) {
    const tableName = fullMatch[1];
    const tableContent = fullMatch[2];
    const colStart = tableContent.indexOf('columns:');
    if (colStart !== -1) {
      const colPart = tableContent.substring(colStart + 'columns:'.length).trim();
      if (colPart.startsWith('[')) {
        let depth = 1;
        let i = 1; // after [
        while (i < colPart.length && depth > 0) {
          if (colPart[i] === '[') depth++;
          else if (colPart[i] === ']') depth--;
          i++;
        }
        if (depth === 0) {
          const columnsSection = colPart.substring(1, i - 1);
          const nameRegex = /name:\s*['"]([a-zA-Z0-9_]+)['"]/g;
          const cols = [];
          let m;
          while ((m = nameRegex.exec(columnsSection))) {
            cols.push(normalize(m[1]));
          }
          if (!tableEffects[tableName]) tableEffects[tableName] = { full: null, adds: [], drops: [] };
          tableEffects[tableName].full = cols;
        }
      }
    }
  }

  // Helper to find balanced closing parenthesis
  function findClosingParen(str, startIndex) {
    let depth = 1;
    for (let i = startIndex; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      if (depth === 0) return i;
    }
    return -1;
  }

  // Detect addColumn (robust) - supports runner.addColumn('table', [cols])
  let pos = 0;
  while ((pos = content.indexOf('addColumn(', pos)) !== -1) {
    const startArgs = pos + 10; // 'addColumn('.length
    const endArgs = findClosingParen(content, startArgs);
    if (endArgs !== -1) {
      const argsContent = content.substring(startArgs, endArgs);
      const firstComma = argsContent.indexOf(',');
      if (firstComma !== -1) {
        const tablePart = argsContent.substring(0, firstComma).trim();
        const tableMatch = tablePart.match(/^['"]([a-zA-Z0-9_]+)['"]$/);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const colPart = argsContent.substring(firstComma + 1);
          const nameRegex = /name:\s*['"]([a-zA-Z0-9_]+)['"]/g;
          let m;
          while ((m = nameRegex.exec(colPart))) {
            if (!tableEffects[tableName]) tableEffects[tableName] = { full: null, adds: [], drops: [] };
            tableEffects[tableName].adds.push(normalize(m[1]));
          }
        }
      }
    }
    pos = startArgs;
  }

  // Detect dropColumn/dropColumns (robust) - supports runner.dropColumn('table', ['c1', 'c2'])
  const dropKeywords = ['dropColumn(', 'dropColumns('];
  for (const keyword of dropKeywords) {
    let dPos = 0;
    while ((dPos = content.indexOf(keyword, dPos)) !== -1) {
      const startArgs = dPos + keyword.length;
      const endArgs = findClosingParen(content, startArgs);
      if (endArgs !== -1) {
        const argsContent = content.substring(startArgs, endArgs);
        const stringRegex = /['"]([a-zA-Z0-9_]+)['"]/g;
        const matches = [];
        let m;
        while ((m = stringRegex.exec(argsContent))) {
          matches.push(m[1]);
        }
        if (matches.length >= 2) {
          const tableName = matches[0];
          const columns = matches.slice(1);
          if (!tableEffects[tableName]) tableEffects[tableName] = { full: null, adds: [], drops: [] };
          for (const col of columns) {
            tableEffects[tableName].drops.push(normalize(col));
          }
        }
      }
      dPos = startArgs;
    }
  }

  // Detect manual queries that drop columns (fallback for raw SQL migrations)
  // e.g. ALTER TABLE `documents_history` DROP COLUMN `document_type_id`
  // e.g. queryRunner.query('ALTER TABLE documents_history DROP COLUMN document_type_id')
  const rawDropRegex = /ALTER\s+TABLE\s+[`'"]?([a-zA-Z0-9_]+)[`'"]?\s+DROP\s+(?:COLUMN\s+)?[`'"]?([a-zA-Z0-9_]+)[`'"]?/gi;
  let rawDropMatch;
  while ((rawDropMatch = rawDropRegex.exec(content))) {
    const tableName = rawDropMatch[1];
    const colName = rawDropMatch[2];
    if (['FOREIGN', 'KEY', 'INDEX', 'CONSTRAINT'].includes(colName.toUpperCase())) continue;
    if (!tableEffects[tableName]) tableEffects[tableName] = { full: null, adds: [], drops: [] };
    tableEffects[tableName].drops.push(normalize(colName));
  }

  return tableEffects;
}

function extractColumnsFromEntity(content) {
  const cols = new Set();

  // Match decorators and property names
  // Capture group 1: Decorators block
  // Capture group 2: Property name
  // This regex assumes decorators and property are relatively close and handles basic parenthesis balancing for decorators
  const propRegex = /((?:@[a-zA-Z0-9_]+(?:\([^)]*\))?\s*)+)\s*([a-zA-Z0-9_]+)\s*[:!?]/g;

  let m;
  while ((m = propRegex.exec(content))) {
    const decorators = m[1];
    const propName = m[2];

    // Check if it's a column-generating decorator
    if (
      decorators.includes('@Column') ||
      decorators.includes('@PrimaryGeneratedColumn') ||
      decorators.includes('@CreateDateColumn') ||
      decorators.includes('@UpdateDateColumn') ||
      decorators.includes('@DeleteDateColumn') ||
      decorators.includes('@EnumColumn') ||
      decorators.includes('@JoinColumn')
    ) {
      // Look for explicit name
      const nameMatch = decorators.match(/name:\s*['"]([^'"]+)['"]/);
      if (nameMatch) {
        cols.add(normalize(nameMatch[1]));
      } else {
        // Fallback to snake_case property name
        cols.add(normalize(propName));
      }
    }
  }

  return Array.from(cols);
}

const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.ts'));
const entityFiles = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.ts'));

// Build a map tableName => [ { file, idx, effects } ] where effects = { full, adds, drops }
const migrationsMap = {};
for (let idx = 0; idx < migrationFiles.length; idx++) {
  const mf = migrationFiles[idx];
  const content = fs.readFileSync(path.join(migrationsDir, mf), 'utf8');

  const tableEffects = extractTableEffects(content);
  for (const [table, effects] of Object.entries(tableEffects)) {
    if (!migrationsMap[table]) migrationsMap[table] = [];
    migrationsMap[table].push({ file: mf, idx, effects });
  }
}

const entitiesMap = {};
for (const ef of entityFiles) {
  const content = fs.readFileSync(path.join(entitiesDir, ef), 'utf8');
  // table name from @Entity('name')
  const tableMatch = content.match(/@Entity\(['`]([a-z0-9_]+)['`]\)/i);
  const tableName = tableMatch ? tableMatch[1] : ef.replace('.ts', '');
  entitiesMap[tableName] = { file: ef, cols: extractColumnsFromEntity(content) };
}

const report = [];
for (const [table, ent] of Object.entries(entitiesMap)) {
  const migs = migrationsMap[table];
  if (!migs || migs.length === 0) {
    report.push({ table, issue: 'no_migration', entityColumns: ent.cols, migrationColumns: [], migrationFiles: [] });
    continue;
  }

  // Sort by filename order (assumed chronological) using the original index to preserve FS order
  const sorted = migs.slice().sort((a, b) => a.idx - b.idx);

  // Combine effects: start with empty set, apply each migration in order
  let current = new Set();
  for (const m of sorted) {
    const e = m.effects;
    if (e.full && Array.isArray(e.full)) {
      current = new Set(e.full);
    } else {
      // apply drops first
      for (const d of e.drops || []) current.delete(d);
      for (const a of e.adds || []) current.add(a);
    }
  }
  const migCols = Array.from(current);

  const missingInMig = ent.cols.filter(c => !migCols.includes(c));
  const extraInMig = migCols.filter(c => !ent.cols.includes(c));
  if (missingInMig.length || extraInMig.length) {
    report.push({ table, issue: 'mismatch', missingInMigration: missingInMig, extraInMigration: extraInMig, migrationFiles: sorted.map(s => s.file), entityFile: ent.file });
  }
}

// also report migrations without entities
// also report migrations without entities (if none of the migration entries for that table were matched by entities)
for (const [table, migArr] of Object.entries(migrationsMap)) {
  if (!entitiesMap[table]) {
    // combine migrations for reporting similar to above
    const sorted = migArr.slice().sort((a, b) => a.idx - b.idx);
    let current = new Set();
    for (const m of sorted) {
      const e = m.effects;
      if (e.full && Array.isArray(e.full)) {
        current = new Set(e.full);
      } else {
        for (const d of e.drops || []) current.delete(d);
        for (const a of e.adds || []) current.add(a);
      }
    }
    report.push({ table, issue: 'no_entity', migrationColumns: Array.from(current), migrationFiles: sorted.map(s => s.file) });
  }
}

const args = process.argv.slice(2);
const ignoreNoEntity = args.includes('--ignore-no-entity');
const ignoreNoMigration = args.includes('--ignore-no-migration');

const finalReport = report.filter(item => {
  if (ignoreNoEntity && item.issue === 'no_entity') return false;
  if (ignoreNoMigration && item.issue === 'no_migration') return false;
  return true;
});

console.log(JSON.stringify(finalReport, null, 2));
