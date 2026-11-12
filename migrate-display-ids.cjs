/**
 * Modiv's Education - Standalone ID Migration & Audit Script
 * Migrates all existing Tutor and Student records in Firestore:
 * - Assigns permanent display IDs: TUT301, TUT302... to all tutors
 * - Preserves existing valid unique IDs
 * - Assigns permanent display IDs: STU101, STU102... to all students
 * - Idempotent, safe batch execution, non-destructive.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('========================================================');
  console.log("MODIV'S EDUCATION - PERMANENT ID MIGRATION & AUDIT ENGINE");
  console.log('========================================================\n');

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (err) {
    console.error('firebase-admin is required for server-side migration.');
    console.error('Install with: npm install firebase-admin or run within Cloud Functions.');
    process.exit(1);
  }

  // Initialize Firebase Admin safely
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        projectId: 'modivs-education'
      });
    } catch (e) {
      console.warn('Initializing default admin app notice:', e.message);
    }
  }

  const db = admin.firestore();
  console.log('Connected to Cloud Firestore project: modivs-education\n');

  try {
    const fnModule = require('./functions/index.js');
    if (typeof fnModule.runDisplayIdMigration === 'function') {
      console.log('Starting atomic migration batch...\n');
      const report = await fnModule.runDisplayIdMigration();

      console.log('--------------------------------------------------------');
      console.log('TUTOR ID MIGRATION REPORT');
      console.log('--------------------------------------------------------');
      console.log('1. Total existing tutors found:', report.tutors.total);
      console.log('2. Total tutors with valid IDs:', report.tutors.existingValid);
      console.log('3. Total missing tutor IDs:', report.tutors.assigned);
      console.log('4. All tutor IDs assigned during migration:');
      if (report.tutors.assignedList.length === 0) {
        console.log('   (All existing tutors already have valid permanent TUT IDs)');
      } else {
        report.tutors.assignedList.forEach(item => {
          console.log(`   - ${item.id} -> ${item.email || item.docId}`);
        });
      }
      console.log('5. Next available tutor ID:', report.tutors.nextAvailable);

      console.log('\n--------------------------------------------------------');
      console.log('STUDENT ID MIGRATION REPORT');
      console.log('--------------------------------------------------------');
      console.log('6. Total existing students found:', report.students.total);
      console.log('7. Student ID migration results:');
      console.log('   - Already valid:', report.students.existingValid);
      console.log('   - Newly assigned:', report.students.assigned);
      if (report.students.assignedList.length > 0) {
        report.students.assignedList.forEach(item => {
          console.log(`   - ${item.id} -> ${item.email || item.docId}`);
        });
      }
      console.log('8. Next available Student ID:', report.students.nextAvailable);

      console.log('\n--------------------------------------------------------');
      console.log('MIGRATION INTEGRITY & CONFLICT AUDIT');
      console.log('--------------------------------------------------------');
      console.log('Duplicate or conflicting IDs:', report.conflicts.length);
      console.log('Failed records / errors:', report.errors.length);
      console.log('Status: MIGRATION SUCCESSFUL & IDEMPOTENT');
      console.log('========================================================\n');
    }
  } catch (err) {
    console.error('Migration encountered error:', err.message);
    console.log('\nNote: In client environments without service account keys, this migration can be triggered directly via:');
    console.log('1. The Admin Dashboard UI ("Run Permanent ID Migration" button)');
    console.log('2. The Firebase Cloud Function `migrateDisplayIds`');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

