/**
 * Student & client segmentation model.
 *
 * COMPLETE_STUDENT_LIST_FULL.docx = ALL_TIME registry (every person ever).
 * Morpheus must resolve a user to one of these segments before routing,
 * using Trinity's intelligence report as the source of truth.
 *
 * Segment hierarchy (Morpheus routing priority):
 *   TRUST_CLIENT      → currently in trust delivery process
 *   ACTIVE_STUDENT    → enrolled, paying, currently attending
 *   TRUST_PROSPECT    → completed intake, not yet purchased trust
 *   ACADEMY_PROSPECT  → expressed interest, not yet enrolled
 *   FORMER_STUDENT    → completed course(s), no active enrolment
 *   ALL_TIME          → exists in master list, no current relationship
 *   UNKNOWN           → no record found — treat as new prospect
 */

const SEGMENTS = {
  TRUST_CLIENT:     'trust_client',
  ACTIVE_STUDENT:   'active_student',
  TRUST_PROSPECT:   'trust_prospect',
  ACADEMY_PROSPECT: 'academy_prospect',
  FORMER_STUDENT:   'former_student',
  ALL_TIME:         'all_time',
  UNKNOWN:          'unknown'
};

// Routing rules: what Morpheus offers each segment by default.
const SEGMENT_ROUTING = {
  [SEGMENTS.TRUST_CLIENT]: {
    primaryAgent: 'TrustAgent',
    action: 'update',
    greeting: 'Welcome back, Ambassador. Let us continue building your Living Estate.'
  },
  [SEGMENTS.ACTIVE_STUDENT]: {
    primaryAgent: 'AcademyAgent',
    action: 'portal',
    greeting: 'Peace and Balance. Your academy journey continues — how can I support you today?'
  },
  [SEGMENTS.TRUST_PROSPECT]: {
    primaryAgent: 'TrustAgent',
    action: 'intake',
    greeting: 'Welcome back. Your trust structure awaits — shall we continue the consultation?'
  },
  [SEGMENTS.ACADEMY_PROSPECT]: {
    primaryAgent: 'AcademyAgent',
    action: 'enroll',
    greeting: 'Good to hear from you. Your path to sovereignty begins with the Academy.'
  },
  [SEGMENTS.FORMER_STUDENT]: {
    primaryAgent: 'TrustAgent',
    action: 'view',
    greeting: 'Welcome back, Ambassador. As a graduate, your next step is securing your estate with a Living Trust.'
  },
  [SEGMENTS.ALL_TIME]: {
    primaryAgent: 'AcademyAgent',
    action: 'view',
    greeting: 'Peace and Balance. iRise Academy is ready to serve your sovereignty journey.'
  },
  [SEGMENTS.UNKNOWN]: {
    primaryAgent: 'TrustAgent',
    action: 'view',
    greeting: 'Peace and Balance. I am MORPHEUS — how shall we proceed, Ambassador?'
  }
};

module.exports = { SEGMENTS, SEGMENT_ROUTING };
