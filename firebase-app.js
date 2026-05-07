    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, deleteDoc, query, orderBy, limit, updateDoc, setDoc, getDoc, increment, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyAwKGhoQGjcTI1kHYuYlGGI_vGlojCgeOk",
      authDomain: "kola26-70d76.firebaseapp.com",
      projectId: "kola26-70d76",
      storageBucket: "kola26-70d76.firebasestorage.app",
      messagingSenderId: "27350698262",
      appId: "1:27350698262:web:96b0f2fc0865db19252837"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    window._kolaDB = db;  // expose for PDF upload/load functions
    let allVisitors = [];

    window.enterHub = async function() {
        const name      = document.getElementById('userName').value.trim();
        const email     = document.getElementById('userEmail').value.trim();
        const phone     = document.getElementById('userPhone').value.trim();
        const className = document.getElementById('userClass').value;
        const password  = document.getElementById('userPassword').value;

        if(!name || !email || !phone || !className) return showAuthMsg('Please fill all details!','error');
        if(!password || password.length < 6) return showAuthMsg('Password must be at least 6 characters!','error');

        showAuthMsg('Creating account…', 'success');

        try {
            // Check visitors collection if email already exists (uses existing allowed collection)
            const existingVisitors = await getDocs(query(collection(db, 'visitors'), where('email','==', email)));
            if (!existingVisitors.empty) {
                return showAuthMsg('Email already registered! Please login.','error');
            }

            // Save to visitors collection (used for both admin panel AND login lookup)
            // visitors collection already has read/write allowed in your rules
            await addDoc(collection(db, 'visitors'), {
                name, email, phone, class: className,
                password,          // store password here for login
                time: new Date(),
                createdAt: new Date()
            });

            // Save to localStorage as cache
            const users = JSON.parse(localStorage.getItem('kolaUsers') || '[]');
            if (!users.find(u => u.email === email)) {
                users.push({ name, email, phone, class: className, password });
                localStorage.setItem('kolaUsers', JSON.stringify(users));
            }
            localStorage.setItem('kolaSession', JSON.stringify({ name, email, class: className }));

            bootUser(name);
        } catch(e) {
            showAuthMsg('Registration failed: ' + e.message, 'error');
        }
    }

    window.loginUser = async function() {
        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if(!email || !password) return showAuthMsg('Please enter email and password!','error');

        showAuthMsg('Logging in…', 'success');

        // 1️⃣ Check localStorage cache first (fast, works offline)
        const localUsers = JSON.parse(localStorage.getItem('kolaUsers') || '[]');
        const localUser  = localUsers.find(u => u.email === email && u.password === password);
        if(localUser) {
            localStorage.setItem('kolaSession', JSON.stringify({ name: localUser.name, email: localUser.email, class: localUser.class }));
            return bootUser(localUser.name);
        }

        // 2️⃣ Fallback — check Firestore visitors collection (works on any device)
        try {
            const snap = await getDocs(query(collection(db, 'visitors'), where('email','==', email)));
            if(snap.empty) return showAuthMsg('No account found. Please register first.','error');

            // Find matching password among all docs with this email
            let matched = null;
            snap.forEach(d => {
                const data = d.data();
                if(data.password === password) matched = data;
            });
            if(!matched) return showAuthMsg('Wrong password. Please try again.','error');

            // Cache locally so next login is instant
            const users = JSON.parse(localStorage.getItem('kolaUsers') || '[]');
            if(!users.find(u => u.email === email)) {
                users.push({ name: matched.name, email: matched.email, phone: matched.phone, class: matched.class, password: matched.password });
                localStorage.setItem('kolaUsers', JSON.stringify(users));
            }
            localStorage.setItem('kolaSession', JSON.stringify({ name: matched.name, email: matched.email, class: matched.class }));
            bootUser(matched.name);
        } catch(e) {
            showAuthMsg('Login failed: ' + e.message, 'error');
        }
    }

    function bootUser(name) {
        document.getElementById("statusBadge").classList.remove('hidden');
        document.getElementById("statusBadge").textContent = '👋 ' + name.split(' ')[0];
        // Record session start time for session duration tracking
        if (!localStorage.getItem('kolaSessionStart')) {
            localStorage.setItem('kolaSessionStart', String(Date.now()));
        }
        renderSubjects();
        navigateTo('step-about');
        // Show latest notification after login
        setTimeout(() => { if(window.showLatestNotification) showLatestNotification(); }, 1400);
        // Load bell badge count
        setTimeout(() => { if(window.updateBellBadge) updateBellBadge(); }, 1000);
    }

    function showAuthMsg(msg, type) {
        // Remove any existing message first
        const old = document.getElementById('auth-msg');
        if(old) old.remove();

        const el = document.createElement('div');
        el.id = 'auth-msg';
        el.textContent = msg;
        el.style.cssText = 'margin-top:12px;padding:12px 16px;border-radius:12px;font-size:13px;font-weight:700;text-align:center;';
        el.style.background = type === 'error' ? 'rgba(255,60,60,0.12)' : 'rgba(153,50,201,0.12)';
        el.style.color      = type === 'error' ? '#ff5555' : '#9932C9';
        el.style.border     = '1px solid ' + (type === 'error' ? 'rgba(255,60,60,0.3)' : 'rgba(153,50,201,0.3)');

        // Always find the currently VISIBLE panel (register or login)
        const activePanel = document.querySelector('#auth-register-panel:not(.hidden)')
                         || document.querySelector('#auth-login-panel:not(.hidden)');
        if(activePanel) activePanel.appendChild(el);

        setTimeout(() => { if(el && el.parentNode) el.remove(); }, 3500);
    }

    // Auto-login on page load
    window.addEventListener('DOMContentLoaded', () => {
        const session = localStorage.getItem('kolaSession');
        if(session) {
            try {
                const user = JSON.parse(session);
                bootUser(user.name);
            } catch(e) { localStorage.removeItem('kolaSession'); }
        }
    });

    window.promptAdmin = function() {
        const key = prompt("Enter Admin Key:");
        if (key === "alokbro") { navigateTo('step-admin'); }
        else if (key !== null) { alert("Access Denied"); }
    }

    async function loadAdminQuickStats() {
        try {
            const [vSnap, pdfViewSnap, fbSnap, pdfsSnap] = await Promise.all([
                getDocs(collection(db, 'visitors')),
                getDocs(collection(db, 'pdfViews')),
                getDocs(collection(db, 'feedbacks')),
                getDocs(collection(db, 'pdfs'))
            ]);
            const qsV = document.getElementById('qs-visitors');
            const qsP = document.getElementById('qs-pdf-views');
            const qsF = document.getElementById('qs-feedbacks');
            const qsPdf = document.getElementById('qs-pdfs');
            if(qsV) qsV.textContent = vSnap.size;
            if(qsP) qsP.textContent = pdfViewSnap.size;
            if(qsF) qsF.textContent = fbSnap.size;
            if(qsPdf) qsPdf.textContent = pdfsSnap.size;
        } catch(e) { console.warn('Quick stats error:', e); }
    }

    window.loadVisitorLogs = function() {
        onSnapshot(query(collection(db, "visitors"), orderBy("time", "desc")), (snapshot) => {
            allVisitors = [];
            const tbody = document.getElementById("visitorTableBody");
            if (!tbody) return;
            tbody.innerHTML = "";
            snapshot.forEach((doc) => {
                const data = doc.data();
                allVisitors.push({ id: doc.id, ...data });
                const safeEmail = (data.email||'').replace(/'/g, '&apos;');
                const safeName  = (data.name||'').replace(/'/g, '&apos;');
                tbody.innerHTML += `
                    <tr class="hover:bg-white/[0.02] transition-colors">
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#9932C9);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:white;flex-shrink:0;">
                                    ${(data.name||'?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <button onclick="openUserAnalytics('${safeEmail}','${safeName}')" class="text-white font-bold text-sm hover:text-[#9932C9] transition-all text-left block">${data.name}</button>
                                    <span class="text-[10px] text-gray-500">${data.email}</span>
                                </div>
                            </div>
                        </td>
                        <td class="p-4 text-xs">${data.phone}</td>
                        <td class="p-4 text-xs">Class ${data.class}</td>
                        <td class="p-4 text-[10px]">${data.time?.toDate().toLocaleDateString() || "N/A"}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="openUserAnalytics('${safeEmail}','${safeName}')" class="text-[#9932C9] hover:text-white transition-all text-xs bg-[#9932C9]/10 border border-[#9932C9]/20 px-2 py-1 rounded-lg" title="View Analytics">
                                    <i class="fa-solid fa-chart-line"></i>
                                </button>
                                <button onclick="deleteVisitor('${doc.id}')" class="text-red-500 hover:text-red-400 transition-all text-xs bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
            });
        });
    }

    window.openUserAnalytics = async function(email, name) {
        // Set up the user analytics page for this specific user
        document.getElementById('user-analytics-title').textContent = name + "'s Analytics";
        document.getElementById('ua-name').textContent = name;
        document.getElementById('ua-email').textContent = email;
        const av = document.getElementById('ua-avatar');
        if(av) av.textContent = (name[0]||'?').toUpperCase();

        // Find visitor record for class info
        try {
            const vSnap = await getDocs(query(collection(db,'visitors'), where('email','==',email)));
            if (!vSnap.empty) {
                const vd = vSnap.docs[0].data();
                const cl = document.getElementById('ua-class');
                if(cl) cl.textContent = 'Class ' + (vd.class||'—') + ' · Joined: ' + (vd.time?.toDate().toLocaleDateString()||'—');
            }
        } catch(e) {}

        // Load this user's PDF views
        const statsEl = document.getElementById('ua-stats');
        const listEl = document.getElementById('ua-pdf-list');
        if(statsEl) statsEl.innerHTML = '<p class="text-gray-500 text-xs col-span-4">Loading…</p>';
        if(listEl) listEl.innerHTML = '<p class="text-gray-500 text-xs text-center py-4">Loading…</p>';

        try {
            const snap = await getDocs(query(collection(db,'pdfViews'), where('userEmail','==',email)));
            const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a,b) => (b.viewedAt?.toDate?.() || 0) - (a.viewedAt?.toDate?.() || 0));

            // Stats
            const totalViews = rows.length;
            const totalTime = rows.reduce((s,r) => s + (r.timeSpentSeconds||0), 0);
            const totalDl = rows.filter(r => r.downloaded).length;
            const uniquePDFs = new Set(rows.map(r => r.pdfName)).size;

            if(statsEl) statsEl.innerHTML = `
                <div class="p-4 rounded-2xl text-center" style="background:rgba(153,50,201,0.08);border:1px solid rgba(153,50,201,0.2)">
                    <p class="text-xl font-black orbitron text-[#9932C9]">${totalViews}</p>
                    <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">PDF Views</p>
                </div>
                <div class="p-4 rounded-2xl text-center" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2)">
                    <p class="text-xl font-black orbitron text-indigo-400">${fmtSecs(totalTime)}</p>
                    <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Time Spent</p>
                </div>
                <div class="p-4 rounded-2xl text-center" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2)">
                    <p class="text-xl font-black orbitron text-yellow-400">${totalDl}</p>
                    <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Downloads</p>
                </div>
                <div class="p-4 rounded-2xl text-center" style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.2)">
                    <p class="text-xl font-black orbitron text-pink-400">${uniquePDFs}</p>
                    <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Unique PDFs</p>
                </div>`;

            if(listEl) {
                if(rows.length === 0) {
                    listEl.innerHTML = '<p class="text-gray-500 text-xs text-center py-6 italic">No PDF activity yet.</p>';
                } else {
                    listEl.innerHTML = rows.map(r => `
                        <div class="p-4 rounded-2xl border border-white/5" style="background:rgba(255,255,255,0.025)">
                            <div class="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                    <p class="text-white font-bold text-sm">${r.pdfName||'—'}</p>
                                    <p class="text-gray-500 text-[10px] mt-1">${r.viewedAt?.toDate ? r.viewedAt.toDate().toLocaleString('en-IN') : '—'}</p>
                                </div>
                                <div class="flex gap-3 flex-wrap">
                                    <div class="text-center"><p class="text-indigo-400 font-black text-sm orbitron">${fmtSecs(r.timeSpentSeconds||0)}</p><p class="text-gray-600 text-[9px] uppercase">Time</p></div>
                                    <div class="text-center"><p class="font-black text-sm ${r.downloaded?'text-yellow-400':'text-gray-600'}">${r.downloaded?'✅':'—'}</p><p class="text-gray-600 text-[9px] uppercase">DL</p></div>
                                </div>
                            </div>
                        </div>`).join('');
                }
            }
        } catch(e) {
            if(listEl) listEl.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error: ${e.message}</p>`;
        }

        navigateTo('step-user-analytics');
    };

    window.loadPDFAnalytics = async function() {
        const container = document.getElementById('pdf-analytics-container');
        const summary   = document.getElementById('pdf-analytics-summary');
        if (!container) return;
        container.innerHTML = '<p class="text-gray-600 text-xs text-center py-4 italic">Loading analytics…</p>';
        try {
            const snap = await getDocs(query(collection(db, 'pdfViews'), orderBy('viewedAt', 'desc')));
            if (snap.empty) {
                container.innerHTML = '<p class="text-gray-600 text-xs text-center py-4 italic">No PDF views recorded yet.</p>';
                return;
            }
            // Aggregate by PDF
            const agg = {};
            const rows = [];
            snap.forEach(d => {
                const v = { id: d.id, ...d.data() };
                rows.push(v);
                if (!agg[v.pdfName]) agg[v.pdfName] = { views: 0, totalTime: 0, downloads: 0, users: new Set() };
                agg[v.pdfName].views++;
                agg[v.pdfName].totalTime += v.timeSpentSeconds || 0;
                if (v.downloaded) agg[v.pdfName].downloads++;
                if (v.userEmail) agg[v.pdfName].users.add(v.userEmail);
            });
            // Summary cards
            if (summary) {
                const totalViews = rows.length;
                const totalTime  = rows.reduce((s, r) => s + (r.timeSpentSeconds || 0), 0);
                const totalDl    = rows.filter(r => r.downloaded).length;
                const uniqueU    = new Set(rows.map(r => r.userEmail)).size;
                summary.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div class="p-4 rounded-2xl text-center" style="background:rgba(153,50,201,0.08);border:1px solid rgba(153,50,201,0.2)">
                        <p class="text-2xl font-black orbitron text-[#9932C9]">${totalViews}</p>
                        <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Views</p>
                    </div>
                    <div class="p-4 rounded-2xl text-center" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2)">
                        <p class="text-2xl font-black orbitron text-indigo-400">${fmtSecs(totalTime)}</p>
                        <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Time</p>
                    </div>
                    <div class="p-4 rounded-2xl text-center" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2)">
                        <p class="text-2xl font-black orbitron text-yellow-400">${totalDl}</p>
                        <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Downloads</p>
                    </div>
                    <div class="p-4 rounded-2xl text-center" style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.2)">
                        <p class="text-2xl font-black orbitron text-pink-400">${uniqueU}</p>
                        <p class="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Unique Users</p>
                    </div>
                </div>`;
            }
            // Aggregate by User
            const userAgg = {};
            rows.forEach(r => {
                const key = r.userEmail || 'anonymous';
                if (!userAgg[key]) userAgg[key] = { name: r.userName || 'Anonymous', email: r.userEmail || '', views: 0, totalTime: 0, downloads: 0 };
                userAgg[key].views++;
                userAgg[key].totalTime += r.timeSpentSeconds || 0;
                if (r.downloaded) userAgg[key].downloads++;
            });
            const userRows = Object.values(userAgg).sort((a,b) => b.views - a.views);
            let userHtml = `<div class="mb-6">
                <h4 class="text-white font-black text-sm mb-3 flex items-center gap-2"><i class="fa-solid fa-users text-blue-400"></i> Users — Tap a name to view their full analytics page</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${userRows.map(u => `
                <button onclick="openUserAnalytics('${(u.email||'').replace(/'/g,'&apos;')}','${(u.name||'').replace(/'/g,'&apos;')}')"
                    class="p-4 rounded-2xl border border-white/5 hover:border-[#9932C9]/40 hover:bg-[#9932C9]/5 transition-all text-left flex items-center gap-4"
                    style="background:rgba(255,255,255,0.025)">
                    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#9932C9);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:white;flex-shrink:0;">
                        ${(u.name[0]||'?').toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-white font-black text-sm truncate">${u.name}</p>
                        <p class="text-gray-500 text-[10px] truncate">${u.email}</p>
                    </div>
                    <div class="flex gap-3 text-right flex-shrink-0">
                        <div><p class="text-[#9932C9] font-black text-sm orbitron">${u.views}</p><p class="text-gray-600 text-[9px] uppercase">Views</p></div>
                        <div><p class="text-indigo-400 font-black text-sm orbitron">${fmtSecs(u.totalTime)}</p><p class="text-gray-600 text-[9px] uppercase">Time</p></div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-gray-600 text-xs flex-shrink-0"></i>
                </button>`).join('')}
                </div>
            </div>`;

            // Per-PDF summary
            const pdfRows = Object.entries(agg).sort((a,b) => b[1].views - a[1].views);
            let pdfHtml = `<div class="mb-5">
                <h4 class="text-white font-black text-sm mb-3 flex items-center gap-2"><i class="fa-solid fa-chart-bar text-[#9932C9]"></i> Per-PDF Summary</h4>
                <div class="space-y-2">
                ${pdfRows.map(([name, d]) => `
                <div class="p-4 rounded-xl border border-white/5" style="background:rgba(255,255,255,0.03)">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-8 h-8 rounded-lg bg-[#9932C9]/10 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-file-pdf text-[#9932C9] text-xs"></i>
                            </div>
                            <p class="text-white font-bold text-xs truncate max-w-[180px]">${name}</p>
                        </div>
                        <div class="flex gap-4 flex-wrap text-right">
                            <div><p class="text-[#9932C9] font-black text-sm orbitron">${d.views}</p><p class="text-gray-600 text-[9px] uppercase">Views</p></div>
                            <div><p class="text-indigo-400 font-black text-sm orbitron">${fmtSecs(d.totalTime)}</p><p class="text-gray-600 text-[9px] uppercase">Time</p></div>
                            <div><p class="text-yellow-400 font-black text-sm orbitron">${d.downloads}</p><p class="text-gray-600 text-[9px] uppercase">DLs</p></div>
                            <div><p class="text-pink-400 font-black text-sm orbitron">${d.users.size}</p><p class="text-gray-600 text-[9px] uppercase">Users</p></div>
                        </div>
                    </div>
                </div>`).join('')}
                </div>
            </div>`;
            // Individual view log
            let logHtml = `<div>
                <h4 class="text-white font-black text-sm mb-3 flex items-center gap-2"><i class="fa-solid fa-list text-indigo-400"></i> View Log (Latest First)</h4>
                <div class="overflow-x-auto rounded-2xl border border-white/5">
                <table class="w-full text-left text-xs">
                    <thead class="bg-white/5 text-[#9932C9] uppercase text-[9px] tracking-widest">
                        <tr>
                            <th class="p-3">User</th>
                            <th class="p-3">PDF</th>
                            <th class="p-3">Time Spent</th>
                            <th class="p-3">DL?</th>
                            <th class="p-3">Date</th>
                            <th class="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody class="text-gray-400 divide-y divide-white/5">
                    ${rows.map(r => `
                        <tr class="hover:bg-white/[0.02]">
                            <td class="p-3">
                                <button onclick="openUserAnalytics('${(r.userEmail||'').replace(/'/g,'&apos;')}','${(r.userName||'').replace(/'/g,'&apos;')}')" class="text-left hover:text-[#9932C9] transition-all">
                                    <span class="font-bold text-white block">${r.userName || '—'}</span>
                                    <span class="text-[9px] text-gray-500 font-normal">${r.userEmail || ''}</span>
                                </button>
                            </td>
                            <td class="p-3 max-w-[140px] truncate">${r.pdfName || '—'}</td>
                            <td class="p-3 text-indigo-400 font-black orbitron">${fmtSecs(r.timeSpentSeconds || 0)}</td>
                            <td class="p-3">${r.downloaded ? '<span class="text-yellow-400 font-bold text-[10px]">✅ Yes</span>' : '<span class="text-gray-600 text-[10px]">No</span>'}</td>
                            <td class="p-3 text-[9px]">${r.viewedAt?.toDate ? r.viewedAt.toDate().toLocaleString('en-IN') : '—'}</td>
                            <td class="p-3"><button onclick="deletePDFView('${r.id}')" class="text-red-500 hover:text-red-400"><i class="fa-solid fa-trash text-[10px]"></i></button></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                </div>
            </div>`;
            container.innerHTML = userHtml + pdfHtml + logHtml;
        } catch(e) {
            container.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error: ${e.message}</p>`;
        }
    };

    function fmtSecs(s) {
        if (!s || s === 0) return '0s';
        const m = Math.floor(s / 60), sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    }

    window.deletePDFView = async function(id) {
        if (!confirm('Delete this view record?')) return;
        try { await deleteDoc(doc(db, 'pdfViews', id)); loadPDFAnalytics(); } catch(e) { alert('Delete failed: ' + e.message); }
    };

    window.exportPDFAnalyticsCSV = async function() {
        try {
            const snap = await getDocs(query(collection(db, 'pdfViews'), orderBy('viewedAt', 'desc')));
            let csv = "User,Email,Class,PDF Name,Time Spent (s),Downloaded,Date\n";
            snap.forEach(d => {
                const r = d.data();
                const date = r.viewedAt?.toDate ? r.viewedAt.toDate().toLocaleString('en-IN') : '';
                csv += `"${r.userName || ''}","${r.userEmail || ''}","${r.userClass || ''}","${r.pdfName || ''}","${r.timeSpentSeconds || 0}","${r.downloaded ? 'Yes' : 'No'}","${date}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = "KolaBro_PDF_Analytics.csv"; a.click();
        } catch(e) { alert('Export failed: ' + e.message); }
    };

    window.deleteVisitor = async (id) => { if(confirm("Delete this form?")) await deleteDoc(doc(db, "visitors", id)); }

    window.exportToCSV = () => {
        let csv = "Name,Email,Phone,Class,Date\n";
        allVisitors.forEach(v => { csv += `${v.name},${v.email},${v.phone},${v.class},${v.time?.toDate().toLocaleDateString()}\n`; });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = "KolaBro_Data.csv"; a.click();
    }

    const subjects = [
        { name: 'Physics',   icon: 'fa-atom',            cls: 'physics',   grade: '9-10', emoji:'⚛️' },
        { name: 'Chemistry', icon: 'fa-flask',           cls: 'chemistry', grade: '9-10', emoji:'🧪' },
        { name: 'Biology',   icon: 'fa-dna',             cls: 'biology',   grade: '9-10', emoji:'🧬' },
        { name: 'Math',      icon: 'fa-calculator',      cls: 'math',      grade: '9-10', emoji:'📐' },
        { name: 'History',   icon: 'fa-landmark',        cls: 'history',   grade: '9-10', emoji:'🏛️' },
        { name: 'Geography', icon: 'fa-earth-americas',  cls: 'geography', grade: '9-10', emoji:'🌍' },
        { name: 'Computer',  icon: 'fa-laptop-code',     cls: 'computer',  grade: '9-10', emoji:'💻' },
        { name: 'Hindi',     icon: 'fa-language',        cls: 'hindi',     grade: '9-10', emoji:'📖' },
        { name: 'English',   icon: 'fa-book-open',       cls: 'english',   grade: '9-10', emoji:'📚' },
        { name: 'Civics',    icon: 'fa-scale-balanced',  cls: 'civics',    grade: '9-10', emoji:'⚖️' },
        { name: 'Economy',   icon: 'fa-chart-line',      cls: 'economy',   grade: '9-10', emoji:'📈' },
        { name: 'Gallery',   icon: 'fa-image',           cls: 'gallery',   grade: 'misc', emoji:'🖼️' }
    ];
    let currentSubjectView = localStorage.getItem('kolaSubjectView') || 'grid';

    window.navigateTo = (stepId) => {
        // ── AUTH GATE: block all pages if not logged in ──
        const OPEN_STEPS = ['step-auth']; // only these are accessible without login
        const isLoggedIn = !!localStorage.getItem('kolaSession');
        const isAdmin = stepId && stepId.startsWith('step-admin');
        if (!isLoggedIn && !OPEN_STEPS.includes(stepId)) {
            // Flash the auth panel
            const authEl = document.getElementById('step-auth');
            document.querySelectorAll('.view-step').forEach(el => el.classList.remove('view-active'));
            if (authEl) { authEl.classList.add('view-active'); authEl.style.animation='none'; setTimeout(()=>authEl.style.animation='',50); }
            showAuthMsg('⚠️ Please login or register to access this page!', 'error');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        document.querySelectorAll('.view-step').forEach(el => el.classList.remove('view-active'));
        const target = document.getElementById(stepId);
        if(target) target.classList.add('view-active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if(stepId === 'step-admin') setTimeout(()=>{ loadAdminQuickStats(); }, 100);
        if(stepId === 'step-admin-pdf') setTimeout(()=>{ if(window.renderUploadedPDFs) window.renderUploadedPDFs(); }, 100);
        if(stepId === 'step-admin-video') setTimeout(()=>{ if(window.renderSavedNotifications) renderSavedNotifications(); }, 100);
        if(stepId === 'step-admin-gallery') setTimeout(()=>{ renderAdminGallery(); }, 100);
        if(stepId === 'step-admin-theme') setTimeout(()=>{ updateThemeLockBtn(); }, 100);
        if(stepId === 'step-admin-feedback') setTimeout(()=>{ loadAdminFeedback(); }, 100);
        if(stepId === 'step-admin-visitors') setTimeout(()=>{ loadVisitorLogs(); }, 100);
        if(stepId === 'step-admin-analytics') setTimeout(()=>{ loadPDFAnalytics(); }, 100);
        if(stepId === 'step-admin-quiz') setTimeout(()=>{ if(window.loadAdminQuestions) loadAdminQuestions(); }, 100);
        if(stepId === 'step-quiz') setTimeout(()=>{ if(window.loadQuizSets) loadQuizSets(); }, 100);

        if(stepId === 'step-feedback') {
            const s = JSON.parse(localStorage.getItem('kolaSession')||'{}');
            const el = document.getElementById('fb-user-name');
            if(el) el.textContent = s.name || 'Guest';
            renderPublicFeedback();
        }
        if(stepId === 'step-progress') setTimeout(renderProgressPage, 80);
        if(stepId === 'step-profile') setTimeout(renderProfilePage, 80);
        if(stepId === 'step-timetable') setTimeout(renderTimetable, 80);
        if(stepId === 'step-gallery') setTimeout(loadGalleryPhotos, 80);
    }

    // PDF view tracking state
    let _pdfViewStartTime = null;
    let _pdfViewDocId = null;
    let _currentPDFName = '';

    // In-website full-screen PDF viewer (Google Drive links)
    window.viewPDF = async (url, title = "Study Material") => {
        if(url === '#' || !url) {
            alert("This chapter will be uploaded soon!");
            return;
        }
        // Google Drive URL → convert to embed/preview URL
        let embedUrl = url;
        if(url.includes('drive.google.com/file/d/')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if(match) embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
        }
        // Derive a direct download link for Drive files
        let downloadUrl = url;
        if(url.includes('drive.google.com/file/d/')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if(match) downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
        const overlay = document.getElementById('pdf-viewer-overlay');
        document.getElementById('pdfTitle').textContent = title;
        document.getElementById('pdfDownloadLink').href = downloadUrl;
        document.getElementById('pdfDownloadLink').target = '_blank';
        document.getElementById('pdfFrame').src = embedUrl;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // ── PDF VIEW TRACKING ──
        _pdfViewStartTime = Date.now();
        _currentPDFName = title;
        try {
            const session = JSON.parse(localStorage.getItem('kolaSession') || '{}');
            if (session.email) {
                const viewRef = await addDoc(collection(db, 'pdfViews'), {
                    pdfName: title,
                    pdfUrl: url,
                    userName: session.name || 'Anonymous',
                    userEmail: session.email || '',
                    userClass: session.class || '',
                    viewedAt: new Date(),
                    timeSpentSeconds: 0,
                    downloaded: false
                });
                _pdfViewDocId = viewRef.id;
            }
        } catch(e) { console.warn('PDF view tracking error:', e); }
    }

    // Track download click
    document.addEventListener('DOMContentLoaded', () => {
        const dlLink = document.getElementById('pdfDownloadLink');
        if (dlLink) {
            dlLink.addEventListener('click', async () => {
                if (_pdfViewDocId) {
                    try {
                        await updateDoc(doc(db, 'pdfViews', _pdfViewDocId), { downloaded: true });
                    } catch(e) {}
                }
            });
        }
    });

    window.closePDF = async () => {
        // ── Save time spent ──
        if (_pdfViewDocId && _pdfViewStartTime) {
            const timeSpent = Math.round((Date.now() - _pdfViewStartTime) / 1000);
            try {
                await updateDoc(doc(db, 'pdfViews', _pdfViewDocId), { timeSpentSeconds: timeSpent });
            } catch(e) {}
            // Store in local session tracker too
            const tracker = JSON.parse(localStorage.getItem('kolaPDFTracker') || '{}');
            if (!tracker[_currentPDFName]) tracker[_currentPDFName] = { views: 0, totalSeconds: 0 };
            tracker[_currentPDFName].views++;
            tracker[_currentPDFName].totalSeconds += timeSpent;
            localStorage.setItem('kolaPDFTracker', JSON.stringify(tracker));
        }
        _pdfViewStartTime = null;
        _pdfViewDocId = null;
        _currentPDFName = '';
        document.getElementById('pdf-viewer-overlay').style.display = 'none';
        document.getElementById('pdfFrame').src = '';
        document.body.style.overflow = 'auto';
    }

    window.setSubjectView = (v) => {
        currentSubjectView = v;
        localStorage.setItem('kolaSubjectView', v);
        ['grid','list','grade'].forEach(t => {
            const btn = document.getElementById('vtbtn-'+t);
            if(btn) btn.classList.toggle('active', t === v);
        });
        renderSubjects();
    };

    window.renderSubjects = () => {
        const list = document.getElementById("subjectList");
        // Restore button states
        ['grid','list','grade'].forEach(t => {
            const btn = document.getElementById('vtbtn-'+t);
            if(btn) btn.classList.toggle('active', t === currentSubjectView);
        });

        // Check which subjects have new unseen PDF notifications
        const dismissed = JSON.parse(localStorage.getItem('kolaDismissed') || '[]');
        const newPdfSubjects = {}; // subjectName → count of new PDFs
        // We'll check via a quick async fetch
        (async () => {
            try {
                const snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt','desc')));
                snap.forEach(d => {
                    const n = d.data();
                    if (n.type === 'pdf' && n.subject && !dismissed.includes(d.id)) {
                        newPdfSubjects[n.subject] = (newPdfSubjects[n.subject] || 0) + 1;
                    }
                });
            } catch(e) {}
            // Re-inject badges
            Object.entries(newPdfSubjects).forEach(([subj, cnt]) => {
                const els = document.querySelectorAll(`[data-subj="${subj}"]`);
                els.forEach(el => {
                    if (!el.querySelector('.subj-new-badge')) {
                        const badge = document.createElement('span');
                        badge.className = 'subj-new-badge';
                        badge.textContent = cnt + ' NEW';
                        el.style.position = 'relative';
                        el.appendChild(badge);
                    }
                });
            });
        })();

        if(currentSubjectView === 'grid') {
            list.className = 'grid grid-cols-2 md:grid-cols-4 gap-5';
            list.innerHTML = subjects.map(s => `
                <div class="glass-ui card-hover p-6 text-center" data-subj="${s.name}" onclick="openSubject('${s.name}')">
                    <div class="subject-icon-3d w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border subj-icon-${s.cls} shadow-lg" style="box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                        <i class="fa-solid ${s.icon} text-3xl"></i>
                    </div>
                    <div class="text-xl mb-2">${s.emoji}</div>
                    <div style="display:flex;justify-content:center;"><span class="neon-label neon-label-sm" style="font-size:10px;">${s.name}</span></div>
                </div>`).join('');

        } else if(currentSubjectView === 'list') {
            list.className = '';
            list.innerHTML = subjects.map(s => `
                <div class="subject-list-item" data-subj="${s.name}" onclick="openSubject('${s.name}')">
                    <div class="subject-list-icon subj-icon-${s.cls} border" style="font-size:22px;">
                        <i class="fa-solid ${s.icon}"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-0.5"><span class="neon-label neon-label-sm">${s.name}</span><span class="text-base">${s.emoji}</span></div>
                        <p class="text-gray-500 text-[11px] mt-0.5">Class ${s.grade} · Tap to view chapters</p>
                    </div>
                    <i class="fa-solid fa-chevron-right text-gray-600 text-xs"></i>
                </div>`).join('');

        } else if(currentSubjectView === 'grade') {
            const grades = {};
            subjects.forEach(s => {
                const g = s.grade;
                if(!grades[g]) grades[g] = [];
                grades[g].push(s);
            });
            list.className = '';
            list.innerHTML = Object.entries(grades).map(([grade, subs]) => `
                <div class="mb-2">
                    <div style='display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:12px 0 4px;border-bottom:1px solid rgba(255,255,255,0.05);'><span class='neon-label neon-label-sm'>${grade === 'misc' ? 'EXTRAS' : 'CLASS ' + grade}</span><div class='neon-section-line'></div></div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${subs.map(s => `
                        <div class="glass-ui card-hover p-5 text-center" onclick="openSubject('${s.name}')">
                            <div class="subject-icon-3d w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border subj-icon-${s.cls}">
                                <i class="fa-solid ${s.icon} text-2xl"></i>
                            </div>
                            <div class="text-lg mb-0.5">${s.emoji}</div>
                            <h3 class="font-bold text-white uppercase text-[10px] tracking-widest">${s.name}</h3>
                        </div>`).join('')}
                    </div>
                </div>`).join('');
        }
    };


    /* ══════════════════════════════════════════════════════
       NOTIFICATION SYSTEM — Firestore (visible to ALL users)
    ══════════════════════════════════════════════════════ */

    // ── Render the popup for a single notification object ──
    function renderNotificationPopup(notif) {
        const popup = document.getElementById('notif-popup');
        const body  = document.getElementById('notif-body-content');
        if (!popup || !body) return;
        let mediaHTML = '';
        if (notif.type === 'image' && notif.media) {
            mediaHTML = `<div class="notif-media"><img src="${notif.media}" alt="notification" onerror="this.style.display='none'"></div>`;
            if (notif.caption) mediaHTML += `<p style="color:rgba(156,163,175,1);font-size:12px;margin-bottom:10px;">${notif.caption}</p>`;
        } else if (notif.type === 'video' && notif.media) {
            // Extract video ID from any YouTube URL format
            let videoId = '';
            let originalUrl = notif.media;
            const ytMatch = originalUrl.match(/(?:youtube\.com\/(?:shorts\/|embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch) videoId = ytMatch[1];
            const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
            const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : originalUrl;
            mediaHTML = `
            <a href="${watchUrl}" target="_blank" style="display:block;position:relative;border-radius:12px;overflow:hidden;margin-bottom:10px;cursor:pointer;text-decoration:none;">
                ${thumb ? `<img src="${thumb}" style="width:100%;height:160px;object-fit:cover;display:block;" onerror="this.style.background='#1a1a1a'">` : `<div style="width:100%;height:160px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;"><i class='fa-solid fa-video' style='color:#9932C9;font-size:2rem;'></i></div>`}
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);">
                    <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,0,0,0.85);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                        <i class="fa-solid fa-play" style="color:white;font-size:18px;margin-left:4px;"></i>
                    </div>
                </div>
                <div style="position:absolute;bottom:8px;right:10px;background:rgba(0,0,0,0.7);color:white;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;letter-spacing:1px;">TAP TO WATCH</div>
            </a>`;
            if (notif.caption) mediaHTML += `<p style="color:rgba(156,163,175,1);font-size:12px;margin-bottom:10px;">${notif.caption}</p>`;
        }
        body.innerHTML = `
            <p style="color:#9932C9;font-weight:900;font-size:14px;margin:0 0 8px;">${notif.title || 'New Update'}</p>
            ${mediaHTML}
            ${notif.text ? `<p class="notif-text">${notif.text}</p>` : ''}
            <p style="color:rgba(107,114,128,1);font-size:10px;margin-top:10px;text-transform:uppercase;letter-spacing:1px;">${notif.dateStr || ''}</p>
        `;
        popup.dataset.notifId = notif.firestoreId || notif.id || '';
        popup.style.display = 'block';
    }

    // ── Show latest notification (called on login + page load) ──
    window.showLatestNotification = async function() {
        try {
            const snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1)));
            if (snap.empty) return;
            const docSnap = snap.docs[0];
            const notif = { firestoreId: docSnap.id, ...docSnap.data() };
            // Only show if user hasn't dismissed this specific notification
            const dismissed = JSON.parse(localStorage.getItem('kolaDismissed') || '[]');
            if (dismissed.includes(notif.firestoreId)) return;
            renderNotificationPopup(notif);
            // Note: view is tracked when user clicks X (closeNotification)
        } catch(e) { console.warn('Notification fetch failed:', e); }
    };

    // ── Track a notification view in Firestore ──
    async function trackNotifView(notifId) {
        const session = JSON.parse(localStorage.getItem('kolaSession') || '{}');
        if (!session.email || !notifId) return;
        try {
            // Avoid duplicate tracking for this user+notification
            const existing = await getDocs(query(
                collection(db, 'notificationViews'),
                where('notifId', '==', notifId),
                where('userEmail', '==', session.email)
            ));
            if (existing.empty) {
                await addDoc(collection(db, 'notificationViews'), {
                    notifId,
                    userEmail: session.email,
                    userName: session.name || 'Unknown',
                    seenAt: new Date()
                });
                // Increment seenCount on the notification document
                try {
                    await updateDoc(doc(db, 'notifications', notifId), { seenCount: increment(1) });
                } catch(e) {}
            }
        } catch(e) { console.warn('Track notif view error:', e); }
    }

    // ── Close popup and mark dismissed + track view ──
    window.closeNotification = async function() {
        const popup = document.getElementById('notif-popup');
        if (!popup) return;
        popup.classList.add('notif-hide');
        const id = popup.dataset.notifId;
        if (id) {
            const dismissed = JSON.parse(localStorage.getItem('kolaDismissed') || '[]');
            if (!dismissed.includes(id)) {
                dismissed.push(id);
                localStorage.setItem('kolaDismissed', JSON.stringify(dismissed));
            }
            // ← Track who saw this notification
            await trackNotifView(id);
            // Update bell badge
            updateBellBadge();
        }
        setTimeout(() => { popup.style.display = 'none'; popup.classList.remove('notif-hide'); }, 420);
    };

    // ── Admin: publish notification to Firestore ──
    window.publishNotification = async function() {
        const title = (document.getElementById('notif-admin-title')?.value || '').trim();
        if (!title) { alert('Please enter a notification title!'); return; }

        let type = 'text', media = '', caption = '', text = '';
        const imgActive   = document.getElementById('ntab-image')?.classList.contains('active');
        const videoActive = document.getElementById('ntab-video')?.classList.contains('active');

        if (imgActive) {
            type = 'image';
            media = (document.getElementById('notif-admin-image')?.value || '').trim();
            caption = (document.getElementById('notif-admin-image-caption')?.value || '').trim();
            if (!media) { alert('Please enter an image URL!'); return; }
        } else if (videoActive) {
            type = 'video';
            media = (document.getElementById('notif-admin-video')?.value || '').trim();
            caption = (document.getElementById('notif-admin-video-caption')?.value || '').trim();
            if (!media) { alert('Please enter a video embed URL!'); return; }
        } else {
            text = (document.getElementById('notif-admin-text')?.value || '').trim();
            if (!text) { alert('Please write a message!'); return; }
        }

        const dateStr = new Date().toLocaleDateString('en-IN', {
            day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
        });

        try {
            await addDoc(collection(db, 'notifications'), {
                title, type, text, media, caption, dateStr,
                createdAt: new Date(),
                seenCount: 0
            });
            // Clear everyone's dismissed cache so all users see the new notification
            localStorage.removeItem('kolaDismissed');
            alert('✅ Notification published! All users will see it when they open the website.');
            // Reset form
            ['notif-admin-title','notif-admin-text','notif-admin-image',
             'notif-admin-image-caption','notif-admin-video','notif-admin-video-caption'
            ].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
            updateBellBadge();
            renderSavedNotifications();
        } catch(e) {
            alert('Failed to publish: ' + e.message);
        }
    };

    // ── Admin: list all notifications from Firestore ──
    window.renderSavedNotifications = async function() {
        const list = document.getElementById('saved-notif-list');
        if (!list) return;
        list.innerHTML = '<p class="text-gray-600 text-xs text-center py-3 italic">Loading…</p>';
        try {
            const snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')));
            if (snap.empty) {
                list.innerHTML = '<p class="text-gray-600 text-xs text-center py-3 italic">No notifications yet.</p>';
                return;
            }
            const typeIcon = { text:'fa-align-left', image:'fa-image', video:'fa-video', pdf:'fa-file-pdf' };
            const items = [];
            for (const d of snap.docs) {
                const n = d.data();
                // Fetch viewers for this notification
                let viewerNames = [];
                try {
                    const vSnap = await getDocs(query(collection(db, 'notificationViews'), where('notifId', '==', d.id)));
                    vSnap.forEach(vd => viewerNames.push(vd.data().userName || vd.data().userEmail));
                } catch(e) {}
                const seenCount = viewerNames.length;
                items.push(`<div class="saved-notif-item">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                            <i class="fa-solid ${typeIcon[n.type]||'fa-bell'}" style="color:#a78bfa;font-size:10px;"></i>
                            <p style="color:white;font-weight:800;font-size:12px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.title}</p>
                        </div>
                        <p style="color:rgba(107,114,128,1);font-size:10px;margin:0 0 6px;">${(n.type||'text').toUpperCase()} · ${n.dateStr||''}</p>
                        ${n.text ? `<p style="color:rgba(156,163,175,1);font-size:11px;margin:0 0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.text}</p>` : ''}
                        <!-- Viewer tracking -->
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="background:rgba(153,50,201,0.1);border:1px solid rgba(153,50,201,0.2);color:#9932C9;font-size:10px;font-weight:800;border-radius:100px;padding:3px 10px;">
                                <i class="fa-solid fa-eye" style="margin-right:4px;font-size:9px;"></i>${seenCount} seen
                            </span>
                            ${viewerNames.length > 0 ? `
                            <button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'" style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);color:#a78bfa;font-size:10px;font-weight:700;border-radius:100px;padding:3px 10px;cursor:pointer;">
                                <i class="fa-solid fa-users" style="margin-right:4px;font-size:9px;"></i>Who saw it?
                            </button>
                            <div style="display:none;width:100%;margin-top:6px;padding:10px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                                <p style="color:#6b7280;font-size:9px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Viewers (${seenCount})</p>
                                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                                    ${viewerNames.map(n => `<span class="notif-viewer-chip"><i class="fa-solid fa-user" style="font-size:9px;"></i>${n}</span>`).join('')}
                                </div>
                            </div>` : ''}
                        </div>
                    </div>
                    <button onclick="deleteNotification('${d.id}')" style="flex-shrink:0;width:32px;height:32px;border-radius:10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:0.2s;" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>`);
            }
            list.innerHTML = items.join('');
        } catch(e) {
            list.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error: ${e.message}</p>`;
        }
    };

    // ── Bell panel: compute unread count and update badge ──
    window.updateBellBadge = async function() {
        try {
            const dismissed = JSON.parse(localStorage.getItem('kolaDismissed') || '[]');
            const snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')));
            const unread = snap.docs.filter(d => !dismissed.includes(d.id)).length;
            const badge = document.getElementById('notif-bell-badge');
            const label = document.getElementById('bell-unread-label');
            if (badge) {
                if (unread > 0) {
                    badge.textContent = unread > 99 ? '99+' : unread;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
            if (label) {
                if (unread > 0) {
                    label.textContent = unread + ' new';
                    label.style.display = 'inline-block';
                } else {
                    label.style.display = 'none';
                }
            }
        } catch(e) {}
    };

    // ── Bell panel: load notification list ──
    window.loadBellPanelNotifs = async function() {
        const list = document.getElementById('bell-notif-list');
        if (!list) return;
        list.innerHTML = '<p style="color:#6b7280;font-size:12px;text-align:center;padding:24px 0;">Loading…</p>';
        try {
            const dismissed = JSON.parse(localStorage.getItem('kolaDismissed') || '[]');
            const snap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')));
            if (snap.empty) {
                list.innerHTML = '<p style="color:#6b7280;font-size:12px;text-align:center;padding:24px 0;">No notifications yet.</p>';
                return;
            }
            const typeEmoji = { text:'📝', image:'🖼️', video:'🎬', pdf:'📄' };
            list.innerHTML = snap.docs.map(d => {
                const n = d.data();
                const isUnread = !dismissed.includes(d.id);
                return `<div class="bell-notif-item${isUnread?' unread':''}" onclick="viewBellNotif('${d.id}', this)">
                    <p class="bell-notif-title">${typeEmoji[n.type]||'🔔'} ${n.title || 'Notification'}</p>
                    ${n.text ? `<p class="bell-notif-preview">${n.text}</p>` : ''}
                    ${n.media && n.type === 'video' ? `<p class="bell-notif-preview">🎬 Video attached</p>` : ''}
                    ${n.media && n.type === 'image' ? `<p class="bell-notif-preview">🖼️ Image attached</p>` : ''}
                    <div class="bell-notif-meta" style="margin-top:6px;">
                        <span>${n.dateStr || ''}</span>
                        ${isUnread ? '<span style="color:#ef4444;font-weight:800;">● UNREAD</span>' : '<span style="color:#4b5563;">✓ Seen</span>'}
                    </div>
                </div>`;
            }).join('');
        } catch(e) {
            list.innerHTML = `<p style="color:#f87171;font-size:12px;text-align:center;padding:20px;">Error loading.</p>`;
        }
    };

    // ── Bell panel: user taps a notification item → mark read + show popup ──
    window.viewBellNotif = async function(notifId, el) {
        try {
            const docSnap = await getDoc(doc(db, 'notifications', notifId));
            if (!docSnap.exists()) return;
            const notif = { firestoreId: notifId, ...docSnap.data() };
            // Mark as dismissed locally
            const dismissed = JSON.parse(localStorage.getItem('kolaDismissed') || '[]');
            if (!dismissed.includes(notifId)) {
                dismissed.push(notifId);
                localStorage.setItem('kolaDismissed', JSON.stringify(dismissed));
            }
            // Track view
            await trackNotifView(notifId);
            // Update UI
            if (el) { el.classList.remove('unread'); }
            updateBellBadge();
            // Show as popup
            closeBellPanel();
            renderNotificationPopup(notif);
        } catch(e) {}
    };

    // ── Toggle bell panel ──
    window.toggleBellPanel = async function() {
        const panel = document.getElementById('notif-bell-panel');
        const overlay = document.getElementById('notif-bell-overlay');
        if (!panel) return;
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            if (overlay) overlay.style.display = 'block';
            await loadBellPanelNotifs();
        } else {
            closeBellPanel();
        }
    };

    // ── Close bell panel ──
    window.closeBellPanel = function() {
        const panel = document.getElementById('notif-bell-panel');
        const overlay = document.getElementById('notif-bell-overlay');
        if (panel) panel.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
    };

    // ── Delete notification (admin) ──
    window.deleteNotification = async function(id) {
        if (!confirm('Delete this notification?')) return;
        try {
            await deleteDoc(doc(db, 'notifications', id));
            renderSavedNotifications();
            updateBellBadge();
        } catch(e) { alert('Delete failed: ' + e.message); }
    };

    /* ══════════════════════════════════════════════════════════════
       FEEDBACK SYSTEM — Firestore (visible to ALL users & admin)
    ══════════════════════════════════════════════════════════════ */

    window.submitFeedbackLocal = async function() {
        const subject  = document.getElementById('fb-subject').value.trim();
        const rating   = parseInt(document.getElementById('fb-rating-val').value);
        const category = document.getElementById('fb-cat-val').value;
        const message  = document.getElementById('fb-message').value.trim();
        const session  = JSON.parse(localStorage.getItem('kolaSession') || '{}');
        const res      = document.getElementById('fb-result');

        function showMsg(msg, ok) {
            res.textContent = msg;
            res.style.cssText = 'display:block;padding:12px;border-radius:12px;font-size:13px;font-weight:700;text-align:center;'
                + (ok ? 'background:rgba(153,50,201,0.1);color:#9932C9;border:1px solid rgba(153,50,201,0.3)'
                      : 'background:rgba(255,60,60,0.1);color:#ff5555;border:1px solid rgba(255,60,60,0.3)');
            setTimeout(() => res.style.display = 'none', 3500);
        }

        if (!subject) return showMsg('Please select a subject / PDF!', false);
        if (!rating)  return showMsg('Please give a star rating (1-5)!', false);
        if (!message) return showMsg('Please write your feedback message!', false);

        try {
            await addDoc(collection(db, 'feedbacks'), {
                username: session.name || 'Anonymous',
                email:    session.email || '',
                subject, rating, category, message,
                date: new Date().toLocaleDateString('en-IN'),
                createdAt: new Date()
            });
            showMsg('✅ Feedback submitted! Thank you 🙏', true);
            document.getElementById('fb-message').value = '';
            document.getElementById('fb-subject').value = '';
            document.getElementById('fb-rating-val').value = '0';
            document.getElementById('fb-cat-val').value = '';
            document.querySelectorAll('.fb-star').forEach(s => s.classList.remove('lit'));
            document.querySelectorAll('.fb-cat').forEach(b => b.classList.remove('sel'));
            renderPublicFeedback();
        } catch(e) {
            showMsg('Failed to submit: ' + e.message, false);
        }
    };

    window.renderPublicFeedback = async function() {
        const list = document.getElementById('fb-public-list');
        const cnt  = document.getElementById('fb-count');
        if (!list) return;
        list.innerHTML = '<p class="text-gray-500 text-xs text-center py-4 italic">Loading…</p>';
        try {
            const snap = await getDocs(query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'), limit(10)));
            if (cnt) cnt.textContent = snap.size + ' review' + (snap.size !== 1 ? 's' : '');
            if (snap.empty) {
                list.innerHTML = '<p class="text-gray-600 text-xs text-center py-6 italic">No feedback yet. Be the first!</p>';
                return;
            }
            list.innerHTML = snap.docs.map(d => {
                const f = d.data();
                const stars = '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0));
                return `<div class="adfb-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#9932C9);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:white;">${(f.username||'A')[0].toUpperCase()}</div>
                            <div>
                                <p style="color:white;font-weight:800;font-size:13px;margin:0;">${f.username}</p>
                                <p style="color:rgba(107,114,128,1);font-size:10px;margin:0;">${f.subject}${f.category ? ' · ' + f.category : ''}</p>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="color:#ffd700;letter-spacing:2px;font-size:13px;">${stars}</span>
                            <span style="color:rgba(107,114,128,1);font-size:10px;">${f.date}</span>
                        </div>
                    </div>
                    <p style="color:rgba(156,163,175,1);font-size:13px;line-height:1.5;margin:0;">${f.message}</p>
                </div>`;
            }).join('');
        } catch(e) {
            list.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error loading: ${e.message}</p>`;
        }
    };

    window.loadAdminFeedback = async function() {
        const list = document.getElementById('admin-feedback-list');
        if (!list) return;
        list.innerHTML = '<p class="text-gray-600 text-xs text-center py-4 italic">Loading…</p>';
        try {
            const snap = await getDocs(query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc')));
            if (snap.empty) {
                list.innerHTML = '<p class="text-gray-600 text-xs text-center py-4 italic">No feedback yet.</p>';
                return;
            }
            list.innerHTML = snap.docs.map(d => {
                const f = d.data(); const id = d.id;
                const stars = '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0));
                return `<div class="adfb-card">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                        <div>
                            <span style="color:white;font-weight:800;font-size:14px;">${f.username}</span>
                            <span style="color:rgba(107,114,128,1);font-size:11px;margin-left:8px;">${f.email}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="color:#ffd700;letter-spacing:2px;">${stars}</span>
                            <button onclick="deleteFeedbackById('${id}')" style="color:rgba(239,68,68,0.5);background:none;border:none;cursor:pointer;font-size:12px;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                        ${f.subject  ? `<span style="background:rgba(153,50,201,0.1);color:#9932C9;border:1px solid rgba(153,50,201,0.2);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;">${f.subject}</span>` : ''}
                        ${f.category ? `<span style="background:rgba(124,58,237,0.15);color:#a78bfa;border:1px solid rgba(124,58,237,0.2);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;">${f.category}</span>` : ''}
                        <span style="background:rgba(255,255,255,0.05);color:rgba(107,114,128,1);padding:2px 8px;border-radius:20px;font-size:10px;">${f.date}</span>
                    </div>
                    <p style="color:rgba(156,163,175,1);font-size:13px;line-height:1.5;margin:0;">${f.message}</p>
                </div>`;
            }).join('');
        } catch(e) {
            list.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error: ${e.message}</p>`;
        }
    };

    window.deleteFeedbackById = async function(id) {
        if (!confirm('Delete this feedback?')) return;
        try {
            await deleteDoc(doc(db, 'feedbacks', id));
            loadAdminFeedback();
        } catch(e) { alert('Delete failed: ' + e.message); }
    };

    window.exportFeedbackCSV = async function() {
        try {
            const snap = await getDocs(query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc')));
            let csv = 'Username,Email,Subject,Category,Rating,Message,Date\n';
            snap.docs.forEach(d => {
                const f = d.data();
                csv += `"${f.username}","${f.email}","${f.subject}","${f.category||''}","${f.rating}","${(f.message||'').replace(/"/g,"'")}","${f.date}"\n`;
            });
            const a = document.createElement('a');
            a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            a.download = 'KolaBro_Feedback.csv'; a.click();
        } catch(e) { alert('Export failed: ' + e.message); }
    };

    /* ══════════════════════════════════════════════════════════════
       PDF SYSTEM — Firestore (ALL users see the same PDFs)
    ══════════════════════════════════════════════════════════════ */

    window.uploadPDF = async function() {
        const name    = (document.getElementById('pdf-upload-name')?.value || '').trim();
        const subject = (document.getElementById('pdf-upload-subject')?.value || '').trim();
        const link    = (document.getElementById('pdf-drive-link')?.value || '').trim();
        if (!name)    { alert('Please enter a title for this PDF!'); return; }
        if (!subject) { alert('Please select a subject!'); return; }
        if (!link)    { alert('Please paste the Google Drive link!'); return; }
        if (!link.includes('drive.google.com') && !link.startsWith('http')) {
            alert('Please enter a valid Google Drive or web URL!'); return;
        }
        try {
            await addDoc(collection(db, 'pdfs'), {
                name, subject, driveLink: link,
                date: new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}),
                createdAt: new Date()
            });
            // ── Auto-publish a notification for this PDF upload ──
            const dateStr = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
            try {
                await addDoc(collection(db, 'notifications'), {
                    title: `📄 New PDF Added — ${subject}`,
                    type: 'pdf',
                    text: `"${name}" has been uploaded to ${subject}. Tap the bell to view!`,
                    media: '', caption: '',
                    subject: subject,
                    pdfName: name,
                    dateStr,
                    createdAt: new Date(),
                    seenCount: 0
                });
                localStorage.removeItem('kolaDismissed'); // reset so all users see the banner
                updateBellBadge();
            } catch(ne) { console.warn('Auto-notif error:', ne); }
            alert('✅ PDF uploaded! Every user on any device will now see it under ' + subject + '.\n\n🔔 A notification has been sent to all users.');
            document.getElementById('pdf-upload-name').value  = '';
            document.getElementById('pdf-upload-subject').value = '';
            document.getElementById('pdf-drive-link').value  = '';
            renderUploadedPDFs();
        } catch(e) {
            alert('Upload failed: ' + e.message);
        }
    };

    window.renderUploadedPDFs = async function() {
        const list = document.getElementById('uploaded-pdfs-list');
        if (!list) return;
        list.innerHTML = '<p class="text-gray-600 text-xs text-center py-4 italic">Loading…</p>';
        try {
            const snap = await getDocs(query(collection(db, 'pdfs'), orderBy('createdAt', 'desc')));
            if (snap.empty) {
                list.innerHTML = '<p class="text-gray-600 text-xs text-center py-4 italic">No PDFs added yet.</p>';
                return;
            }
            list.innerHTML = snap.docs.map(d => {
                const pdf = d.data();
                return `
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-lg bg-[#9932C9]/10 flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-file-pdf text-[#9932C9] text-xs"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-white font-bold text-xs truncate">${pdf.name}</p>
                            <p class="text-gray-500 text-[10px]">${pdf.subject} · ${pdf.date}</p>
                            <p class="text-[#9932C9]/50 text-[9px] truncate font-mono">${(pdf.driveLink||'').substring(0,45)}…</p>
                        </div>
                    </div>
                    <button onclick="deleteUploadedPDF('${d.id}')" class="text-red-500 hover:text-red-400 transition-all flex-shrink-0 w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>`;
            }).join('');
        } catch(e) {
            list.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Error: ${e.message}</p>`;
        }
    };

    window.deleteUploadedPDF = async function(docId) {
        if (!confirm('Delete this PDF? All users will stop seeing it.')) return;
        try {
            await deleteDoc(doc(db, 'pdfs', docId));
            renderUploadedPDFs();
        } catch(e) { alert('Delete failed: ' + e.message); }
    };

    /* ══════════════════════════════════════════════════════════════
       GALLERY SYSTEM — Firestore
    ══════════════════════════════════════════════════════════════ */

    window.uploadGalleryPhoto = async function() {
        const caption = (document.getElementById('gallery-photo-caption')?.value || '').trim();
        const url     = (document.getElementById('gallery-photo-url')?.value || '').trim();
        if (!url) { alert('Please enter a photo URL!'); return; }
        try {
            await addDoc(collection(db, 'gallery'), {
                caption: caption || 'Photo',
                url,
                date: new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}),
                createdAt: new Date()
            });
            alert('✅ Photo added to gallery! Everyone will see it.');
            document.getElementById('gallery-photo-caption').value = '';
            document.getElementById('gallery-photo-url').value = '';
            renderAdminGallery();
        } catch(e) { alert('Upload failed: ' + e.message); }
    };

    window.renderAdminGallery = async function() {
        const list = document.getElementById('admin-gallery-list');
        if (!list) return;
        list.innerHTML = '<p class="text-gray-600 text-xs text-center py-3 col-span-3 italic">Loading…</p>';
        try {
            const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
            if (snap.empty) { list.innerHTML = '<p class="text-gray-600 text-xs text-center py-3 col-span-3 italic">No photos yet.</p>'; return; }
            list.innerHTML = snap.docs.map(d => {
                const p = d.data();
                return `<div class="relative group">
                    <img src="${p.url}" alt="${p.caption}" class="gallery-img" onerror="this.src='https://drive.google.com/thumbnail?id=1CmuqEEPhVNyLZozJz7xS1RJrL93kZGoy&sz=w800'">
                    <div class="absolute inset-0 bg-black/60 rounded-[20px] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                        <p class="text-white text-[10px] font-bold text-center px-2">${p.caption}</p>
                        <button onclick="deleteGalleryPhoto('${d.id}')" class="text-red-400 text-xs bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-lg"><i class="fa-solid fa-trash mr-1"></i>Delete</button>
                    </div>
                </div>`;
            }).join('');
        } catch(e) { list.innerHTML = `<p class="text-red-400 text-xs text-center py-3 col-span-3">Error: ${e.message}</p>`; }
    };

    window.deleteGalleryPhoto = async function(id) {
        if (!confirm('Delete this photo from gallery?')) return;
        try {
            await deleteDoc(doc(db, 'gallery', id));
            renderAdminGallery();
            loadGalleryPhotos();
        } catch(e) { alert('Delete failed: ' + e.message); }
    };

    window.loadGalleryPhotos = async function() {
        const grid = document.getElementById('gallery-grid');
        if (!grid) return;
        try {
            const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
            // Always keep the original default photo
            let html = `<img src="https://drive.google.com/thumbnail?id=1CmuqEEPhVNyLZozJz7xS1RJrL93kZGoy&sz=w800" class="gallery-img shadow-2xl" alt="KOLA BRO">`;
            snap.forEach(d => {
                const p = d.data();
                html += `<div class="relative group">
                    <img src="${p.url}" alt="${p.caption}" class="gallery-img shadow-2xl" onerror="this.parentElement.style.display='none'">
                    <div class="absolute bottom-0 left-0 right-0 p-2 bg-black/60 rounded-b-[20px] opacity-0 group-hover:opacity-100 transition-all">
                        <p class="text-white text-[10px] font-bold text-center">${p.caption}</p>
                    </div>
                </div>`;
            });
            grid.innerHTML = html;
        } catch(e) { console.warn('Gallery load error:', e); }
    };


    window.openSubject = async (subjectName) => {
        if (subjectName === 'Gallery') { navigateTo('step-gallery'); return; }
        document.getElementById('activeSubjectName').innerText = subjectName;
        navigateTo('step-chapters');
        document.getElementById('chapterGrid').innerHTML =
            '<p class="text-gray-400 text-xs text-center py-8 italic">Loading chapters…</p>';

        // Load PDFs for this subject from Firestore
        let uploadedHTML = '';
        try {
            const snap = await getDocs(query(collection(db, 'pdfs'), orderBy('createdAt', 'desc')));
            snap.forEach(d => {
                const pdf = d.data();
                if (pdf.subject !== subjectName) return;
                const url = pdf.driveLink || '#';
                const safeName = pdf.name.replace(/'/g, '&apos;');
                uploadedHTML += `
                <div class="glass-ui chapter-row card-hover chapter-card-glow p-6 flex items-center justify-between">
                    <div class="flex items-center gap-4" onclick="viewPDF('${url}','${safeName}')" style="flex:1;cursor:pointer;">
                        <div class="w-10 h-10 rounded-xl bg-[#9932C9]/10 flex items-center justify-center font-black text-[#9932C9] text-xs border border-[#9932C9]/20 orbitron">PDF</div>
                        <div>
                            <h4 class="text-white font-bold text-sm">${pdf.name}</h4>
                            <p class="text-gray-500 text-[10px] mt-0.5">${pdf.date || ''}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="event.stopPropagation();openFeedbackFor('${safeName}')" class="text-pink-400 hover:text-pink-300 transition-all text-sm" style="background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.2);border-radius:8px;padding:6px 10px;"><i class="fa-solid fa-comment-dots"></i></button>
                        <div class="text-[#9932C9]" onclick="viewPDF('${url}','${safeName}')" style="cursor:pointer;"><i class="fa-solid fa-file-pdf text-lg"></i></div>
                    </div>
                </div>`;
            });
        } catch(e) { console.warn('PDF load error:', e); }

        if (!uploadedHTML) {
            uploadedHTML = '<p class="text-gray-500 text-sm text-center py-10 col-span-full italic">No chapters uploaded yet for this subject.</p>';
        }
        document.getElementById('chapterGrid').innerHTML = uploadedHTML;
    };

