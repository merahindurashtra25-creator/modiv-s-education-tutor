/**
 * Comprehensive verification suite for Auto Clean SEO-Friendly Slug System
 * Tests:
 * 1. modivs-slug.js unit tests (slugify, blog, tutor, lead, isValid, edge cases)
 * 2. Accent removal, symbol expansion, word-boundary truncation, trimming
 * 3. Firestore blog publishing with auto slug generation
 * 4. Blog retrieval by SEO slug and legacy doc ID (backward compatibility)
 * 5. Tutor profile resolution by SEO slug and legacy key/id
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Load ModivsSlug
const ModivsSlug = require('../modivs-slug.js');

console.log('--- 1. Testing ModivsSlug Core Slugify Engine ---');

// Test basic slugification
assert.strictEqual(
  ModivsSlug.slugify('Hello World'),
  'hello-world',
  'Basic Hello World failed'
);

// Test lowercasing
assert.strictEqual(
  ModivsSlug.slugify('ALL UPPERCASE LETTERS'),
  'all-uppercase-letters',
  'Uppercase conversion failed'
);

// Test accent / diacritic stripping
assert.strictEqual(
  ModivsSlug.slugify('Café & Crème Brûlée in München über résumé'),
  'cafe-and-creme-brulee-in-munchen-uber-resume',
  'Accent removal failed'
);

// Test symbol expansion (&, @, %, +)
assert.strictEqual(
  ModivsSlug.slugify('Maths & Science @ Modivs 100% Guaranteed + Extra Classes'),
  'maths-and-science-at-modivs-100-percent-guaranteed-plus-extra-classes',
  'Symbol expansion failed'
);

// Test special character and punctuation removal
assert.strictEqual(
  ModivsSlug.slugify('Class 10th CBSE: Physics, Chemistry & Maths! (2026 Syllabus?)'),
  'class-10th-cbse-physics-chemistry-and-maths-2026-syllabus',
  'Punctuation removal failed'
);

// Test deduplication of hyphens and whitespace
assert.strictEqual(
  ModivsSlug.slugify('   ---Multiple----Spaces    and___Underscores---   '),
  'multiple-spaces-and-underscores',
  'Whitespace/underscore deduplication failed'
);

// Test trimming leading and trailing hyphens
assert.strictEqual(
  ModivsSlug.slugify('---starts-and-ends-with-dashes---'),
  'starts-and-ends-with-dashes',
  'Trimming hyphens failed'
);

// Test empty and symbol-only strings fallback
assert.strictEqual(
  ModivsSlug.slugify(''),
  'item',
  'Empty string fallback failed'
);
assert.strictEqual(
  ModivsSlug.slugify('!@#$%^&*()', { fallback: 'custom-fallback' }),
  // Note: @, %, & expand to at, percent, and
  'at-percent-and',
  'Symbol string expansion failed'
);
assert.strictEqual(
  ModivsSlug.slugify('!#$^*()', { fallback: 'custom-fallback' }),
  'custom-fallback',
  'No alphanumeric fallback failed'
);

// Test word-boundary truncation
const longTitle = 'This is an exceptionally long blog post title designed to verify that our slug generator cleanly truncates at word boundaries without cutting words in half or leaving trailing hyphens';
const slug80 = ModivsSlug.slugify(longTitle, { maxLength: 80 });
assert.ok(slug80.length <= 80, `Slug length ${slug80.length} exceeds 80`);
assert.ok(!slug80.endsWith('-'), 'Slug ends with hyphen');
assert.ok(!slug80.includes('--'), 'Slug contains double hyphen');
console.log('Truncated slug (max 80):', slug80);

console.log('✔ ModivsSlug core slugify engine tests passed.\n');

console.log('--- 2. Testing Specialized Helpers (blog, tutor, lead, isValid) ---');

// Blog slug
const blogTitle = '10 Proven Study Tips for CBSE Board Exams 2026!';
const blogSlug = ModivsSlug.blog(blogTitle);
assert.strictEqual(
  blogSlug,
  '10-proven-study-tips-for-cbse-board-exams-2026',
  'Blog slug mismatch'
);

// Tutor slug
const tutor1 = { name: 'Dr. Priya Verma', subs: ['Physics', 'Mathematics'], city: 'Chandigarh' };
assert.strictEqual(
  ModivsSlug.tutor(tutor1),
  'dr-priya-verma-physics-chandigarh',
  'Tutor slug 1 mismatch'
);

const tutor2 = { name: 'Aman Sharma', subject: 'Maths', city: 'Mohali' };
assert.strictEqual(
  ModivsSlug.tutor(tutor2),
  'aman-sharma-maths-mohali',
  'Tutor slug 2 mismatch'
);

const tutor3 = { name: 'Simran Kaur' };
assert.strictEqual(
  ModivsSlug.tutor(tutor3),
  'simran-kaur',
  'Tutor slug 3 mismatch'
);

// Lead slug
const lead1 = { cls: '10', subject: 'Mathematics', city: 'Mohali' };
assert.strictEqual(
  ModivsSlug.lead(lead1),
  'class-10-mathematics-mohali',
  'Lead slug 1 mismatch'
);

// Validation
assert.strictEqual(ModivsSlug.isValid('hello-world'), true, 'hello-world should be valid');
assert.strictEqual(ModivsSlug.isValid('dr-priya-verma-physics-chandigarh'), true, 'tutor slug should be valid');
assert.strictEqual(ModivsSlug.isValid('10-tips-for-exam-2026'), true, 'numeric slug should be valid');
assert.strictEqual(ModivsSlug.isValid('Hello-World'), false, 'uppercase should be invalid');
assert.strictEqual(ModivsSlug.isValid('-leading-dash'), false, 'leading dash should be invalid');
assert.strictEqual(ModivsSlug.isValid('trailing-dash-'), false, 'trailing dash should be invalid');
assert.strictEqual(ModivsSlug.isValid('double--dash'), false, 'double dash should be invalid');
assert.strictEqual(ModivsSlug.isValid('with spaces'), false, 'spaces should be invalid');
assert.strictEqual(ModivsSlug.isValid('with!symbols'), false, 'symbols should be invalid');

console.log('✔ Specialized slug helper tests passed.\n');

console.log('--- 3. Testing Blog System Integration (modivs-blogs.js) ---');

// Setup mock window & Firebase environment for modivs-blogs.js
const mockDb = {
  blogs: new Map(),
  blogQuota: new Map()
};

const mockFirebase = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date()
    }
  }
};

const fakeCurrentUser = { uid: 'tutor_uid_123', email: 'tutor@example.com', displayName: 'Priya Verma' };

global.window = {
  ModivsSlug: ModivsSlug,
  EducationBFirebase: {
    db: {
      collection: (colName) => {
        if (colName === 'blogs') {
          return {
            doc: (docId) => ({
              get: async () => {
                const data = mockDb.blogs.get(docId);
                return {
                  exists: !!data,
                  id: docId,
                  data: () => data
                };
              },
              delete: async () => {
                mockDb.blogs.delete(docId);
                return true;
              }
            }),
            where: (field, op, val) => ({
              limit: (lim) => ({
                get: async () => {
                  const results = [];
                  for (const [id, data] of mockDb.blogs.entries()) {
                    if (data[field] === val) {
                      results.push({ id, data: () => data });
                      if (results.length >= lim) break;
                    }
                  }
                  return {
                    empty: results.length === 0,
                    docs: results
                  };
                }
              })
            }),
            orderBy: () => ({
              limit: () => ({
                get: async () => {
                  const docs = [];
                  for (const [id, data] of mockDb.blogs.entries()) {
                    docs.push({ id, data: () => data });
                  }
                  return { docs };
                }
              })
            }),
            add: async (data) => {
              const id = 'admin_blog_' + Date.now();
              mockDb.blogs.set(id, { ...data });
              return { id };
            }
          };
        }
        if (colName === 'blog_quota') {
          return {
            doc: (docId) => ({
              get: async () => {
                const data = mockDb.blogQuota.get(docId);
                return {
                  exists: !!data,
                  data: () => data || {}
                };
              }
            })
          };
        }
      },
      batch: () => {
        const ops = [];
        return {
          set: (ref, data) => ops.push({ ref, data }),
          commit: async () => {
            for (const op of ops) {
              if (op.data.count !== undefined) {
                // Quota doc
                mockDb.blogQuota.set('tutor_uid_123_2026_11', op.data);
              } else {
                // Blog doc
                mockDb.blogs.set('tutor_uid_123_2026_11_1', op.data);
              }
            }
          }
        };
      }
    },
    auth: {
      currentUser: fakeCurrentUser,
      onAuthStateChanged: (cb) => {
        cb(fakeCurrentUser);
        return () => {};
      }
    }
  }
};
global.firebase = mockFirebase;

// Load modivs-blogs.js
const blogsCode = fs.readFileSync(path.join(__dirname, '../modivs-blogs.js'), 'utf8');
eval(blogsCode);

const ModivsBlogs = global.window.ModivsBlogs;
assert.ok(ModivsBlogs, 'ModivsBlogs should be defined on window');

(async function testBlogFlow() {
  // Test tutor publish with auto slug
  const blogTitle = '10 Proven Study Tips for CBSE Board Exams 2026';
  const blogBody = 'Here is a comprehensive guide to scoring high in your CBSE board examinations. Make sure to maintain a consistent revision schedule and solve past year question papers. Stay focused and keep practising.';
  
  const blogId = await ModivsBlogs.publish({
    title: blogTitle,
    category: 'Exam Prep',
    body: blogBody,
    authorName: 'Dr. Priya Verma'
  });

  assert.ok(blogId, 'blogId should be returned from publish');
  const savedPost = mockDb.blogs.get(blogId);
  assert.ok(savedPost, 'Post should be saved in database');
  assert.strictEqual(
    savedPost.slug,
    '10-proven-study-tips-for-cbse-board-exams-2026',
    'Slug must be auto-generated and saved on publish'
  );
  console.log('Saved post with auto slug:', savedPost.slug);

  // Test retrieval by doc ID (backward compatibility)
  const postById = await ModivsBlogs.get(blogId);
  assert.ok(postById, 'Post should be retrieved by doc ID');
  assert.strictEqual(postById.id, blogId);
  assert.strictEqual(postById.slug, '10-proven-study-tips-for-cbse-board-exams-2026');

  // Test retrieval by SEO Slug
  const postBySlug = await ModivsBlogs.get('10-proven-study-tips-for-cbse-board-exams-2026');
  assert.ok(postBySlug, 'Post should be retrieved by clean SEO slug');
  assert.strictEqual(postBySlug.id, blogId);
  assert.strictEqual(postBySlug.title, blogTitle);

  // Test retrieval of legacy post that has NO slug field stored in Firestore
  const legacyId = 'legacy_blog_001';
  mockDb.blogs.set(legacyId, {
    title: 'How to Manage Exam Stress & Anxiety',
    category: 'Study Tips',
    body: 'Exam anxiety is common among students. Take regular breaks, do breathing exercises, and ensure good sleep before the exam day.',
    authorName: 'Modiv’s Team',
    authorUid: 'admin_123',
    read: 2,
    createdAt: new Date()
    // Notice: NO slug property here!
  });

  const legacyPost = await ModivsBlogs.get(legacyId);
  assert.ok(legacyPost, 'Legacy post retrieved by ID');
  assert.strictEqual(legacyPost.slug, 'how-to-manage-exam-stress-and-anxiety', 'Legacy post gets auto-generated slug on load');

  const legacyByAutoSlug = await ModivsBlogs.get('how-to-manage-exam-stress-and-anxiety');
  assert.ok(legacyByAutoSlug, 'Legacy post can be retrieved by its auto-generated clean slug!');
  assert.strictEqual(legacyByAutoSlug.id, legacyId);

  // Test non-existent post returns null
  const notFound = await ModivsBlogs.get('non-existent-blog-slug');
  assert.strictEqual(notFound, null, 'Non-existent post returns null');

  console.log('✔ Blog publishing and retrieval by slug tests passed.\n');

  console.log('--- 4. Testing Tutor Profile Resolution by Slug ---');

  const tutorsList = [
    { id: 'TUT301', name: 'Dr. Priya Verma', email: 'priya.verma@example.com', subs: ['Physics', 'Chemistry'], city: 'Chandigarh' },
    { id: 'TUT302', name: 'Aman Sharma', email: 'aman@example.com', subs: ['Mathematics'], city: 'Mohali' },
    { id: 'TUT303', name: 'Sunita Rao', email: 'sunita@example.com', subs: ['English'], city: 'Panchkula' }
  ];

  function matchTutor(target) {
    if (!target) return null;
    const k = String(target).toLowerCase().trim();
    return tutorsList.filter(x => {
      const tutorKey = String(x.id || x.email || x.name).toLowerCase();
      return tutorKey === k ||
             (x.email && x.email.toLowerCase() === k) ||
             (x.id && String(x.id).toLowerCase() === k) ||
             (x.slug && x.slug.toLowerCase() === k) ||
             (ModivsSlug.tutor(x) === k);
    })[0] || null;
  }

  // Resolving by SEO Slug
  const tBySlug = matchTutor('dr-priya-verma-physics-chandigarh');
  assert.ok(tBySlug, 'Tutor should be matched by SEO slug');
  assert.strictEqual(tBySlug.id, 'TUT301');

  // Resolving by Legacy Email
  const tByEmail = matchTutor('aman@example.com');
  assert.ok(tByEmail, 'Tutor should be matched by email');
  assert.strictEqual(tByEmail.id, 'TUT302');

  // Resolving by Legacy TUT ID
  const tById = matchTutor('TUT303');
  assert.ok(tById, 'Tutor should be matched by ID');
  assert.strictEqual(tById.name, 'Sunita Rao');

  console.log('✔ Tutor resolution by SEO slug and legacy IDs passed.\n');

  console.log('====================================================');
  console.log('🎉 ALL AUTO CLEAN SEO-FRIENDLY SLUG TESTS PASSED! 🎉');
  console.log('====================================================');
})().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
