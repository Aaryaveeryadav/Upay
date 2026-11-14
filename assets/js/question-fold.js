/* Data-only literature exercise folding shared by the browser and the curation builder.
   Only explicit exercise/question fields are folded; rich section text and passages
   remain passages and are never reinterpreted as standalone questions. */
(function (root) {
  'use strict';

  function splitExerciseQs(raw) {
    if (!raw) return [];
    const parts = String(raw).split(/\s*(?:^|\n)\s*(?:\d+|[१२३४५६७८९०]+)\s*[\.\)\u0964]\s+/);
    const out = parts.map(part => part.trim()).filter(text => text.length > 4)
      .map(text => text.replace(/\s+/g, ' ').slice(0, 300));
    if (!out.length) {
      const text = String(raw).trim();
      if (text.length > 4) out.push(text.slice(0, 300));
    }
    return out;
  }

  function foldLiteratureQuestions(UP) {
    if (!UP || typeof UP !== 'object') return [];
    const bank = UP.pyq || (UP.pyq = []);
    const ids = new Set(bank.filter(q => q && q.id).map(q => String(q.id)));
    const created = [];

    function push(q) {
      if (!q || !q.id || ids.has(String(q.id))) return;
      bank.push(q);
      ids.add(String(q.id));
      created.push(String(q.id));
    }

    function foldEnglish(list) {
      (list || []).forEach((ch, idx) => {
        if (!ch || !Array.isArray(ch.exercises)) return;
        ch.exercises.forEach(raw => splitExerciseQs(raw).forEach((text, qi) => {
          if (text.length < 8) return;
          push({
            id: 'eng10-' + (ch.id || ch.bookCode || idx) + '-q' + (qi + 1),
            cls: 10, subject: 'english', board: 'cbse',
            ch: ch.id || ('eng-' + idx), m: 2, kind: 'saq', d: 2, lv: 'Standard',
            en: text, hi: '', ans: '', opts: null,
            src: (ch.book || 'First Flight') + ' · ' + (ch.en || ch.title || '')
          });
        }));
      });
    }

    function chapterText(ch) { return ch && (ch.en || ch.hi || ''); }

    function foldChapterLists(list, subject, prefix) {
      (list || []).forEach((ch, idx) => {
        if (!ch) return;
        const exercises = Array.isArray(ch.exercises) ? ch.exercises
          : (Array.isArray(ch.questions) ? ch.questions : []);
        exercises.forEach(raw => {
          if (typeof raw !== 'string') return;
          splitExerciseQs(raw).forEach((text, qi) => {
            if (text.length < 6) return;
            push({
              id: prefix + (ch.id || idx) + '-q' + (qi + 1),
              cls: 10, subject, board: 'cbse',
              ch: ch.id || (subject === 'hindi' ? 'hnd-' : 'san-') + idx,
              m: 2, kind: 'saq', d: 2, lv: 'Standard',
              en: '', hi: text, sa: '', ans: '', opts: null, src: chapterText(ch)
            });
          });
        });
      });
    }

    /* Hindi rich chapters keep exact exercise strings under richGroups[].questions.
       Do not traverse richSections: those are passages, not exam prompts. */
    function foldRichGroups(list, subject) {
      (list || []).forEach((ch, idx) => {
        if (!ch || !Array.isArray(ch.richGroups)) return;
        const idPart = String(ch.id || idx).replace(/^(?:hind10|san10)-/, '');
        ch.richGroups.forEach((group, gi) => {
          const questions = group && Array.isArray(group.questions) ? group.questions : [];
          questions.forEach((raw, ri) => {
            if (typeof raw !== 'string') return;
            splitExerciseQs(raw).forEach((text, pi) => {
              if (text.length < 6) return;
              const qid = (subject === 'hindi' ? 'hind10' : 'san10') + '-rich-' + idPart
                + '-g' + (gi + 1) + '-q' + (ri + 1) + '-' + (pi + 1);
              push({
                id: qid, cls: 10, subject, board: 'cbse',
                ch: ch.id || (subject === 'hindi' ? 'hnd-' : 'san-') + idx,
                m: 2, kind: 'saq', d: 2, lv: 'Standard',
                en: '', hi: subject === 'sanskrit' ? '' : text,
                sa: subject === 'sanskrit' ? text : '', ans: '', opts: null, src: chapterText(ch)
              });
            });
          });
        });
      });
    }

    foldEnglish(UP.english10);
    foldChapterLists(UP.hindi10Chapters, 'hindi', 'hind10-');
    foldChapterLists(UP.sanskrit10Chapters, 'sanskrit', 'san10-');
    foldRichGroups(UP.hindi10Chapters, 'hindi');
    foldRichGroups(UP.sanskrit10Chapters, 'sanskrit');
    return created;
  }

  const api = { splitExerciseQs, foldLiteratureQuestions };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UP = root.UP || {};
  root.UP.questionFold = api;
})(typeof window === 'undefined' ? globalThis : window);
