/* Modiv's Education - Auto Clean SEO-Friendly Slug Utility
   Generates clean, human-readable, URL-safe slugs for blogs, tutor profiles, leads & pages.
   Provides free (hyphen-free) and clear (clean) slugs of all pages according to their title.
   Works in browser (window.ModivsSlug) and Node.js (CommonJS). */
(function(root, factory){
  if(typeof module === 'object' && module.exports){ module.exports = factory(); }
  else { root.ModivsSlug = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  var CHAR_MAP = {
    '&': 'and', '@': 'at', '%': 'percent', '+': 'plus'
  };

  /**
   * Cleans any arbitrary string into an SEO-friendly slug.
   * Handles accents (Unicode NFD), punctuation removal, whitespace deduplication,
   * hyphen trimming, and clean word-boundary truncation.
   */
  function slugify(text, opts){
    opts = opts || {};
    var max = opts.maxLength || 80;
    var str = String(text || '');

    // Symbol expansions
    str = str.replace(/[&@%+]/g, function(c){ return ' ' + (CHAR_MAP[c] || '') + ' '; });

    // Normalize unicode accents: é -> e, ñ -> n, etc.
    str = str.normalize ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;

    // Convert to lower case, replace non-alphanumeric with hyphens
    str = str.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-');

    // Trim leading and trailing hyphens
    str = str.replace(/^-+|-+$/g, '');

    // Truncate at word boundary if exceeding max length
    if(max && str.length > max){
      var cut = str.slice(0, max);
      var lastDash = cut.lastIndexOf('-');
      str = (lastDash > 15 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
    }

    return str || opts.fallback || 'item';
  }

  /**
   * Generates a free (hyphen-free) clean slug.
   * e.g. "Find a Tutor" -> "findatutor"
   */
  function freeSlug(text, opts){
    return slugify(text, opts).replace(/-/g, '');
  }

  /**
   * Generates a clean slug from page title by stripping site brand and boilerplate.
   */
  function pageTitle(title, opts){
    var s = String(title || '')
      .replace(/\s*[-|·—]\s*Modiv(?:['’]s)?\s*Education.*$/i, '')
      .replace(/^Modiv(?:['’]s)?\s*Education\s*[-|·—]\s*/i, '')
      .replace(/Modiv(?:['’]s)?\s*Education/gi, '')
      .trim();
    return slugify(s || title, opts);
  }

  /**
   * Generates a clean blog slug from title.
   * e.g. "10 Tips for CBSE Board Exams!" -> "10-tips-for-cbse-board-exams"
   */
  function blog(title){
    return slugify(title, { maxLength: 85, fallback: 'blog-post' });
  }

  /**
   * Generates a clean tutor SEO slug: name + primary subject + city
   * e.g. Name: "Dr. Priya Verma", Subject: "Physics", City: "Chandigarh"
   * -> "dr-priya-verma-physics-chandigarh"
   */
  function tutor(t){
    if(!t) return 'tutor';
    var parts = [];
    if(t.name) parts.push(t.name);
    var sub = Array.isArray(t.subs) ? t.subs[0] : (t.subject || '');
    if(sub) parts.push(sub);
    if(t.city && t.city.toLowerCase() !== 'all') parts.push(t.city);
    return slugify(parts.join(' '), { maxLength: 80, fallback: 'tutor' });
  }

  /**
   * Generates a clean tuition lead slug: class/subject/city
   * e.g. "Class 10 CBSE Maths Tuition in Mohali"
   */
  function lead(l){
    if(!l) return 'tuition-lead';
    var parts = [];
    if(l.cls || l.class) parts.push('class-' + (l.cls || l.class));
    if(l.subject || l.sub) parts.push(l.subject || l.sub);
    if(l.city) parts.push(l.city);
    return slugify(parts.join(' ') || l.title || 'tuition-lead', { maxLength: 80, fallback: 'tuition-lead' });
  }

  /**
   * Master registry of all site pages with their file, full title, clear slug, and free slug.
   */
  var PAGES = [
    { file: 'index.html', title: 'Modiv’s Education – Home', shortTitle: 'Home', slug: 'home', freeSlug: 'home', aliases: ['index', 'main'] },
    { file: 'modivs-active-leads.html', title: 'Modiv’s Education – Active Leads', shortTitle: 'Active Leads', slug: 'active-leads', freeSlug: 'activeleads', aliases: ['leads'] },
    { file: 'modivs-admin.html', title: 'Modiv’s Education – Admin', shortTitle: 'Admin', slug: 'admin', freeSlug: 'admin', aliases: ['admindashboard', 'admin-dashboard'] },
    { file: 'modivs-become-tutor.html', title: 'Become a Modivian Tutor · Teach online, at home or in groups · Modiv’s Education', shortTitle: 'Become a Tutor', slug: 'become-tutor', freeSlug: 'becometutor', aliases: ['become-a-modivian-tutor', 'become-a-tutor', 'teach', 'becomemodiviantutor', 'becomeatutor'] },
    { file: 'modivs-social-vision.html', title: 'Social Vision · Free & Subsidised Education · Modiv’s Education', shortTitle: 'Our Vision', slug: 'our-vision', freeSlug: 'ourvision', aliases: ['social-vision', 'vision', 'socialvision', 'our-social-vision'] },
    { file: 'modivs-tuition.html', title: 'Tuition · Home, Online & Group Tuition · Modiv’s Education', shortTitle: 'Tuition', slug: 'tuition', freeSlug: 'tuition', aliases: ['tuitions'] },
    { file: 'modivs-blogs.html', title: 'Modiv’s Education – Blogs & Articles', shortTitle: 'Blogs', slug: 'blogs', freeSlug: 'blogs', aliases: ['blog', 'articles'] },
    { file: 'modivs-contact.html', title: 'Contact Us | Modiv’s Education', shortTitle: 'Contact Us', slug: 'contact', freeSlug: 'contact', aliases: ['contact-us', 'contactus', 'support', 'help'] },
    { file: 'modivs-demo.html', title: 'Book a Demo Class · Modiv’s Education', shortTitle: 'Book a Demo', slug: 'demo', freeSlug: 'demo', aliases: ['book-demo'] },
    { file: 'modivs-education.html', title: 'Modiv’s Education – Login & Portal', shortTitle: 'Login & Portal', slug: 'login', freeSlug: 'login', aliases: ['education', 'signin', 'sign-in', 'portal'] },
    { file: 'modivs-find-tutor.html', title: 'Find a Modivian Tutor · Personalized Home & Online Tutoring', shortTitle: 'Find a Tutor', slug: 'find-tutor', freeSlug: 'findtutor', aliases: ['find', 'find-a-tutor', 'findatutor', 'find-a-modivian-tutor', 'findamodiviantutor'] },
    { file: 'modivs-guide.html', title: 'How to use Modiv’s Education – Student, Parent & Tutor Guide', shortTitle: 'Guide', slug: 'guide', freeSlug: 'guide', aliases: ['how-to-use', 'howtouse', 'student-tutor-guide', 'studenttutorguide'] },
    { file: 'modivs-home.html', title: 'Modiv’s Education – Home Page', shortTitle: 'Home Page', slug: 'home-page', freeSlug: 'homepage', aliases: ['modivs-home'] },
    { file: 'modivs-notes.html', title: 'Free Notes & Study Files · Modiv’s Education', shortTitle: 'Free Notes', slug: 'notes', freeSlug: 'notes', aliases: ['free-notes', 'study-notes'] },
    { file: 'modivs-org-dashboard.html', title: 'Organization Dashboard · Modiv’s Education', shortTitle: 'Organization Dashboard', slug: 'org-dashboard', freeSlug: 'orgdashboard', aliases: ['organization-dashboard', 'organizationdashboard'] },
    { file: 'modivs-parent-dashboard.html', title: 'Parent Dashboard · Modiv’s Education', shortTitle: 'Parent Dashboard', slug: 'parent-dashboard', freeSlug: 'parentdashboard', aliases: ['parentdash'] },
    { file: 'modivs-parent-registration.html', title: 'Parent Registration · Modiv’s Education', shortTitle: 'Parent Registration', slug: 'parent-registration', freeSlug: 'parentregistration', aliases: ['parent-reg'] },
    { file: 'modivs-parent-signup.html', title: 'Parent Sign Up · Modiv’s Education', shortTitle: 'Parent Sign Up', slug: 'parent-signup', freeSlug: 'parentsignup', aliases: ['parentsign-up'] },
    { file: 'modivs-post-requirement.html', title: 'Post a Tuition Requirement | Modiv’s Education', shortTitle: 'Post a Requirement', slug: 'post-requirement', freeSlug: 'postrequirement', aliases: ['post', 'post-a-requirement', 'postarequirement', 'postreq'] },
    { file: 'modivs-privacy-policy.html', title: 'Privacy Policy | Modiv’s Education', shortTitle: 'Privacy Policy', slug: 'privacy', freeSlug: 'privacy', aliases: ['privacy-policy', 'privacypolicy'] },
    { file: 'modivs-refund-policy.html', title: 'Refund and Cancellation Policy | Modiv’s Education', shortTitle: 'Refund Policy', slug: 'refunds', freeSlug: 'refunds', aliases: ['refund-policy', 'refundpolicy', 'refund-and-cancellation-policy', 'refundandcancellationpolicy', 'refund', 'cancellation-policy'] },
    { file: 'modivs-shop.html', title: 'Modiv’s Education – Shop', shortTitle: 'Shop', slug: 'shop', freeSlug: 'shop', aliases: ['store', 'modivs-shop', 'books'] },
    { file: 'modivs-signup.html', title: 'Sign up · Modiv’s Education', shortTitle: 'Sign Up', slug: 'signup', freeSlug: 'signup', aliases: ['sign-up', 'register'] },
    { file: 'modivs-sitemap.html', title: 'Sitemap | Modiv’s Education', shortTitle: 'Sitemap', slug: 'sitemap', freeSlug: 'sitemap', aliases: ['site-map'] },
    { file: 'modivs-student-dashboard.html', title: 'Modiv’s Education – Student Dashboard', shortTitle: 'Student Dashboard', slug: 'student-dashboard', freeSlug: 'studentdashboard', aliases: ['studentdash'] },
    { file: 'modivs-student-registration.html', title: 'Modiv’s Education – Student / Parent registration', shortTitle: 'Student Registration', slug: 'student-registration', freeSlug: 'studentregistration', aliases: ['student-parent-registration', 'studentparentregistration'] },
    { file: 'modivs-student-signup.html', title: 'Book a Demo Class · Student / Parent sign up · Modiv’s Education', shortTitle: 'Book a Demo Class', slug: 'student-signup', freeSlug: 'studentsignup', aliases: ['book-a-demo-class', 'bookademoclass', 'demo-class', 'democlass'] },
    { file: 'modivs-students-corner.html', title: 'Students’ Corner – Free Notes, Files & Quizzes – Modiv’s Education', shortTitle: 'Students’ Corner', slug: 'students-corner', freeSlug: 'studentscorner', aliases: ['free-notes-files-quizzes', 'freenotesfilesquizzes'] },
    { file: 'modivs-terms.html', title: 'Terms and Conditions | Modiv’s Education', shortTitle: 'Terms & Conditions', slug: 'terms', freeSlug: 'terms', aliases: ['terms-and-conditions', 'termsandconditions', 'terms-of-service'] },
    { file: 'modivs-tutor-dashboard.html', title: 'Modiv’s Education – Tutor dashboard', shortTitle: 'Tutor Dashboard', slug: 'tutor-dashboard', freeSlug: 'tutordashboard', aliases: ['tutordash'] },
    { file: 'modivs-tutor-edit-profile.html', title: 'Modiv’s Education – Edit tutor profile', shortTitle: 'Edit Tutor Profile', slug: 'tutor-edit-profile', freeSlug: 'tutoreditprofile', aliases: ['edit-tutor-profile', 'edittutorprofile'] },
    { file: 'modivs-tutor-profile.html', title: 'Tutor registration · Modiv’s Education', shortTitle: 'Tutor Profile Registration', slug: 'tutor-profile', freeSlug: 'tutorprofile', aliases: ['tutor-registration', 'tutorregistration'] },
    { file: 'modivs-tutors-chandigarh.html', title: 'Home tuition near me in Chandigarh | Best Home Tutors', shortTitle: 'Tutors in Chandigarh', slug: 'chandigarh', freeSlug: 'chandigarh', aliases: ['tutors-in-chandigarh', 'tutorsinchandigarh', 'chandigarh-tutors', 'chandigarhtutors', 'home-tuition-near-me-in-chandigarh', 'hometuitionchandigarh'] },
    { file: 'modivs-tutors-mohali.html', title: 'Home tuition near me in Mohali | Best Home Tutors', shortTitle: 'Tutors in Mohali', slug: 'mohali', freeSlug: 'mohali', aliases: ['tutors-in-mohali', 'tutorsinmohali', 'mohali-tutors', 'mohalitutors', 'home-tuition-near-me-in-mohali', 'hometuitionmohali'] },
    { file: 'modivs-tutors-panchkula.html', title: 'Home tuition near me in Panchkula | Best Home Tutors', shortTitle: 'Tutors in Panchkula', slug: 'panchkula', freeSlug: 'panchkula', aliases: ['tutors-in-panchkula', 'tutorsinpanchkula', 'panchkula-tutors', 'panchkulatutors', 'home-tuition-near-me-in-panchkula', 'hometuitionpanchkula'] },
    { file: 'modivs-tutors.html', title: 'Modiv’s Education – Meet our verified tutors', shortTitle: 'Browse Tutors', slug: 'tutors', freeSlug: 'tutors', aliases: ['browse-tutors', 'browsetutors', 'meet-our-verified-tutors', 'tutor'] },
    { file: 'modivs-user-signup.html', title: 'User Sign Up · Modiv’s Education', shortTitle: 'User Sign Up', slug: 'user-signup', freeSlug: 'usersignup', aliases: ['usersign-up'] },
    { file: 'modivs-videos.html', title: 'Modiv’s Education – From Modiv’s Education | Videos', shortTitle: 'Videos', slug: 'videos', freeSlug: 'videos', aliases: ['video-lectures'] }
  ];

  // Lookup index for fast resolution
  var PAGE_INDEX = {};
  PAGES.forEach(function(p){
    PAGE_INDEX[p.file.toLowerCase()] = p;
    PAGE_INDEX[p.file.toLowerCase().replace(/\.html$/, '')] = p;
    PAGE_INDEX[p.slug.toLowerCase()] = p;
    PAGE_INDEX[p.freeSlug.toLowerCase()] = p;
    if(p.aliases){
      p.aliases.forEach(function(a){ PAGE_INDEX[a.toLowerCase()] = p; });
    }
  });

  /**
   * Resolves any slug, free-slug, filename or URL to its canonical page object.
   */
  function resolve(input){
    if(!input) return null;
    var raw = String(input).split('?')[0].split('#')[0].trim().toLowerCase();
    var cleanKey = raw.replace(/^\/+|\/+$/g, '');
    var baseName = cleanKey.split('/').pop() || cleanKey;
    return PAGE_INDEX[cleanKey] || PAGE_INDEX[baseName] || PAGE_INDEX[baseName.replace(/\.html$/, '')] || null;
  }

  /**
   * Looks up page info by file, title, or slug.
   */
  function page(identifier){
    return resolve(identifier);
  }

  /**
   * Returns clean or free URL slug for a given page identifier.
   */
  function urlFor(identifier, isFree){
    var p = resolve(identifier);
    if(!p) return '/' + (isFree ? freeSlug(identifier) : slugify(identifier));
    return '/' + (isFree ? p.freeSlug : p.slug);
  }

  function getAllPages(){
    return PAGES.slice();
  }

  /**
   * Validates if a string is already a clean slug format (lowercase alphanumeric and hyphens).
   */
  function isValid(s){
    return typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  }

  /**
   * Synchronizes meta tags (canonical link and og:url) with the clean slug URL.
   */
  function syncMetaUrls(cleanPath){
    try {
      if(typeof document === 'undefined') return;
      var origin = (window.location && window.location.origin) ? window.location.origin : 'https://www.modivians.com';
      var canonicalUrl = origin + (cleanPath === '/' ? '' : cleanPath);
      var can = document.querySelector('link[rel="canonical"]');
      if(can){
        can.setAttribute('href', canonicalUrl);
      } else {
        can = document.createElement('link');
        can.setAttribute('rel', 'canonical');
        can.setAttribute('href', canonicalUrl);
        document.head.appendChild(can);
      }
      var og = document.querySelector('meta[property="og:url"]');
      if(og){
        og.setAttribute('content', canonicalUrl);
      }
    } catch(e){}
  }

  /**
   * Automatically updates browser address bar to the clean slug if on a modiv-prefixed or .html page,
   * without reloading or causing flicker. Preserves search params & hash.
   */
  function autoSyncUrl(){
    if(typeof window === 'undefined' || !window.location || !window.history || !window.history.replaceState) return;
    try {
      if(window.location.protocol === 'file:') return;
      var path = window.location.pathname || '';
      var cleanKey = path.replace(/^\/+|\/+$/g, '').toLowerCase();
      var file = (path.split('/').pop() || 'index.html').toLowerCase();
      var p = resolve(cleanKey) || resolve(file);
      if(!p && (cleanKey.indexOf('modiv') !== -1 || cleanKey.endsWith('.html') || cleanKey.endsWith('.htm'))){
        var fallback = cleanKey.replace(/^modivs?-?/i, '').replace(/\.html?$/i, '');
        if(fallback) p = resolve(fallback) || { slug: fallback };
      }
      if(p && p.slug){
        var targetSlug = (p.slug === 'home' || p.file === 'index.html' || p.slug === '') ? '' : p.slug;
        var newPath = targetSlug ? ('/' + targetSlug) : '/';
        if(path !== newPath && path !== (newPath + '/') && path !== (newPath.replace(/\/$/, '') || '/')){
          var newUrl = newPath + (window.location.search || '') + (window.location.hash || '');
          window.history.replaceState(null, document.title || p.title || '', newUrl);
        }
        syncMetaUrls(newPath);
      }
    } catch(e){}
  }

  /**
   * Rewrites internal <a href="*.html"> links on the page to clean slugs,
   * so user hovers and clicks always see clean, pretty URLs.
   */
  function cleanLinks(rootEl){
    if(typeof document === 'undefined') return;
    var scope = rootEl || document;
    try {
      var links = scope.querySelectorAll('a[href]');
      for(var i = 0; i < links.length; i++){
        var a = links[i];
        var href = a.getAttribute('href');
        if(!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) continue;
        
        var parts = href.split('#');
        var baseWithQuery = parts[0];
        var hash = parts.length > 1 ? '#' + parts[1] : '';
        
        var qParts = baseWithQuery.split('?');
        var pathPart = qParts[0];
        var query = qParts.length > 1 ? '?' + qParts[1] : '';
        
        if(!pathPart.endsWith('.html') && !pathPart.endsWith('.htm') && pathPart.indexOf('modiv') === -1) continue;
        var targetPage = resolve(pathPart);
        if(!targetPage && pathPart.indexOf('modiv') !== -1){
          var stripped = pathPart.replace(/^\/+/, '').replace(/^modivs?-?/i, '').replace(/\.html?$/i, '');
          targetPage = resolve(stripped);
        }
        if(targetPage && targetPage.slug){
          var newSlug = (targetPage.slug === 'home' || targetPage.file === 'index.html' || targetPage.slug === '') ? '' : targetPage.slug;
          a.setAttribute('href', (newSlug ? ('/' + newSlug) : '/') + query + hash);
        }
      }
    } catch(e){}
  }

  // Auto-run immediately and when DOM is ready
  if(typeof window !== 'undefined'){
    autoSyncUrl();
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){
        autoSyncUrl();
        cleanLinks();
      });
    } else {
      cleanLinks();
    }
  }

  return {
    slugify: slugify,
    create: slugify,
    clean: slugify,
    clear: slugify,
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
    autoSyncUrl: autoSyncUrl,
    cleanLinks: cleanLinks
  };
});
