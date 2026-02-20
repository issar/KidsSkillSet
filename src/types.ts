export interface Skill {
  skill_id: string;
  name_he: string;
  desc_he: string;
  name_en: string;
  desc_en: string;
  order_index: number;
}

export interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  /** When set, display this instead of first_name + last_name (e.g. from single name column import) */
  full_name?: string;
  /** Optional stable id for import matching; if present, used as primary key when merging */
  external_id?: string;
  group_name: string;
  general_note: string;
  active: string; // "1" | "0" in CSV
}

export type AssessmentPerspective = 'parent' | 'instructor';

export interface AssessmentRow {
  assessment_id: string;
  student_id: string;
  date_iso: string;
  skill_id: string;
  score: number;
  note: string;
  /** Which perspective this row belongs to; legacy rows without this default to instructor */
  perspective?: AssessmentPerspective;
}

export type SkillScores = Record<string, { score: number; note: string }>;

/** One assessment = one date per student; parent and instructor are two perspectives of the same evaluation */
export interface Assessment {
  assessment_id: string;
  student_id: string;
  date_iso: string;
  parent_scores: SkillScores;
  instructor_scores: SkillScores;
}

export type Lang = 'he' | 'en';

export interface AppState {
  skills: Skill[];
  students: Student[];
  assessmentRows: AssessmentRow[];
  lang: Lang;
  /** Extra group names (no students yet) for UI */
  groupNames: string[];
}
