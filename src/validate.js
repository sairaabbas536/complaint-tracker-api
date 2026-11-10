// Validation rules (the website uses the same rules in public/app.js)
const NAME_RE = /^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/;   // full name, every word starts with a capital letter, e.g. "Saira Abbas"
const ROLL_RE = /^[A-Z]\d{2}[A-Z]{2}\d{3}$/;        // capital letters only, e.g. "K22SW006"
const STATUSES = ['Pending', 'In Progress', 'Resolved'];
const REQUIRED = ['studentName', 'rollNo', 'category', 'description'];

// returns an error message, or null if the body is valid
function validateComplaint(body) {
  const b = body && typeof body === 'object' ? body : {};
  const missing = REQUIRED.filter((f) => typeof b[f] !== 'string' || b[f].trim() === '');
  if (missing.length) return 'Missing or invalid fields: ' + missing.join(', ');
  if (b.studentName.trim().length > 60 || !NAME_RE.test(b.studentName.trim()))
    return 'Invalid studentName: use the full name with each word starting with a capital letter (e.g. Saira Abbas)';
  if (!ROLL_RE.test(b.rollNo.trim()))
    return 'Invalid rollNo: use capital letters only, e.g. K22SW006';
  if (b.category.trim().length > 50) return 'Invalid category: maximum 50 characters';
  if (b.description.trim().length > 500) return 'Invalid description: maximum 500 characters';
  if (b.status !== undefined && !STATUSES.includes(b.status))
    return 'Invalid status: must be one of ' + STATUSES.join(', ');
  return null;
}

// clean copy of the fields we store (anything else in the body is ignored)
function cleanComplaint(b) {
  return {
    studentName: b.studentName.trim(), rollNo: b.rollNo.trim(), category: b.category.trim(),
    description: b.description.trim(), status: b.status || 'Pending',
  };
}
module.exports = { validateComplaint, cleanComplaint };
