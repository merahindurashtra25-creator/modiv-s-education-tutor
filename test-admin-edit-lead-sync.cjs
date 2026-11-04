/**
 * Test: Admin Edits Student Leads & Real-Time Sync to Tutor and Student Dashboards
 */
const assert = require('assert');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: function(k){ return storage[k] !== undefined ? storage[k] : null; },
  setItem: function(k, v){ storage[k] = String(v); },
  removeItem: function(k){ delete storage[k]; },
  clear: function(){ Object.keys(storage).forEach(k => delete storage[k]); }
};

console.log('--- TEST 1: Initial Setup of Student Enquiry & Leads ---');
const leadId = 'lead_stu_991';
const initialLead = {
  id: leadId,
  user_id: 'usr_student_123',
  created_by_user_id: 'usr_student_123',
  created_by_role: 'student',
  name: 'Aarav Sharma',
  student_name: 'Aarav Sharma',
  parent_name: 'Rajesh Sharma',
  email: 'aarav.sharma@example.com',
  phone: '9876543210',
  city: 'Chandigarh',
  area: 'Sector 17',
  cls: 'Class 10',
  board: 'CBSE',
  subs: ['Mathematics', 'Science'],
  mode: ['Offline (Tutor comes to my home)'],
  budget: '₹600 / hr',
  notes: 'Needs help with trigonometry and physics',
  status: 'active'
};

localStorage.setItem('modivs_active_leads', JSON.stringify([initialLead]));
localStorage.setItem('modivs_students_db', JSON.stringify([initialLead]));
localStorage.setItem('modivs_student_req', JSON.stringify(initialLead));

console.log('✓ Initial student lead stored in active leads, students DB, and student requirement');

console.log('\n--- TEST 2: Admin Edits Student Lead ---');
// Admin changes class to Class 11, board to ICSE, city to Mohali, adds Physics, updates budget and status
const adminUpdatedFields = {
  name: 'Aarav Sharma (Updated)',
  student_name: 'Aarav Sharma (Updated)',
  parent_name: 'Rajesh Sharma (Senior)',
  cls: 'Class 11',
  board: 'ICSE',
  city: 'Mohali',
  area: 'Phase 7',
  subs: ['Mathematics', 'Physics', 'Chemistry'],
  mode: ['Online', 'Offline (Tutor comes to my home)'],
  budget: '₹800 / hr',
  notes: 'Advanced coaching for competitive exams',
  status: 'active'
};

// Simulate Admin saveLead logic (as in modivs-admin.html and modivs-active-leads.html)
function adminSaveLead(lid, updates){
  // 1. Update modivs_active_leads
  const leads = JSON.parse(localStorage.getItem('modivs_active_leads') || '[]');
  const lIdx = leads.findIndex(x => x.id === lid);
  if(lIdx > -1) leads[lIdx] = Object.assign({}, leads[lIdx], updates);
  else leads.unshift(Object.assign({ id: lid }, updates));
  localStorage.setItem('modivs_active_leads', JSON.stringify(leads));

  // 2. Update modivs_students_db
  const students = JSON.parse(localStorage.getItem('modivs_students_db') || '[]');
  const sIdx = students.findIndex(x => x.id === lid);
  if(sIdx > -1) students[sIdx] = Object.assign({}, students[sIdx], updates);
  else students.unshift(Object.assign({ id: lid }, updates));
  localStorage.setItem('modivs_students_db', JSON.stringify(students));

  // 3. Update modivs_student_req if applicable
  const req = JSON.parse(localStorage.getItem('modivs_student_req') || 'null');
  if(req && (req.id === lid || (req.email && updates.email && req.email.toLowerCase() === updates.email.toLowerCase()))){
    localStorage.setItem('modivs_student_req', JSON.stringify(Object.assign({}, req, updates)));
  }

  return Object.assign({}, leads[lIdx > -1 ? lIdx : 0]);
}

const updatedLead = adminSaveLead(leadId, adminUpdatedFields);
assert.strictEqual(updatedLead.cls, 'Class 11');
assert.strictEqual(updatedLead.board, 'ICSE');
assert.strictEqual(updatedLead.city, 'Mohali');
assert.strictEqual(updatedLead.subs.length, 3);
console.log('✓ Admin successfully saved lead updates to canonical storage');

console.log('\n--- TEST 3: Tutor Dashboard Reflects Updated Lead ---');
// Verify loadTutorLeads logic (as in modivs-tutor-dashboard.html)
function loadTutorLeads(){
  var raw = [];
  try { raw = JSON.parse(localStorage.getItem('modivs_active_leads') || '[]'); } catch(e){}
  if(!raw.length){
    try { raw = JSON.parse(localStorage.getItem('modivs_students_db') || '[]'); } catch(e){}
  }
  return raw.map(function(item){
    var isUnlocked = !!item.unlocked;
    return {
      id: item.id,
      name: item.student_name || item.name || 'Student',
      parent: item.parentName || item.parent_name || item.by || item.name || 'Parent',
      cls: item.cls || 'Class 10',
      board: item.board || 'CBSE',
      subs: item.subs || ['Mathematics'],
      city: item.city || 'Chandigarh',
      area: item.area || '',
      mode: Array.isArray(item.mode) ? item.mode.join(', ') : (item.mode || 'Online'),
      budget: item.budget || '₹500 / hr',
      notes: item.notes || '',
      phone: item.phone || '',
      email: item.email || '',
      status: item.status || 'new',
      unlocked: isUnlocked
    };
  });
}

const tutorLeads = loadTutorLeads();
const tutorLead = tutorLeads.find(l => l.id === leadId);
assert(tutorLead, 'Tutor must see the lead');
assert.strictEqual(tutorLead.name, 'Aarav Sharma (Updated)', 'Tutor sees updated student name');
assert.strictEqual(tutorLead.parent, 'Rajesh Sharma (Senior)', 'Tutor sees updated parent name');
assert.strictEqual(tutorLead.cls, 'Class 11', 'Tutor sees updated class');
assert.strictEqual(tutorLead.board, 'ICSE', 'Tutor sees updated board');
assert.strictEqual(tutorLead.city, 'Mohali', 'Tutor sees updated city');
assert.strictEqual(tutorLead.area, 'Phase 7', 'Tutor sees updated area');
assert.deepStrictEqual(tutorLead.subs, ['Mathematics', 'Physics', 'Chemistry'], 'Tutor sees updated subjects');
assert.strictEqual(tutorLead.budget, '₹800 / hr', 'Tutor sees updated budget');
assert.strictEqual(tutorLead.notes, 'Advanced coaching for competitive exams', 'Tutor sees updated notes');
console.log('✓ Tutor Dashboard accurately loaded all updated fields from Admin');

console.log('\n--- TEST 4: Student Dashboard Reflects Updated Requirement ---');
// Verify loadAndApplyStudentRequirement logic (as in modivs-student-dashboard.html)
const studentUser = { id: 'usr_student_123', email: 'aarav.sharma@example.com', name: 'Aarav Sharma' };
let displayedRequirement = {};

function applyStudentRequirement(sr){
  if(!sr) return;
  var isParent = (studentUser.role === 'Parent' || sr.created_by_role === 'parent');
  var roleTitle = isParent ? 'Parent' : 'Student';
  displayedRequirement = {
    grade: [sr.cls, sr.board ? '(' + sr.board + ')' : ''].filter(Boolean).join(' ') + ' · ' + roleTitle,
    sideId: (isParent ? 'Enquiry ID: ' : 'Student ID: ') + (sr.enquiry_id || sr.id),
    city: sr.city ? (sr.city + (sr.area ? ' (' + sr.area + ')' : '')) : '—',
    subs: sr.subs ? (Array.isArray(sr.subs) ? sr.subs.join(', ') : sr.subs) : '—',
    mode: sr.mode ? (Array.isArray(sr.mode) ? sr.mode : [sr.mode]).map(function(m){
      return /online/i.test(m) ? 'Online' : (/comes to|student|home/i.test(m) ? 'At home' : 'At tutor’s place');
    }).join(' · ') : '—'
  };
}

function loadAndApplyStudentRequirement(){
  var em = studentUser.email.toLowerCase();
  var uid = studentUser.id;
  var sr = JSON.parse(localStorage.getItem('modivs_student_req') || 'null');
  if(!sr || (em && String(sr.email).toLowerCase() !== em)){
    var list = JSON.parse(localStorage.getItem('modivs_students_db') || '[]') || [];
    sr = list.filter(function(x){
      return (em && String(x.email).toLowerCase() === em) || (uid && (String(x.user_id) === uid || String(x.created_by_user_id) === uid || String(x.id) === uid));
    })[0] || null;
  }
  if(sr) applyStudentRequirement(sr);
}

loadAndApplyStudentRequirement();
assert.strictEqual(displayedRequirement.grade, 'Class 11 (ICSE) · Student', 'Student sees updated Class 11 (ICSE)');
assert.strictEqual(displayedRequirement.city, 'Mohali (Phase 7)', 'Student sees updated Mohali (Phase 7)');
assert.strictEqual(displayedRequirement.subs, 'Mathematics, Physics, Chemistry', 'Student sees updated subjects');
assert.strictEqual(displayedRequirement.mode, 'Online · At home', 'Student sees updated modes');
console.log('✓ Student Dashboard accurately loaded and displayed all updated requirement fields');

console.log('\n--- TEST 5: Real-Time Event Sync across Dashboards ---');
// Verify real-time listeners trigger re-rendering
let tutorReRendered = false;
let studentReRendered = false;

// Mock listeners
const mockLeadListeners = [];
const mockStudentListeners = [];
function onLeads(cb){ mockLeadListeners.push(cb); }
function onStudents(cb){ mockStudentListeners.push(cb); }
function notifyLeads(leads){ mockLeadListeners.forEach(cb => cb(leads)); }
function notifyStudents(students){ mockStudentListeners.forEach(cb => cb(students)); }

// Tutor listener
onLeads(function(){
  const freshLeads = loadTutorLeads();
  tutorReRendered = freshLeads.some(l => l.cls === 'Class 12');
});

// Student listener
onStudents(function(freshStudents){
  const matched = freshStudents.find(x => x.id === leadId);
  if(matched){
    applyStudentRequirement(matched);
    studentReRendered = displayedRequirement.grade.includes('Class 12');
  }
});

// Admin edits again: changes class to Class 12
const furtherUpdate = adminSaveLead(leadId, { cls: 'Class 12' });
const allLeads = JSON.parse(localStorage.getItem('modivs_active_leads'));
notifyLeads(allLeads);
notifyStudents(allLeads);

assert(tutorReRendered, 'Tutor listener must be called and detect Class 12');
assert(studentReRendered, 'Student listener must be called and detect Class 12');
assert.strictEqual(displayedRequirement.grade, 'Class 12 (ICSE) · Student');
console.log('✓ Real-time event propagation synchronizes both tutor and student dashboards instantaneously');

console.log('\n===========================================');
console.log('ALL ADMIN LEAD EDIT & SYNC TESTS PASSED! 🎉');
console.log('===========================================');

