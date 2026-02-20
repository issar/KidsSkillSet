import { useRef, useState } from 'react';
import { useStoreSnapshot } from '../data/store';
import { useT } from '../i18n/translations';
import {
  exportToCsv,
  getStudents,
  mergeStudents,
  getStudentDisplayName,
  importAssessmentsFromCsv,
} from '../data/store';
import {
  parseCsvToRows,
  suggestStudentMapping,
  buildStudentsFromMapping,
  type StudentColumnMapping,
  type StudentCsvField,
} from '../data/csv';
import type { Student } from '../types';

type Step = 'idle' | 'mapping' | 'preview';

export default function ImportExport() {
  const state = useStoreSnapshot();
  const T = useT(state.lang);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const studentsInput = useRef<HTMLInputElement>(null);
  const assessmentsInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('idle');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<StudentColumnMapping>({});
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('Failed to read file'));
      r.readAsText(file, 'utf-8');
    });

  const handleSelectStudentsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      const { headers, rows } = parseCsvToRows(text);
      if (!headers.length) {
        setError('CSV has no header row');
        return;
      }
      const suggested = suggestStudentMapping(headers);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setMapping(suggested);
      setStep('mapping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
    e.target.value = '';
  };

  const setMappingField = (field: StudentCsvField, colIndex: number) => {
    if (colIndex < 0) {
      const next = { ...mapping };
      delete next[field];
      setMapping(next);
    } else {
      setMapping((m) => ({ ...m, [field]: colIndex }));
    }
  };

  const handlePreview = () => {
    const startId = Math.max(1, state.students.length) + Math.floor(Date.now() % 1e6);
    const built = buildStudentsFromMapping(csvRows, mapping, startId);
    setPreviewStudents(built);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    const result = mergeStudents(previewStudents);
    setSuccess(
      state.lang === 'he'
        ? `${T.importSummaryAdded}: ${result.added}, ${T.importSummarySkipped}: ${result.skipped}, ${T.importSummaryErrors}: ${result.errors}`
        : `${T.importSummaryAdded}: ${result.added}, ${T.importSummarySkipped}: ${result.skipped}, ${T.importSummaryErrors}: ${result.errors}`
    );
    setStep('idle');
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setPreviewStudents([]);
  };

  const handleCancelMapping = () => {
    setStep('idle');
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
  };

  const handleImportAssessments = async () => {
    setError(null);
    setSuccess(null);
    const input = assessmentsInput.current;
    if (!input?.files?.length) {
      setError(T.missingFile + ': ' + T.assessmentsCsv);
      return;
    }
    try {
      const text = await readFile(input.files[0]);
      const result = importAssessmentsFromCsv(text);
      if (result.ok) {
        setSuccess('OK');
        input.value = '';
      } else {
        setError(result.error ?? 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
  };

  const handleExport = () => {
    setError(null);
    setSuccess(null);
    const students = getStudents();
    if (!students.length) {
      setError(state.lang === 'he' ? 'אין תלמידים לייצוא.' : 'No students to export.');
      return;
    }
    const { skills: skillsCsv, students: studentsCsv, assessments: assessmentsCsv } = exportToCsv();
    const blob = (data: string, name: string) => {
      const b = new Blob([data], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    blob(skillsCsv, 'skills.csv');
    blob(studentsCsv, 'students.csv');
    blob(assessmentsCsv, 'assessments.csv');
    setSuccess(state.lang === 'he' ? 'יוצאו 3 קבצים' : 'Exported 3 files');
  };

  const fieldLabels: { field: StudentCsvField; label: string }[] = [
    { field: 'full_name', label: T.columnFullName },
    { field: 'first_name', label: T.columnFirstName },
    { field: 'last_name', label: T.columnLastName },
    { field: 'external_id', label: T.columnExternalId },
    { field: 'group_name', label: T.columnGroup },
    { field: 'general_note', label: T.columnNote },
  ];

  const hasExternalIdMapping = mapping.external_id != null && mapping.external_id >= 0;

  return (
    <div className="import-export">
      <h3>{T.importExport}</h3>
      {step === 'idle' && (
        <div className="buttons">
          <input
            ref={studentsInput}
            type="file"
            accept=".csv"
            aria-label={T.studentsCsv}
            onChange={handleSelectStudentsFile}
          />
          <button type="button" onClick={() => studentsInput.current?.click()} className="primary">
            {T.importStudents}
          </button>
          <input
            ref={assessmentsInput}
            type="file"
            accept=".csv"
            aria-label={T.assessmentsCsv}
          />
          <button type="button" onClick={() => assessmentsInput.current?.click()}>
            {T.assessmentsCsv}
          </button>
          <button type="button" onClick={handleImportAssessments}>
            {state.lang === 'he' ? 'ייבא הערכות' : 'Import assessments'}
          </button>
          <button type="button" onClick={handleExport} className="primary">
            {T.exportAll}
          </button>
        </div>
      )}

      {step === 'mapping' && (
        <div className="mapping-step">
          <h4>{T.mapColumns}</h4>
          <p className="mapping-hint">{T.mapColumnsHint}</p>
          {!hasExternalIdMapping && (
            <p className="import-warning">{T.noExternalIdWarning}</p>
          )}
          <div className="mapping-grid">
            {fieldLabels.map(({ field, label }) => (
              <label key={field}>
                <span>{label}</span>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(e) => setMappingField(field, e.target.value === '' ? -1 : Number(e.target.value))}
                >
                  <option value="">{T.doNotMap}</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>{h || `(column ${i + 1})`}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" onClick={handlePreview} className="primary">
              {T.previewImport}
            </button>
            <button type="button" onClick={handleCancelMapping}>{T.cancel}</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="preview-step">
          <h4>{T.previewImport}</h4>
          <p>{previewStudents.length} {state.lang === 'he' ? 'תלמידים' : 'students'}</p>
          <div className="table-wrap preview-table">
            <table className="group-table">
              <thead>
                <tr>
                  <th>{state.lang === 'he' ? 'שם' : 'Name'}</th>
                  <th>{T.columnGroup}</th>
                  <th>{T.columnNote}</th>
                </tr>
              </thead>
              <tbody>
                {previewStudents.slice(0, 15).map((s) => (
                  <tr key={s.student_id}>
                    <td>{getStudentDisplayName(s)}</td>
                    <td>{s.group_name}</td>
                    <td>{s.general_note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewStudents.length > 15 && (
            <p className="preview-more">{state.lang === 'he' ? `ועוד ${previewStudents.length - 15}...` : `...and ${previewStudents.length - 15} more`}</p>
          )}
          <div className="form-actions">
            <button type="button" onClick={handleConfirmImport} className="primary">
              {T.confirmImport}
            </button>
            <button type="button" onClick={() => setStep('mapping')}>{T.cancel}</button>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p style={{ color: '#2d5016' }}>{success}</p>}
    </div>
  );
}
