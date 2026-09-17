/* Stance — internal field registry for the client-data import mapping layer.
   Source of truth for which raw HR fields Sentinelle's scoring engine
   actually reads (server.js: riskScore/aiInsights/hrRecommendation) vs.
   which are just useful context vs. which are IBM-dataset artifacts no real
   client export will ever have. Used to build the Claude mapping prompt and
   to decide which unmapped fields must block an import.

   Compass (Trajectoire_* fields) is intentionally NOT included here yet —
   those fields live only in the legacy `ibm hr` Airtable table, not in the
   `Employee Analytics` table this app actually reads, and Compass isn't
   wired into the running app. Adding its mapping needs is future work once
   Compass has a defined set of raw inputs. */

const INTERNAL_FIELDS = [
  { key: 'Department', tier: 'required', type: 'category', description: 'Department or business unit name.' },
  { key: 'YearsAtCompany', tier: 'required', type: 'number', description: 'Tenure in years at the company.' },
  { key: 'MonthlyIncome', tier: 'required', type: 'number', description: 'Gross monthly base salary (numeric, single currency).' },
  { key: 'OverTime', tier: 'required', type: 'boolean', description: 'Whether the employee regularly works overtime (Yes/No).' },
  { key: 'JobSatisfaction', tier: 'required', type: 'scale-1-4', description: 'Job satisfaction score, typically on a 1-4 scale.' },
  { key: 'EnvironmentSatisfaction', tier: 'required', type: 'scale-1-4', description: 'Work environment satisfaction score, typically 1-4.' },
  { key: 'WorkLifeBalance', tier: 'required', type: 'scale-1-4', description: 'Work-life balance score, typically 1-4.' },
  { key: 'JobInvolvement', tier: 'required', type: 'scale-1-4', description: 'Job involvement/engagement score, typically 1-4.' },
  { key: 'JobLevel', tier: 'required', type: 'number', description: 'Seniority/job level, typically 1-5.' },
  { key: 'NumCompaniesWorked', tier: 'required', type: 'number', description: 'Number of companies worked at before this one.' },

  { key: 'Age', tier: 'recommended', type: 'number', description: 'Employee age.' },
  { key: 'Gender', tier: 'recommended', type: 'category', description: 'Gender.' },
  { key: 'JobRole', tier: 'recommended', type: 'category', description: 'Job title / role.' },
  { key: 'Attrition', tier: 'recommended', type: 'boolean', description: 'Whether the employee has already left (historical outcome, Yes/No) — only used for the optional attrition-rate KPI.' },
  { key: 'BusinessTravel', tier: 'recommended', type: 'category', description: 'Travel frequency for the role.' },
  { key: 'DistanceFromHome', tier: 'recommended', type: 'number', description: 'Commute distance.' },
  { key: 'Education', tier: 'recommended', type: 'number', description: 'Education level, numeric scale.' },
  { key: 'EducationField', tier: 'recommended', type: 'category', description: 'Field of study.' },
  { key: 'MaritalStatus', tier: 'recommended', type: 'category', description: 'Marital status.' },
  { key: 'PercentSalaryHike', tier: 'recommended', type: 'number', description: 'Last salary increase, percent.' },
  { key: 'PerformanceRating', tier: 'recommended', type: 'number', description: 'Latest performance rating.' },
  { key: 'RelationshipSatisfaction', tier: 'recommended', type: 'scale-1-4', description: 'Relationship-with-colleagues satisfaction score.' },
  { key: 'StockOptionLevel', tier: 'recommended', type: 'number', description: 'Stock option level.' },
  { key: 'TotalWorkingYears', tier: 'recommended', type: 'number', description: 'Total years of professional experience.' },
  { key: 'YearsInCurrentRole', tier: 'recommended', type: 'number', description: 'Years in the current role.' },
  { key: 'YearsSinceLastPromotion', tier: 'recommended', type: 'number', description: 'Years since the last promotion.' },
  { key: 'YearsWithCurrManager', tier: 'recommended', type: 'number', description: 'Years with the current manager.' }
];

const REQUIRED_FIELDS = INTERNAL_FIELDS.filter(f => f.tier === 'required').map(f => f.key);
const MAPPABLE_FIELDS = INTERNAL_FIELDS.filter(f => f.tier !== 'ignore');

function describeFieldsForPrompt() {
  return MAPPABLE_FIELDS
    .map(f => `- ${f.key} (${f.tier}, ${f.type}): ${f.description}`)
    .join('\n');
}

module.exports = { INTERNAL_FIELDS, REQUIRED_FIELDS, MAPPABLE_FIELDS, describeFieldsForPrompt };
