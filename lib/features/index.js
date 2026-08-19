// Default feature sets per institution type. A plan's feature_flags (jsonb,
// from Supabase) can override any of these per-institution later.
const DEFAULTS = {
  training_provider: {
    hasAssessorWorkflow: true,
    hasModerationQueue: true,
    hasPoeUpload: true,
    hasQctoFields: true,
    hasTimetable: false,
    hasFeeTracking: false,
    hasParentPortal: false,
    hasTeacherRoster: false,
  },
  school: {
    hasAssessorWorkflow: false,
    hasModerationQueue: false,
    hasPoeUpload: false,
    hasQctoFields: false,
    hasTimetable: true,
    hasFeeTracking: true,
    hasParentPortal: true,
    hasTeacherRoster: true,
  },
};

export function getFeatures(institution) {
  if (!institution) return DEFAULTS.training_provider;
  const base = DEFAULTS[institution.institution_type] || DEFAULTS.training_provider;
  const overrides = institution.feature_overrides || {};
  return { ...base, ...overrides };
}