import { useRef } from 'react';
import { useStoreSnapshot } from '../data/store';
import { useT } from '../i18n/translations';
import {
  getSkills,
  getLastAssessmentDate,
  getTwoLowestSkills,
  getStudentDisplayName,
} from '../data/store';
import type { Student } from '../types';

type Props = { groupName: string; students: Student[] };

export default function ReportExport({ groupName, students }: Props) {
  const state = useStoreSnapshot();
  const T = useT(state.lang);
  const skills = getSkills();
  const lang = state.lang;
  const reportRef = useRef<HTMLDivElement>(null);

  const skillName = (skillId: string) => {
    const sk = skills.find((s) => s.skill_id === skillId);
    return sk ? (lang === 'he' ? sk.name_he : sk.name_en) || skillId : skillId;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return T.noAssessment;
    try {
      return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const copySummary = () => {
    const lines: string[] = [T.groupReport + ': ' + groupName, ''];
    for (const s of students) {
      const last = getLastAssessmentDate(s.student_id);
      const two = getTwoLowestSkills(s.student_id);
      const twoStr = two
        .map((t) => `${skillName(t.skillId)} (${t.score})`)
        .join(', ') || '—';
      lines.push(`${getStudentDisplayName(s)} | ${s.group_name} | ${formatDate(last)} | ${T.twoLowestSkills}: ${twoStr}`);
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      /* copied */
    });
  };

  const printReport = () => {
    const content = reportRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="${lang === 'he' ? 'rtl' : 'ltr'}" lang="${lang}">
        <head><meta charset="utf-8"><title>${T.groupReport} - ${groupName}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 1rem; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: start; }
          th { background: #f5f5f5; }
        </style>
        </head>
        <body>
          <h1>${T.groupReport}: ${groupName}</h1>
          ${content.innerHTML}
          <p><small>${new Date().toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB')}</small></p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  return (
    <div className="report-buttons no-print">
      <button type="button" onClick={copySummary}>
        {T.copySummary}
      </button>
      <button type="button" onClick={printReport} className="primary">
        {T.exportReport}
      </button>
      <div ref={reportRef} style={{ display: 'none' }} aria-hidden="true">
        <table>
          <thead>
            <tr>
              <th>{lang === 'he' ? 'שם' : 'Name'}</th>
              <th>{lang === 'he' ? 'קבוצה' : 'Group'}</th>
              <th>{T.lastAssessment}</th>
              <th>{T.twoLowestSkills}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const last = getLastAssessmentDate(s.student_id);
              const two = getTwoLowestSkills(s.student_id);
              const twoStr = two
                .map((t) => `${skillName(t.skillId)} (${t.score})`)
                .join(', ') || '—';
              return (
                <tr key={s.student_id}>
                  <td>{getStudentDisplayName(s)}</td>
                  <td>{s.group_name}</td>
                  <td>{formatDate(last)}</td>
                  <td>{twoStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
