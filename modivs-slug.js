/* Modiv's Education - Auto Clean SEO-Friendly Slug Utility
   Generates clean, human-readable, URL-safe slugs for blogs, tutor profiles, leads & pages.
   Removes hyphens (-) so URLs show in clean title format e.g. "modivs tutors chandigarh".
   Works in browser (window.ModivsSlug) and Node.js (CommonJS). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.ModivsSlug = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CHAR_MAP = {
    '&': 'and', '@': 'at', '%': 'percent', '+': 'plus'
  };

  /**
   * Cleans any arbitrary string into an SEO-friendly hyphenated slug.
   */
  function slugify(text, opts) {
    opts = opts || {};
    var max = opts.maxLength || 80;
    var str = String(text || '');

    str = str.replace(/[&@%+]/g, function (c) { return ' ' + (CHAR_MAP[c] || '') + ' '; });
    str = str.normalize ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;

    str = str.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-');

    str = str.replace(/^-+|-+$/g, '');

    if (max && str.length > max) {
      var cut = str.slice(0, max);
      var lastDash = cut.lastIndexOf('-');
      str = (lastDash > 15 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
    }

    return str || opts.fallback || 'item';
  }

  /**
   * Generates a hyphen-free slug with single spaces (e.g. "modivs-tutors-chandigarh" -> "modivs tutors chandigarh").
   */
  function titleSlug(text, opts) {
    var raw = String(text || '').replace(/\.html?$/i, '');
    raw = raw.replace(/[&@%+]/g, function (c) { return ' ' + (CHAR_MAP[c] || '') + ' '; });
    raw = raw.normalize ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : raw;
    raw = raw.toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    return raw || (opts && opts.fallback) || 'modivs';
  }

  /**
   * Generates a free (hyphen-free and space-free) slug.
   * e.g. "modivs tutors chandigarh" -> "modivstutorschandigarh"
   */
  function freeSlug(text, opts) {
    return slugify(text, opts).replace(/-/g, '');
  }

  /**
   * Generates a clean slug from page title by stripping site brand and boilerplate.
   */
  function pageTitle(title, opts) {
    var s = String(title || '')
      .replace(/\s*[-|·—]\s*Modiv(?:['’]s)?\s*Education.*$/i, '')
      .replace(/^Modiv(?:['’]s)?\s*Education\s*[-|·—]\s*/i, '')
      .replace(/Modiv(?:['’]s)?\s*Education/gi, '')
      .trim();
    return slugify(s || title, opts);
  }

  function blog(title) {
    return slugify(title, { maxLength: 85, fallback: 'blog-post' });
  }

  function tutor(t) {
    if (!t) return 'tutor';
    var parts = [];
    if (t.name) parts.push(t.name);
    var sub = Array.isArray(t.subs) ? t.subs[0] : (t.subject || '');
    if (sub) parts.push(sub);
    if (t.city && t.city.toLowerCase() !== 'all') parts.push(t.city);
    return slugify(parts.join(' '), { maxLength: 80, fallback: 'tutor' });
  }

  function lead(l) {
    if (!l) return 'tuition-lead';
    var parts = [];
    if (l.cls || l.class) parts.push('class-' + (l.cls || l.class));
    if (l.subject || l.sub) parts.push(l.subject || l.sub);
    if (l.city) parts.push(l.city);
    return slugify(parts.join(' '), { maxLength: 80, fallback: 'tuition-lead' });
  }

  /**
   * Master registry of all site pages with their file, full title, clean titleSlug without hyphens, clear slug, and free slug.
   */
  var PAGES = [
    { file: 'index.html', title: 'Modiv’s Education – Home', shortTitle: 'Home', titleSlug: 'modivs education', slug: 'home', freeSlug: 'home', aliases: ['index', 'main', 'modivs', 'modivs education home', 'home'] },
    { file: 'modivs-tutors-chandigarh.html', title: 'Home tuition near me in Chandigarh | Best Home Tutors', shortTitle: 'Tutors in Chandigarh', titleSlug: 'modivs tutors chandigarh', slug: 'tutors-in-chandigarh', freeSlug: 'tutorsinchandigarh', aliases: ['modivs tutors chandigarh', 'tutors in chandigarh', 'home tuition near me in chandigarh', 'chandigarh tutors', 'chandigarhtutors', 'home-tuition-near-me-in-chandigarh', 'chandigarh-tutors', 'hometuitionchandigarh'] },
    { file: 'modivs-tutors-mohali.html', title: 'Home tuition near me in Mohali | Best Home Tutors', shortTitle: 'Tutors in Mohali', titleSlug: 'modivs tutors mohali', slug: 'tutors-in-mohali', freeSlug: 'tutorsinmohali', aliases: ['modivs tutors mohali', 'tutors in mohali', 'home tuition near me in mohali', 'mohali tutors', 'mohalitutors', 'home-tuition-near-me-in-mohali', 'mohali-tutors', 'hometuitionmohali'] },
    { file: 'modivs-tutors-panchkula.html', title: 'Home tuition near me in Panchkula | Best Home Tutors', shortTitle: 'Tutors in Panchkula', titleSlug: 'modivs tutors panchkula', slug: 'tutors-in-panchkula', freeSlug: 'tutorsinpanchkula', aliases: ['modivs tutors panchkula', 'tutors in panchkula', 'home tuition near me in panchkula', 'panchkula tutors', 'panchkulatutors', 'home-tuition-near-me-in-panchkula', 'panchkula-tutors', 'hometuitionpanchkula'] },
    { file: 'modivs-active-leads.html', title: 'Modiv’s Education – Active Leads', shortTitle: 'Active Leads', titleSlug: 'modivs active leads', slug: 'active-leads', freeSlug: 'activeleads', aliases: ['active leads', 'leads', 'active-leads'] },
    { file: 'modivs-admin.html', title: 'Modiv’s Education – Admin', shortTitle: 'Admin', titleSlug: 'modivs admin', slug: 'admin', freeSlug: 'admin', aliases: ['admin', 'admin dashboard', 'admindashboard', 'admin-dashboard'] },
    { file: 'modivs-become-tutor.html', title: 'Become a Modivian Tutor · Teach online, at home or in groups · Modiv’s Education', shortTitle: 'Become a Tutor', titleSlug: 'modivs become tutor', slug: 'become-a-modivian-tutor', freeSlug: 'becometutor', aliases: ['become a tutor', 'become tutor', 'become-a-tutor', 'become-tutor', 'becomemodiviantutor', 'becomeatutor'] },
    { file: 'modivs-find-tutor.html', title: 'Find a Modivian Tutor · Verified home, online & group tutors · Modiv’s Education', shortTitle: 'Find a Tutor', titleSlug: 'modivs find tutor', slug: 'find-a-tutor', freeSlug: 'findtutor', aliases: ['find a tutor', 'find tutor', 'find-a-modivian-tutor', 'find-tutor', 'findatutor', 'findamodiviantutor'] },
    { file: 'modivs-tutors.html', title: 'Modiv’s Education – Meet our verified tutors', shortTitle: 'Browse Tutors', titleSlug: 'modivs tutors', slug: 'tutors', freeSlug: 'tutors', aliases: ['browse tutors', 'meet our verified tutors', 'meet-our-verified-tutors', 'browse-tutors', 'browsetutors'] },
    { file: 'modivs-blogs.html', title: 'Blogs – Modiv’s Education', shortTitle: 'Blogs', titleSlug: 'modivs blogs', slug: 'blogs', freeSlug: 'blogs', aliases: ['blogs', 'blog', 'articles'] },
    { file: 'modivs-contact.html', title: 'Modiv’s Education – Contact us', shortTitle: 'Contact Us', titleSlug: 'modivs contact', slug: 'contact-us', freeSlug: 'contactus', aliases: ['contact us', 'contact', 'support', 'help'] },
    { file: 'modivs-education.html', title: 'Modiv’s Education', shortTitle: 'Login / Portal', titleSlug: 'modivs education login', slug: 'login', freeSlug: 'login', aliases: ['login', 'signin', 'sign-in', 'portal', 'education'] },
    { file: 'modivs-shop.html', title: 'Modiv’s Education – Shop', shortTitle: 'Shop', titleSlug: 'modivs shop', slug: 'shop', freeSlug: 'shop', aliases: ['shop', 'store', 'modivs-shop', 'books'] },
    { file: 'modivs-guide.html', title: 'How to use Modiv’s Education · Student & Tutor guide', shortTitle: 'Guide', titleSlug: 'modivs guide', slug: 'guide', freeSlug: 'guide', aliases: ['guide', 'how to use', 'how-to-use', 'howtouse', 'student-tutor-guide', 'studenttutorguide'] },
    { file: 'modivs-home.html', title: 'Modiv’s Education – Home', shortTitle: 'Home (Legacy)', titleSlug: 'modivs home', slug: 'modivs-home', freeSlug: 'modivshome', aliases: ['home-page', 'home'] },
    { file: 'modivs-org-dashboard.html', title: 'Modiv’s Education – Organization dashboard', shortTitle: 'Organization Dashboard', titleSlug: 'modivs org dashboard', slug: 'org-dashboard', freeSlug: 'orgdashboard', aliases: ['organization dashboard', 'org dashboard', 'organization-dashboard', 'organizationdashboard'] },
    { file: 'modivs-post-requirement.html', title: 'Post a Requirement · Modiv’s Education', shortTitle: 'Post a Requirement', titleSlug: 'modivs post requirement', slug: 'post-requirement', freeSlug: 'postrequirement', aliases: ['post a requirement', 'post requirement', 'post-a-requirement', 'postarequirement', 'postreq'] },
    { file: 'modivs-privacy-policy.html', title: 'Privacy Policy | Modiv’s Education', shortTitle: 'Privacy Policy', titleSlug: 'modivs privacy policy', slug: 'privacy-policy', freeSlug: 'privacypolicy', aliases: ['privacy policy', 'privacy-policy', 'privacy'] },
    { file: 'modivs-refund-policy.html', title: 'Refund and Cancellation Policy | Modiv’s Education', shortTitle: 'Refund Policy', titleSlug: 'modivs refund policy', slug: 'refund-policy', freeSlug: 'refundpolicy', aliases: ['refund policy', 'refund-policy', 'refund-and-cancellation-policy', 'refundandcancellationpolicy', 'refund', 'cancellation-policy'] },
    { file: 'modivs-signup.html', title: 'Sign up · Modiv’s Education', shortTitle: 'Sign Up', titleSlug: 'modivs signup', slug: 'signup', freeSlug: 'signup', aliases: ['sign up', 'signup', 'sign-up', 'register'] },
    { file: 'modivs-sitemap.html', title: 'Sitemap | Modiv’s Education', shortTitle: 'Sitemap', titleSlug: 'modivs sitemap', slug: 'sitemap', freeSlug: 'sitemap', aliases: ['sitemap', 'site-map'] },
    { file: 'modivs-social-vision.html', title: 'Our Vision · Her knowledge. Her classroom. Her brighter future. · Modiv’s Education', shortTitle: 'Our Vision', titleSlug: 'modivs our vision', slug: 'our-vision', freeSlug: 'ourvision', aliases: ['our vision', 'social vision', 'our-vision', 'social-vision', 'our-social-vision', 'vision'] },
    { file: 'modivs-student-dashboard.html', title: 'Modiv’s Education – Student Dashboard', shortTitle: 'Student Dashboard', titleSlug: 'modivs student dashboard', slug: 'student-dashboard', freeSlug: 'studentdashboard', aliases: ['student dashboard', 'student-dashboard', 'studentdash'] },
    { file: 'modivs-student-registration.html', title: 'Modiv’s Education – Student / Parent registration', shortTitle: 'Student Registration', titleSlug: 'modivs student registration', slug: 'student-registration', freeSlug: 'studentregistration', aliases: ['student registration', 'student-registration', 'student-parent-registration', 'studentparentregistration'] },
    { file: 'modivs-student-signup.html', title: 'Book a Demo Class · Student / Parent sign up · Modiv’s Education', shortTitle: 'Book a Demo Class', titleSlug: 'modivs student signup', slug: 'student-signup', freeSlug: 'studentsignup', aliases: ['book a demo class', 'book-a-demo-class', 'bookademoclass', 'demo-class', 'democlass', 'student signup'] },
    { file: 'modivs-students-corner.html', title: 'Students’ Corner – Free Notes, Files & Quizzes – Modiv’s Education', shortTitle: 'Students’ Corner', titleSlug: 'modivs students corner', slug: 'students-corner', freeSlug: 'studentscorner', aliases: ['students corner', 'students-corner', 'free-notes-files-quizzes', 'freenotesfilesquizzes'] },
    { file: 'modivs-terms.html', title: 'Terms and Conditions | Modiv’s Education', shortTitle: 'Terms & Conditions', titleSlug: 'modivs terms', slug: 'terms', freeSlug: 'terms', aliases: ['terms', 'terms and conditions', 'terms-and-conditions', 'termsandconditions', 'terms-of-service'] },
    { file: 'modivs-tutor-dashboard.html', title: 'Modiv’s Education – Tutor dashboard', shortTitle: 'Tutor Dashboard', titleSlug: 'modivs tutor dashboard', slug: 'tutor-dashboard', freeSlug: 'tutordashboard', aliases: ['tutor dashboard', 'tutor-dashboard', 'tutordash'] },
    { file: 'modivs-tutor-edit-profile.html', title: 'Modiv’s Education – Edit tutor profile', shortTitle: 'Edit Tutor Profile', titleSlug: 'modivs tutor edit profile', slug: 'tutor-edit-profile', freeSlug: 'tutoreditprofile', aliases: ['edit tutor profile', 'edit-tutor-profile', 'edittutorprofile'] },
    { file: 'modivs-tutor-profile.html', title: 'Tutor registration · Modiv’s Education', shortTitle: 'Tutor Profile Registration', titleSlug: 'modivs tutor profile', slug: 'tutor-profile', freeSlug: 'tutorprofile', aliases: ['tutor registration', 'tutor profile', 'tutor-registration', 'tutorregistration'] },
    { file: 'modivs-user-signup.html', title: 'User Sign Up · Modiv’s Education', shortTitle: 'User Sign Up', titleSlug: 'modivs user signup', slug: 'user-signup', freeSlug: 'usersignup', aliases: ['user signup', 'user-signup', 'usersign-up'] },
    { file: 'modivs-videos.html', title: 'Modiv’s Education – From Modiv’s Education | Videos', shortTitle: 'Videos', titleSlug: 'modivs videos', slug: 'videos', freeSlug: 'videos', aliases: ['videos', 'video lectures', 'video-lectures'] }
  ];

  // Lookup index for fast resolution
  var PAGE_INDEX = {};
  PAGES.forEach(function (p) {
    var f = p.file.toLowerCase();
    PAGE_INDEX[f] = p;
    PAGE_INDEX[f.replace(/\.html$/, '')] = p;
    if (p.slug) {
      PAGE_INDEX[p.slug.toLowerCase()] = p;
      PAGE_INDEX[p.slug.toLowerCase().replace(/-/g, ' ')] = p;
    }
    if (p.freeSlug) {
      PAGE_INDEX[p.freeSlug.toLowerCase()] = p;
    }
    if (p.titleSlug) {
      PAGE_INDEX[p.titleSlug.toLowerCase()] = p;
      PAGE_INDEX[p.titleSlug.toLowerCase().replace(/\s+/g, '-')] = p;
      PAGE_INDEX[p.titleSlug.toLowerCase().replace(/\s+/g, '')] = p;
    }
    if (p.shortTitle) {
      PAGE_INDEX[p.shortTitle.toLowerCase()] = p;
      PAGE_INDEX[p.shortTitle.toLowerCase().replace(/\s+/g, '-')] = p;
    }
    if (p.aliases) {
      p.aliases.forEach(function (a) {
        var al = a.toLowerCase();
        PAGE_INDEX[al] = p;
        PAGE_INDEX[al.replace(/[-_]+/g, ' ')] = p;
        PAGE_INDEX[al.replace(/[\s-_]+/g, '')] = p;
      });
    }
  });

  /**
   * Resolves any slug, titleSlug, filename, or URL to its canonical page object.
   */
  function resolve(input) {
    if (!input) return null;
    var raw = String(input).split('?')[0].split('#')[0].trim().toLowerCase();
    var cleanKey = decodeURIComponent(raw).replace(/^\/+|\/+$/g, '');
    var baseName = cleanKey.split('/').pop() || cleanKey;
    var baseNoHtml = baseName.replace(/\.html$/, '');

    return PAGE_INDEX[cleanKey] ||
      PAGE_INDEX[cleanKey.replace(/[-_]+/g, ' ')] ||
      PAGE_INDEX[baseName] ||
      PAGE_INDEX[baseNoHtml] ||
      PAGE_INDEX[baseNoHtml.replace(/[-_]+/g, ' ')] ||
      PAGE_INDEX[baseNoHtml.replace(/[-_\s]+/g, '')] ||
      null;
  }

  function page(identifier) {
    return resolve(identifier);
  }

  /**
   * Returns clean title slug (without hyphens) or canonical slug.
   */
  function urlFor(identifier, mode) {
    var p = resolve(identifier);
    if (!p) {
      if (mode === 'title' || mode === 'clean') return '/' + encodeURI(titleSlug(identifier));
      if (mode === 'free') return '/' + freeSlug(identifier);
      return '/' + slugify(identifier);
    }
    if (mode === 'free') return '/' + p.freeSlug;
    if (mode === 'dash') return '/' + p.slug;
    return '/' + encodeURI(p.titleSlug || p.slug);
  }

  function getAllPages() {
    return PAGES.slice();
  }

  function isValid(s) {
    return typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  }

  /**
   * Automatically synchronizes the browser address bar on page load
   * so hyphens are removed and the clean title slug (e.g. "modivs tutors chandigarh") is displayed.
   */
  function autoSyncUrl() {
    if (typeof window === 'undefined' || !window.location || !window.history || !window.history.replaceState) return;
    try {
      if (window.location.protocol === 'file:') return;

      var path = window.location.pathname || '';
      var rawSeg = (path.split('/').pop() || 'index.html').trim();
      if (!rawSeg || rawSeg === '/') rawSeg = 'index.html';
      var decodedSeg = decodeURIComponent(rawSeg);
      var base = path.substring(0, path.lastIndexOf('/') + 1);

      var p = resolve(decodedSeg) || resolve(rawSeg) || resolve(path);
      var targetSlug = '';
      if (p && p.titleSlug) {
        targetSlug = p.titleSlug;
      } else {
        targetSlug = titleSlug(decodedSeg);
      }

      if (targetSlug) {
        var curDecoded = decodeURIComponent(path).replace(/^\/+/, '');
        var targetDecoded = (base + targetSlug).replace(/^\/+/, '');
        if (curDecoded !== targetDecoded && !path.endsWith('/' + targetSlug)) {
          var newUrl = base + encodeURI(targetSlug) + (window.location.search || '') + (window.location.hash || '');
          window.history.replaceState(null, document.title || (p && p.title) || '', newUrl);
        }
      }
    } catch (e) {
      // safe fallback
    }
  }

  // Auto-run URL cleanup as soon as loaded and on DOMContentLoaded
  autoSyncUrl();
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoSyncUrl);
  }

  return {
    slugify: slugify,
    create: slugify,
    clean: titleSlug,
    clear: titleSlug,
    titleSlug: titleSlug,
    spaceSlug: titleSlug,
    free: freeSlug,
    freeSlug: freeSlug,
    hyphenFree: freeSlug,
    pageTitle: pageTitle,
    blog: blog,
    tutor: tutor,
    lead: lead,
    PAGES: PAGES,
    getAllPages: getAllPages,
    page: page,
    resolve: resolve,
    urlFor: urlFor,
    isValid: isValid,
    autoSyncUrl: autoSyncUrl
  };
});
