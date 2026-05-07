import {
    getFirestore, collection, addDoc, getDocs, doc, deleteDoc,
    query, orderBy, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* Wait for window._kolaDB which is set by the main Firebase block above */
function waitForDB(cb, tries = 0) {
    if (window._kolaDB) return cb(window._kolaDB);
    if (tries > 60) return console.warn('[Quiz] Firebase DB timeout');
    setTimeout(() => waitForDB(cb, tries + 1), 200);
}

/* ══════════════════════════════════════════
   ADMIN: correct-answer toggle
══════════════════════════════════════════ */
let _aqCorrect = null;

window.toggleCorrect = function(idx) {
    _aqCorrect = idx;
    for (let i = 0; i < 4; i++) {
        const btn = document.getElementById('aq-ct-' + i);
        if (btn) btn.classList.toggle('selected', i === idx);
    }
};

/* ══════════════════════════════════════════
   ADMIN: Save question to Firestore
══════════════════════════════════════════ */
window.adminSaveQuestion = function() {
    waitForDB(async (db) => {
        const subject  = (document.getElementById('aq-subject')?.value || '').trim();
        const question = (document.getElementById('aq-question')?.value || '').trim();
        const opts     = [0,1,2,3].map(i => (document.getElementById('aq-opt-'+i)?.value || '').trim());
        const diff     = document.getElementById('aq-difficulty')?.value || 'Medium';
        const expl     = (document.getElementById('aq-explanation')?.value || '').trim();
        const msgEl    = document.getElementById('aq-msg');

        const showMsg = (t, ok) => {
            if (!msgEl) return;
            msgEl.textContent = t;
            msgEl.className = `text-center text-xs font-bold py-2 rounded-xl ${ok ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`;
            msgEl.classList.remove('hidden');
            setTimeout(() => msgEl.classList.add('hidden'), 3500);
        };

        if (!subject)                    return showMsg('⚠️ Please enter a Subject / Quiz Set name.', false);
        if (!question)                   return showMsg('⚠️ Please enter the question text.', false);
        if (opts.some(o => !o))          return showMsg('⚠️ Please fill in all 4 options.', false);
        if (_aqCorrect === null)         return showMsg('⚠️ Please mark the correct answer (click ✓).', false);

        try {
            await addDoc(collection(db, 'quizQuestions'), {
                subject, question, options: opts,
                correct: _aqCorrect, difficulty: diff,
                explanation: expl, createdAt: serverTimestamp()
            });
            showMsg('✅ Question saved successfully!', true);
            // Clear form
            ['aq-subject','aq-question','aq-explanation'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            [0,1,2,3].forEach(i => {
                const el = document.getElementById('aq-opt-'+i);
                if (el) el.value = '';
                document.getElementById('aq-ct-'+i)?.classList.remove('selected');
            });
            _aqCorrect = null;
            loadAdminQuestions();
        } catch(e) { showMsg('Error: ' + e.message, false); }
    });
};

/* ══════════════════════════════════════════
   ADMIN: Load & render question list
══════════════════════════════════════════ */
let _allAdminQs = [];

window.loadAdminQuestions = function() {
    waitForDB(async (db) => {
        const listEl = document.getElementById('admin-questions-list');
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-gray-600 text-xs text-center py-6 italic">Loading…</p>';
        try {
            const snap = await getDocs(query(collection(db, 'quizQuestions'), orderBy('createdAt','desc')));
            _allAdminQs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderAdminQuestions(_allAdminQs);
        } catch(e) {
            listEl.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error: ${e.message}</p>`;
        }
    });
};

function renderAdminQuestions(list) {
    const listEl = document.getElementById('admin-questions-list');
    if (!listEl) return;
    if (!list.length) {
        listEl.innerHTML = '<p class="text-gray-600 text-xs text-center py-6 italic">No questions yet. Add one above!</p>';
        return;
    }
    const LABELS = ['A','B','C','D'];
    const DC = { Easy:'text-emerald-400', Medium:'text-yellow-400', Hard:'text-red-400' };
    listEl.innerHTML = list.map((q, i) => `
        <div class="admin-q-card">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="quiz-num mt-0.5">${i+1}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="quiz-tag">${q.subject||'General'}</span>
                            <span class="text-[10px] font-bold ${DC[q.difficulty]||'text-gray-400'}">${q.difficulty||'Medium'}</span>
                        </div>
                        <p class="text-white text-sm font-bold mb-2 leading-relaxed">${q.question}</p>
                        <div class="grid grid-cols-2 gap-1">
                            ${(q.options||[]).map((opt,oi) => `
                                <div class="text-[11px] flex items-center gap-1.5 ${oi===q.correct?'text-emerald-400 font-bold':'text-gray-500'}">
                                    <span class="w-4 h-4 rounded-md inline-flex items-center justify-center text-[9px] font-black flex-shrink-0 ${oi===q.correct?'bg-emerald-500/20':'bg-white/5'}">${LABELS[oi]}</span>
                                    ${opt}${oi===q.correct?' ✓':''}
                                </div>`).join('')}
                        </div>
                        ${q.explanation?`<p class="text-gray-600 text-[10px] mt-2 italic">💡 ${q.explanation}</p>`:''}
                    </div>
                </div>
                <button onclick="adminDeleteQuestion('${q.id}')" class="text-red-500/60 hover:text-red-400 transition-all text-xs bg-red-500/5 border border-red-500/10 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`).join('');
}

window.filterAdminQuestions = function() {
    const q = (document.getElementById('admin-q-search')?.value||'').toLowerCase();
    renderAdminQuestions(_allAdminQs.filter(item =>
        (item.question||'').toLowerCase().includes(q) ||
        (item.subject||'').toLowerCase().includes(q)
    ));
};

window.adminDeleteQuestion = function(id) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    waitForDB(async (db) => {
        try {
            await deleteDoc(doc(db, 'quizQuestions', id));
            loadAdminQuestions();
        } catch(e) { alert('Delete failed: ' + e.message); }
    });
};

/* ══════════════════════════════════════════
   USER QUIZ: state object
══════════════════════════════════════════ */
let _quiz = {
    questions:[], current:0, score:0, wrong:0,
    answered:false, subject:'',
    startTime:0, elapsed:0, timerInterval:null, totalTime:0, review:[]
};

/* ══════════════════════════════════════════
   USER QUIZ: Load quiz sets (grouped by subject)
══════════════════════════════════════════ */
window.loadQuizSets = function() {
    waitForDB(async (db) => {
        const listEl = document.getElementById('quiz-sets-list');
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-gray-600 text-xs text-center py-8 italic">Loading…</p>';
        try {
            const snap = await getDocs(collection(db, 'quizQuestions'));
            const all  = snap.docs.map(d => ({ id:d.id, ...d.data() }));

            if (!all.length) {
                listEl.innerHTML = '<p class="text-gray-500 text-xs text-center py-8">No quizzes available yet.<br>Ask your admin to add questions!</p>';
                return;
            }

            // Group by subject
            const sets = {};
            all.forEach(q => {
                const s = q.subject || 'General';
                if (!sets[s]) sets[s] = [];
                sets[s].push(q);
            });

            listEl.innerHTML = Object.entries(sets).map(([subject, qs]) => {
                const hard = qs.filter(q=>q.difficulty==='Hard').length;
                const easy = qs.filter(q=>q.difficulty==='Easy').length;
                const badge = hard > qs.length/2 ? '🔴 Hard' : easy > qs.length/2 ? '🟢 Easy' : '🟡 Medium';
                const safeSubj = subject.replace(/'/g,"\\'");
                return `
                <div class="card-hover glass-ui p-5 rounded-2xl cursor-pointer" onclick="startQuiz('${safeSubj}')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style="background:rgba(153,50,201,0.15);border:1px solid rgba(153,50,201,0.3);">🧠</div>
                            <div>
                                <p class="text-white font-black text-sm">${subject}</p>
                                <p class="text-gray-500 text-[11px] mt-0.5">${qs.length} question${qs.length!==1?'s':''} &nbsp;·&nbsp; ${badge}</p>
                            </div>
                        </div>
                        <div class="text-[#9932C9] text-sm"><i class="fa-solid fa-play"></i></div>
                    </div>
                </div>`;
            }).join('');

            loadQuizHistory();
        } catch(e) {
            listEl.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error: ${e.message}</p>`;
        }
    });
};

/* Load past quiz results for this user */
async function loadQuizHistory() {
    const session = JSON.parse(localStorage.getItem('kolaSession')||'{}');
    if (!session.email) return;
    waitForDB(async (db) => {
        try {
            const snap = await getDocs(query(
                collection(db,'quizResults'),
                where('userEmail','==',session.email),
                orderBy('takenAt','desc')
            ));
            const results = snap.docs.map(d=>d.data()).slice(0,5);
            const wrap  = document.getElementById('quiz-history-wrap');
            const listEl= document.getElementById('quiz-history-list');
            if (!results.length || !wrap || !listEl) return;
            wrap.style.display = 'block';
            listEl.innerHTML = results.map(r => {
                const pct   = Math.round((r.score/r.total)*100);
                const color = pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444';
                const date  = r.takenAt?.toDate?r.takenAt.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'';
                return `
                <div class="quiz-hist-card flex items-center justify-between">
                    <div>
                        <p class="text-white font-bold text-sm">${r.subject}</p>
                        <p class="text-gray-600 text-[10px] mt-0.5">${date} · ${r.total} Qs · ${r.timeTaken}s</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-black orbitron" style="color:${color}">${pct}%</p>
                        <p class="text-gray-600 text-[10px]">${r.score}/${r.total} correct</p>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { /* history is optional, silently skip */ }
    });
}

/* ══════════════════════════════════════════
   USER QUIZ: Start quiz for a subject
══════════════════════════════════════════ */
window.startQuiz = function(subject) {
    waitForDB(async (db) => {
        try {
            const snap = await getDocs(query(collection(db,'quizQuestions'), where('subject','==',subject)));
            let qs = snap.docs.map(d=>({id:d.id,...d.data()}));
            qs = qs.sort(()=>Math.random()-0.5);  // shuffle

            clearInterval(_quiz.timerInterval);
            _quiz = {
                questions:qs, current:0, score:0, wrong:0,
                answered:false, subject,
                startTime:Date.now(), elapsed:0,
                timerInterval:null, totalTime:0, review:[]
            };

            _quiz.timerInterval = setInterval(()=>{
                _quiz.elapsed = Math.floor((Date.now()-_quiz.startTime)/1000);
                const m = String(Math.floor(_quiz.elapsed/60)).padStart(2,'0');
                const s = String(_quiz.elapsed%60).padStart(2,'0');
                const el = document.getElementById('quiz-timer');
                if (el) el.textContent = `${m}:${s}`;
            }, 1000);

            document.getElementById('quiz-set-selector').style.display = 'none';
            document.getElementById('quiz-active').style.display      = 'block';
            document.getElementById('quiz-results').style.display     = 'none';
            renderCurrentQuestion();
        } catch(e) { alert('Error loading quiz: '+e.message); }
    });
};

/* Render current question */
function renderCurrentQuestion() {
    const q     = _quiz.questions[_quiz.current];
    const total = _quiz.questions.length;
    const LABS  = ['A','B','C','D'];

    document.getElementById('quiz-set-title').textContent   = _quiz.subject;
    document.getElementById('quiz-q-counter').textContent   = `Q ${_quiz.current+1} / ${total}`;
    document.getElementById('quiz-prog-fill').style.width   = `${(_quiz.current/total)*100}%`;
    document.getElementById('quiz-q-text').textContent      = q.question;
    document.getElementById('quiz-live-score').textContent  = _quiz.score+' pts';

    document.getElementById('quiz-options').innerHTML = (q.options||[]).map((opt,i)=>`
        <button class="quiz-option" onclick="selectOption(${i})" id="quiz-opt-${i}">
            <span class="inline-flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg text-[10px] font-black flex-shrink-0 inline-flex items-center justify-center" style="background:rgba(153,50,201,0.15);color:#9932C9;">${LABS[i]}</span>
                ${opt}
            </span>
        </button>`).join('');

    const expBox = document.getElementById('quiz-explanation-box');
    expBox.style.display='none'; expBox.textContent=''; expBox.className='quiz-explanation';

    const nextBtn = document.getElementById('quiz-next-btn');
    nextBtn.classList.add('hidden');
    nextBtn.innerHTML = _quiz.current===total-1
        ? 'Finish Quiz <i class="fa-solid fa-flag-checkered"></i>'
        : 'Next Question <i class="fa-solid fa-arrow-right"></i>';

    _quiz.answered = false;
}

/* Handle option selection */
window.selectOption = function(idx) {
    if (_quiz.answered) return;
    _quiz.answered = true;

    const q       = _quiz.questions[_quiz.current];
    const correct = q.correct;
    const isRight = idx === correct;

    document.querySelectorAll('.quiz-option').forEach((btn,i)=>{
        btn.disabled = true;
        if (i===correct)         btn.classList.add(isRight?'correct':'reveal-correct');
        if (i===idx && !isRight) btn.classList.add('wrong');
    });

    if (isRight) {
        _quiz.score += 10;
        document.getElementById('quiz-live-score').textContent = _quiz.score+' pts';
    } else {
        _quiz.wrong++;
    }

    _quiz.review.push({ question:q.question, options:q.options, selected:idx, correct, explanation:q.explanation||'' });

    const expBox = document.getElementById('quiz-explanation-box');
    if (isRight) {
        expBox.textContent = q.explanation ? '✅ '+q.explanation : '✅ Correct!';
        expBox.className   = 'quiz-explanation';
    } else {
        expBox.textContent = q.explanation
            ? `❌ Correct: ${q.options[correct]}. ${q.explanation}`
            : `❌ Correct answer: ${q.options[correct]}`;
        expBox.className   = 'quiz-explanation wrong-exp';
    }
    expBox.style.display = 'block';
    document.getElementById('quiz-next-btn').classList.remove('hidden');
};

window.quizNext = function() {
    _quiz.current++;
    if (_quiz.current >= _quiz.questions.length) finishQuiz();
    else renderCurrentQuestion();
};

/* ══════════════════════════════════════════
   USER QUIZ: Finish & results
══════════════════════════════════════════ */
function finishQuiz() {
    clearInterval(_quiz.timerInterval);
    _quiz.totalTime = _quiz.elapsed;

    const total = _quiz.questions.length;
    const right = total - _quiz.wrong;
    const pct   = Math.round((right/total)*100);

    document.getElementById('quiz-active').style.display  = 'none';
    document.getElementById('quiz-results').style.display = 'block';

    document.getElementById('quiz-result-set').textContent  = _quiz.subject;
    document.getElementById('quiz-score-pct').textContent   = pct+'%';
    document.getElementById('quiz-score-frac').textContent  = `${right} / ${total} correct`;
    document.getElementById('r-correct').textContent        = right;
    document.getElementById('r-wrong').textContent          = _quiz.wrong;
    document.getElementById('r-time').textContent           = _quiz.totalTime+'s';

    // Score ring animation
    const ring = document.getElementById('quiz-ring-fill');
    if (ring) {
        ring.style.stroke = pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444';
        setTimeout(()=>{ ring.style.strokeDashoffset = 351.86*(1-pct/100); }, 100);
    }

    // XP
    const xpEarned = Math.round(right*5 + (pct>=80?20:pct>=50?10:0));
    const xpEl = document.getElementById('quiz-xp-earned');
    if (xpEl) xpEl.textContent = `⚡ +${xpEarned} XP earned! ${pct>=80?'🎉 Excellent!':pct>=50?'👍 Good effort!':'💪 Keep practicing!'}`;
    if (window.addXP) addXP(xpEarned, 'Quiz: '+_quiz.subject);

    // Review
    const reviewEl = document.getElementById('quiz-review');
    if (reviewEl) reviewEl.innerHTML = `
        <p class="text-gray-500 text-[10px] uppercase tracking-widest font-black mb-3">Answer Review</p>
        ${_quiz.review.map((r,i)=>{
            const ok = r.selected===r.correct;
            return `<div class="p-4 rounded-2xl border" style="background:${ok?'rgba(16,185,129,0.05)':'rgba(239,68,68,0.04)'};border-color:${ok?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.15)'};">
                <p class="text-white text-xs font-bold mb-2">${i+1}. ${r.question}</p>
                <p class="text-[11px] ${ok?'text-emerald-400':'text-red-400'} font-bold">
                    ${ok?'✅':'❌'} Your answer: ${r.options[r.selected]}
                    ${!ok?`<span class="text-gray-500"> · Correct: ${r.options[r.correct]}</span>`:''}
                </p>
                ${r.explanation?`<p class="text-gray-600 text-[10px] mt-1.5 italic">💡 ${r.explanation}</p>`:''}
            </div>`;
        }).join('')}`;

    // Save result to Firestore
    const session = JSON.parse(localStorage.getItem('kolaSession')||'{}');
    if (session.email) {
        waitForDB(async (db) => {
            try {
                await addDoc(collection(db,'quizResults'),{
                    userEmail:session.email, userName:session.name||'',
                    subject:_quiz.subject, score:right, total, pct,
                    timeTaken:_quiz.totalTime, takenAt:serverTimestamp()
                });
            } catch(e){ console.warn('[Quiz] Save result error:',e); }
        });
    }
}

window.retakeQuiz = function() { startQuiz(_quiz.subject); };

