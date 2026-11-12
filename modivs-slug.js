/* Modiv's Education - Auto Clean SEO-Friendly Slug Utility
   Generates clean, human-readable, URL-safe slugs for blogs, tutor profiles, leads & pages.
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
   * Validates if a string is already a clean slug format (lowercase alphanumeric and hyphens).
   */
  function isValid(s){
    return typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  }

  return {
    slugify: slugify,
    create: slugify,
    clean: slugify,
    blog: blog,
    tutor: tutor,
    lead: lead,
    isValid: isValid
  };
});

