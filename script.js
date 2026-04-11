// ═══════════════════════════════════════════════════
//  VREZER 2.0 – Vision Your Future | Main Engine
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const dropZone = $('drop-zone'), fileInput = $('file-input');
    const analyseBtn = $('analyse-btn'), fileStatus = $('file-status');
    const modeBtn = $('mode-btn'), exportBtn = $('export-btn');
    const resetBtn = $('reset-btn'), progFill = $('prog-fill');
    const loadMsg = $('load-msg'), ticker = $('ticker');
    const citySel = $('city-sel');
    const uploadSect = $('upload-section'), loadSect = $('loading-section'), dashSect = $('dashboard-section');

    let currentFile = null, charts = {}, lastData = null;
    
    // ── PDF.js Configuration ──────────────────────
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
    // ── Clock ──────────────────────────────────────
    const clockEl = $('live-time');
    const tick = () => { if (clockEl) clockEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
    tick(); setInterval(tick, 1000);

    // ── Particles Canvas ──────────────────────────
    initParticles();

    // ── Theme ─────────────────────────────────────
    document.body.classList.add('dark');
    if (modeBtn) {
        modeBtn.checked = false;
        modeBtn.addEventListener('change', e => {
            document.body.classList.toggle('dark', !e.target.checked);
            document.body.classList.toggle('light', e.target.checked);
            if (lastData && !dashSect.classList.contains('hidden')) rebuildCharts();
        });
    }

    // ── Export ─────────────────────────────────────
    if (exportBtn) exportBtn.onclick = () => window.print();
    const exportBtn2 = $('export-btn2');
    if (exportBtn2) exportBtn2.onclick = () => window.print();
    if (resetBtn) resetBtn.onclick = () => location.reload();

    // ── Drag & Drop ────────────────────────────────
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput && fileInput.click());
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
        dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('over'); handleFile(e.dataTransfer.files[0]); });
    }
    if (fileInput) fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

    function handleFile(file) {
        if (!file) return;
        if (file.type !== 'application/pdf') { alert('Please upload a PDF file.'); return; }
        currentFile = file;
        if (fileStatus) fileStatus.textContent = '✓  ' + file.name + '  (' + (file.size / 1024).toFixed(0) + ' KB)';
        analyseBtn.disabled = false;
        setTicker('Resume loaded: ' + file.name + ' — Click Analyse to get your career intelligence report');
    }

    // ── Analyse ────────────────────────────────────
    if (analyseBtn) analyseBtn.addEventListener('click', runAnalysis);

    async function runAnalysis() {
        if (!currentFile) return;
        show(loadSect); hide(uploadSect, dashSect);
        startProgress();
        const steps = [
            { msg: 'Extracting resume content…', id: 'step-1' },
            { msg: 'Syncing with VREZER CORE engine…', id: 'step-2' },
            { msg: 'Predicting career domains…', id: 'step-3' },
            { msg: 'Mapping regional opportunities…', id: 'step-4' }
        ];
        let si = 0;
        const iv = setInterval(() => {
            if (si < steps.length) {
                if (loadMsg) loadMsg.textContent = steps[si].msg;
                if (si > 0) markDone('step-' + si);
                markActive(steps[si].id);
                si++;
            }
        }, 1800);

        try {
            resetDashboard();
            
            const apiKeyInput = $('api-key-input');
            const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
            if (!apiKey) {
                clearInterval(iv);
                showToast('Please enter your Gemini API Key.', 'fa-solid fa-key');
                setBtnCooldown(analyseBtn, 3000);
                return;
            }

            let extractedText = '';
            try {
                const arrayBuffer = await currentFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let textChunks = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    textChunks.push(content.items.map(it => it.str).join(' '));
                }
                extractedText = textChunks.join('\n');
            } catch (err) {
                clearInterval(iv);
                showToast('Resume extraction failed. Check file format.', 'fa-solid fa-file-exclamation');
                setBtnCooldown(analyseBtn, 5000);
                return;
            }

            if (!extractedText.trim()) throw new Error("No text found in PDF");

            const data = await callGeminiAPI(extractedText, apiKey);

            clearInterval(iv);

            if (data.error) {
                showToast(data.message || 'AI Engine syncing... Regional quota reset.', 'fa-solid fa-sync-alt');
                setBtnCooldown(analyseBtn, 8000);
                return;
            }

            if (progFill) progFill.style.width = '100%';
            markDone('step-4');
            setTimeout(() => { renderDash(data); show(dashSect); hide(loadSect); }, 700);
        } catch (err) {
            console.error('Analysis failed:', err);
            clearInterval(iv);
            showToast('Analysis connection lost. Retrying...', 'fa-solid fa-wifi');
            setTimeout(() => location.reload(), 3000);
        }
    }

    async function callGeminiAPI(resumeText, apiKey) {
        const modelId = "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        
        const prompt = `You are a senior career analyst for the Indian IT industry. Analyse this resume carefully and respond ONLY with valid JSON. Base all predictions on the actual skills, experience, and education found in the resume. 
JSON schema:
{
  "name": "<candidate full name from resume>",
  "role": "<current or most recent role>",
  "bestCity": "<one of: bengaluru, hyderabad, pune, mumbai, noida, chennai, gurgaon, kolkata>",
  "atsScore": <integer 0-100 based on keyword richness and formatting>,
  "summary": "<Compelling 1-sentence career mission statement for a cinematic dashboard>",
  "experience": "<total years of experience e.g. 3 years>",
  "education": "<highest qualification e.g. B.Tech CSE, VIT 2022>",
  "tier1": { "role": "<aspirational role in 3-5 years>", "company": "<top Indian/MNC IT company suitable for this profile>", "salary": "<realistic LPA range e.g. 45-70 LPA>", "city": "<best city in India for this role>", "state": "<state>" },
  "tier2": { "role": "<mid-level realistic role now>", "company": "<mid-tier Indian IT company>", "salary": "<realistic LPA range>", "city": "<city>", "state": "<state>" },
  "tier3": { "role": "<entry or current level role>", "company": "<accessible Indian IT company>", "salary": "<realistic LPA range>", "city": "<city>", "state": "<state>" },
  "topSkills": ["<strength1>", "<strength2>", "<strength3>", "<strength4>"],
  "skillGaps": ["<gap1>", "<gap2>", "<gap3>"],
  "improvements": ["<improvement1>", "<improvement2>", "<improvement3>"],
  "prediction": "<1 sentence prediction of the candidate's career in 5 years based on current trajectory>",
  "domains": [
    { "name": "<domain name e.g. Full Stack Development>", "icon": "<one of: code, cloud, brain, shield, chart-bar, mobile, database, microchip>", "match": <integer 60-100 fit percentage based on resume>, "color": "<one of: violet, blue, green, amber, pink, cyan>", "roles": ["<job role 1>", "<job role 2>", "<job role 3>"] },
    { "name": "<domain 2>", "icon": "<icon>", "match": <match%>, "color": "<color>", "roles": ["<role1>", "<role2>", "<role3>"] }
  ]
}

Resume:
${resumeText.substring(0, 4000)}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
                })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                return { error: true, message: errData.error?.message || 'API Call Failed' };
            }
            
            const data = await res.json();
            const text = data.candidates[0].content.parts[0].text;
            return JSON.parse(text);
        } catch (e) {
            return { error: true, message: e.message };
        }
    }

    function showToast(msg, iconClass) {
        let t = $('res-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'res-toast'; t.className = 'res-toast';
            t.innerHTML = `<i class="${iconClass}"></i> <span id="res-msg"></span>`;
            document.body.appendChild(t);
        }
        const m = $('res-msg'); if (m) m.textContent = msg;
        const i = t.querySelector('i'); if (i) i.className = iconClass + ' res-icon';
        t.classList.add('active');
        setTimeout(() => t.classList.remove('active'), 5000);
    }

    function setBtnCooldown(btn, ms) {
        if (!btn) return;
        btn.disabled = true;
        btn.classList.add('btn-cooldown');
        const originalText = btn.textContent;
        let sec = Math.ceil(ms / 1000);
        const timer = setInterval(() => {
            sec--;
            btn.textContent = `Cooldown (${sec}s)`;
            if (sec <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.classList.remove('btn-cooldown');
                btn.textContent = originalText;
            }
        }, 1000);
    }

    function resetDashboard() {
        // Clear all dossier and SWOT placeholders
        setText('drc-name', '—');
        setText('drc-role', '—');
        setText('ai-prediction', 'Processing new data...');
        setText('drc-exp', '—');
        setText('drc-edu', '—');
        ['swot-strengths', 'swot-weaknesses', 'swot-opps', 'swot-risks'].forEach(id => {
            const el = $(id); if (el) el.innerHTML = '';
        });
        const av = $('drc-avatar'); if (av) av.textContent = '?';
    }

    function startProgress() {
        let p = 0;
        const iv = setInterval(() => {
            p += Math.random() * 5 + 1;
            if (p >= 92) { p = 92; clearInterval(iv); }
            if (progFill) progFill.style.width = p + '%';
        }, 400);
    }

    function markActive(id) { const el = $(id); if (el) { el.classList.add('active'); el.classList.remove('done'); } }
    function markDone(id) { const el = $(id); if (el) { el.classList.add('done'); el.classList.remove('active'); } }

    // ── RENDER DASHBOARD ───────────────────────────
    function renderDash(d) {
        lastData = d;
        const exportBtn = $('export-btn');
        if (exportBtn) exportBtn.style.display = 'flex';
        const name = d.name || 'Candidate';
        const role = d.role || 'Software Professional';
        const ats = Number(d.atsScore) || 0;
        const atsLabel = ats >= 80 ? 'Excellent' : ats >= 65 ? 'Good' : ats >= 50 ? 'Average' : 'Needs Work';

        // ── AI Career Dossier ──
        setText('drc-name', name);
        setText('drc-role', role);
        setText('ai-prediction', d.prediction || 'Strategic trajectory analysis complete.');
        setText('drc-exp', (d.experience || '—') + (d.experience && !d.experience.includes('Year') ? ' Experience' : ''));
        setText('drc-edu', d.education || '—');

        const av = $('drc-avatar');
        if (av) {
            av.textContent = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        }

        const populateSwot = (id, items) => {
            const el = $(id);
            if (!el) return;
            el.innerHTML = '';
            (items || []).slice(0, 4).forEach(it => {
                const s = document.createElement('span');
                s.className = 'sw-tag'; s.textContent = it;
                el.appendChild(s);
            });
        };

        populateSwot('swot-strengths', d.topSkills);
        populateSwot('swot-weaknesses', d.skillGaps);
        populateSwot('swot-risks', d.improvements);

        // Opportunities from Tier 1
        const opps = [];
        if (d.tier1) opps.push(d.tier1.role, d.tier1.company);
        populateSwot('swot-opps', opps);

        setTicker(`Strategic Dossier Compiled · ${name} · ATS ${ats}% · ${atsLabel} · Prediction: ${d.prediction ? d.prediction.substring(0, 60) + '...' : 'Ready'}`);

        countUp('ats-val', ats);
        setText('ats-label', atsLabel);
        makeDonut('ats-chart', ats, 100 - ats, '#E63946', rgba(230, 57, 70, .1));

        // ── Salary Donut ──
        const salStr = (d.tier1 && d.tier1.salary) || '20';
        const salNum = parseInt((salStr.match(/\d+/) || ['20'])[0]);
        setText('sal-val', salStr !== '20' ? salStr : '—');
        const salPct = Math.min(salNum, 120);
        makeDonut('sal-chart', salPct, Math.max(0, 120 - salPct), '#FF8080', rgba(255, 128, 128, .1));

        // ── Tiers ──
        fillTier('t1', d.tier1); fillTier('t2', d.tier2); fillTier('t3', d.tier3);

        // ── Charts ──
        makeRadar(d.topSkills || []);
        makeBar(ats);

        // ── Improvements ──
        const impEl = $('improvements-list');
        if (impEl) {
            impEl.innerHTML = '';
            (d.improvements || []).forEach((imp, i) => {
                const li = document.createElement('li');
                li.innerHTML = `<div class="hint-num">${i + 1}</div><span>${imp}</span>`;
                impEl.appendChild(li);
            });
        }

        // ── Skill Gaps ──
        const gapEl = $('gap-list');
        if (gapEl) {
            gapEl.innerHTML = '';
            (d.skillGaps || []).forEach(g => {
                const tag = document.createElement('span');
                tag.className = 'gap-tag'; tag.textContent = g;
                gapEl.appendChild(tag);
            });
        }

        // ── Domain Grid ──
        renderDomains(d.domains || []);

        // ── Prediction ──
        setText('prediction-text', d.prediction || '—');
        setText('pred-fit', ats >= 75 ? 'Strong' : ats >= 55 ? 'Moderate' : 'Weak');
        setText('pred-growth', d.tier1 && d.tier1.salary ? 'High' : 'Medium');
        setText('pred-ready', ats >= 70 ? 'Yes' : ats >= 50 ? 'Near' : 'Soon');

        // ── Live Feed ──
        startFeed(d);
        setTicker(`Analysis complete · ${name} · ATS: ${ats}% · ${atsLabel} · ${(d.tier1 && d.tier1.role) || '—'} · ${(d.domains || []).length} domains mapped`);

        // Card stagger animation
        document.querySelectorAll('.card,.domain-card').forEach((c, i) => { c.style.animationDelay = (i * 0.05) + 's'; });
    }

    // ── Domain Grid ─────────────────────────────────
    function renderDomains(domains) {
        const grid = $('domain-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!domains.length) { grid.innerHTML = '<div class="domain-placeholder"><i class="fa-solid fa-satellite-dish"></i><span>No domain data available</span></div>'; return; }

        const iconMap = {
            'code': 'fa-solid fa-code',
            'cloud': 'fa-solid fa-cloud',
            'brain': 'fa-solid fa-brain',
            'shield': 'fa-solid fa-shield-halved',
            'chart-bar': 'fa-solid fa-chart-bar',
            'mobile': 'fa-solid fa-mobile-screen',
            'database': 'fa-solid fa-database',
            'microchip': 'fa-solid fa-microchip'
        };

        domains.forEach((dom, idx) => {
            const color = dom.color || 'violet';
            const match = Math.max(0, Math.min(100, Number(dom.match) || 70));
            const iconClass = iconMap[dom.icon] || 'fa-solid fa-code';
            const roles = dom.roles || [];
            const fitLbl = match >= 85 ? 'Excellent Fit' : match >= 70 ? 'Strong Fit' : match >= 55 ? 'Good Fit' : 'Potential Fit';

            // SVG ring maths
            const r = 20, circ = 2 * Math.PI * r;
            const dashOffset = circ - (match / 100) * circ;

            const card = document.createElement('div');
            card.className = `domain-card dc-${color}`;
            card.style.animationDelay = (idx * 0.08) + 's';
            card.innerHTML = `
              <div class="domain-card-glow"></div>
              <div class="domain-header">
                <div class="domain-icon-box"><i class="${iconClass}"></i></div>
                <div class="domain-match-ring">
                  <svg class="domain-match-svg" viewBox="0 0 48 48">
                    <circle class="dmr-bg" cx="24" cy="24" r="${r}" />
                    <circle class="dmr-fill" cx="24" cy="24" r="${r}"
                      stroke-dasharray="${circ.toFixed(2)}"
                      stroke-dashoffset="${circ.toFixed(2)}"
                      id="dmr-${idx}" />
                  </svg>
                  <div class="domain-match-pct">${match}%</div>
                </div>
              </div>
              <div class="domain-name">${dom.name || 'Domain'}</div>
              <div class="domain-fit-label">${fitLbl}</div>
              <div class="domain-bar-track"><div class="domain-bar-fill" style="width:0%" id="dbar-${idx}"></div></div>
              <div class="domain-roles-label">Job Roles You Can Target</div>
              <div class="domain-roles">
                ${roles.map(r => `<div class="domain-role-item"><span class="domain-role-dot"></span>${r}</div>`).join('')}
              </div>`;
            grid.appendChild(card);

            // Animate bar + ring after paint
            setTimeout(() => {
                const bar = $(`dbar-${idx}`);
                if (bar) bar.style.width = match + '%';
                const ring = $(`dmr-${idx}`);
                if (ring) ring.style.strokeDashoffset = dashOffset.toFixed(2);
            }, 300 + idx * 100);
        });
    }

    // ── Fill Tier ──────────────────────────────────
    function fillTier(prefix, tier) {
        if (!tier) return;
        setText(prefix + '-role', tier.role || '—');
        setText(prefix + '-company', tier.company || '—');
        const loc = [tier.city, tier.state].filter(Boolean).join(', ') || '—';
        setText(prefix + '-loc', loc);
        setText(prefix + '-sal', tier.salary || '—');
    }

    // ── Charts ─────────────────────────────────────
    function makeDonut(id, v1, v2, c1, c2) {
        const ctx = $(id); if (!ctx) return;
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [v1, v2], backgroundColor: [c1, c2], borderWidth: 0, borderRadius: 8 }] },
            options: { cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 1400, easing: 'easeOutQuart' } }
        });
    }

    function makeRadar(skills) {
        const ctx = $('radar-chart'); if (!ctx) return;
        if (charts.radar) charts.radar.destroy();
        const isDark = document.body.classList.contains('dark');
        const gc = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const lc = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
        const labels = ['Technical', 'Leadership', 'Comm.', 'Problem Solving', 'Domain'];
        const data = [82, 65, 70, 78, 74].map((v, i) => skills.length > i ? Math.floor(Math.random() * 20 + 65) : v);
        charts.radar = new Chart(ctx, {
            type: 'radar',
            data: { labels, datasets: [{ data, label: 'Skills', backgroundColor: 'rgba(230,57,70,0.15)', borderColor: '#E63946', borderWidth: 2, pointBackgroundColor: '#E63946', pointRadius: 4, pointHoverRadius: 7 }] },
            options: { scales: { r: { min: 0, max: 100, grid: { color: gc }, angleLines: { color: gc }, pointLabels: { color: lc, font: { size: 9, family: 'Inter' } }, ticks: { display: false } } }, plugins: { legend: { display: false } }, animation: { duration: 1400 } }
        });
    }

    function makeBar(ats) {
        const ctx = $('bar-chart'); if (!ctx) return;
        if (charts.bar) charts.bar.destroy();
        const isDark = document.body.classList.contains('dark');
        const gc = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
        const lc = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
        const labels = ['ATS Match', 'Keywords', 'Format', 'Experience', 'Skills', 'Growth'];
        const data = [ats, Math.min(ats + 5, 100), Math.max(ats - 5, 20), Math.min(ats + 8, 100), Math.max(ats - 3, 20), Math.min(ats + 2, 100)];
        const barColors = ['#E63946', '#FF6B6B', '#FF8080', '#C41E3A', '#FF4D5E', '#FFA0A0'];
        charts.bar = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ data, label: 'Score', backgroundColor: barColors, borderRadius: 6, borderWidth: 0, barPercentage: .65 }] },
            options: { indexAxis: 'y', scales: { x: { min: 0, max: 100, grid: { color: gc }, ticks: { color: lc, font: { size: 9 } } }, y: { grid: { display: false }, ticks: { color: lc, font: { size: 9 } } } }, plugins: { legend: { display: false } }, animation: { duration: 1400 } }
        });
    }

    function rebuildCharts() {
        if (!lastData) return;
        const ats = Number(lastData.atsScore) || 0;
        makeDonut('ats-chart', ats, 100 - ats, '#E63946', rgba(230, 57, 70, .1));
        const salStr = (lastData.tier1 && lastData.tier1.salary) || '20';
        const salNum = parseInt((salStr.match(/\d+/) || ['20'])[0]);
        makeDonut('sal-chart', Math.min(salNum, 120), Math.max(0, 120 - salNum), '#FF8080', rgba(255, 128, 128, .1));
        makeRadar(lastData.topSkills || []);
        makeBar(ats);
    }

    // ── Location Hub ───────────────────────────────
    const cityData = {
        bengaluru: { range: '45–90 LPA', companies: ['Infosys', 'Wipro', 'Google', 'Amazon', 'Flipkart', 'Microsoft', 'Accenture', 'IBM'] },
        hyderabad: { range: '35–75 LPA', companies: ['TCS', 'Cognizant', 'Microsoft', 'Apple', 'Amazon', 'Deloitte', 'Capgemini', 'KPMG'] },
        pune: { range: '30–60 LPA', companies: ['Persistent', 'Zensar', 'Infosys', 'TCS', 'Wipro', 'Tech Mahindra', 'Cognizant', 'LTI'] },
        mumbai: { range: '40–80 LPA', companies: ['JP Morgan', 'Morgan Stanley', 'Tata Group', 'Accenture', 'Deloitte', 'PwC', 'EY', 'HSBC'] },
        noida: { range: '25–50 LPA', companies: ['HCL', 'Adobe', 'Samsung', 'Paytm', 'Genpact', 'Mphasis', 'Newgen', 'Nucleus'] },
        chennai: { range: '28–55 LPA', companies: ['Zoho', 'Freshworks', 'Cognizant', 'TCS', 'Infosys', 'Capgemini', 'Hexaware', 'Mphasis'] },
        gurgaon: { range: '30–65 LPA', companies: ['Makemytrip', 'BCG', 'McKinsey', 'Oracle', 'AmEx', 'EXL', 'WNS', 'Genpact'] },
        kolkata: { range: '18–40 LPA', companies: ['ITC Infotech', 'TCS', 'Infosys', 'Wipro', 'Mphasis', 'Cognizant', 'Technostacks', 'EXL'] }
    };
    if (citySel) {
        citySel.addEventListener('change', () => {
            const c = citySel.value;
            const container = $('loc-companies');
            if (!c || !container || !cityData[c]) return;
            const info = cityData[c];
            container.innerHTML = `<div style="font-size:.62rem;color:var(--b);font-weight:700;margin-bottom:7px;letter-spacing:1px;">SALARY RANGE: ${info.range}</div><div class="loc-company-grid">${info.companies.map(x => `<span class="loc-chip">${x}</span>`).join('')}</div>`;
        });
    }

    // ── Live Feed ──────────────────────────────────
    function startFeed(d) {
        const feedEl = $('activity-feed'); if (!feedEl) return;
        feedEl.innerHTML = '';
        const items = [
            `✅ ATS Score: ${d.atsScore}%`,
            `🎯 Best Fit: ${(d.tier1 && d.tier1.role) || '—'}`,
            `📍 Top City: ${(d.tier1 && d.tier1.city) || '—'}`,
            `⚠️ ${(d.skillGaps || []).length} skill gaps detected`,
            `💡 ${(d.topSkills || []).length} strengths identified`,
            `🧭 ${(d.domains || []).length} career domains mapped`
        ];
        items.forEach((text, i) => setTimeout(() => {
            const row = document.createElement('div');
            row.className = 'feed-row';
            row.innerHTML = `<div class="feed-dot"></div><span>${text}</span>`;
            feedEl.prepend(row);
            if (feedEl.children.length > 5) feedEl.removeChild(feedEl.lastChild);
        }, i * 500));
        const live = ['🔄 Market data refreshed', '🤖 AI model updated', '📊 New IT roles scanned', '💰 Salary benchmarks synced'];
        let li = 0;
        setInterval(() => {
            const row = document.createElement('div');
            row.className = 'feed-row';
            row.innerHTML = `<div class="feed-dot"></div><span>${live[li++ % live.length]}</span>`;
            feedEl.prepend(row);
            if (feedEl.children.length > 5) feedEl.removeChild(feedEl.lastChild);
        }, 5000);
    }

    // ── Particles (Hero BG) ────────────────────────
    function initParticles() {
        const canvas = $('particles-canvas'); if (!canvas) return;
        const ctx2 = canvas.getContext('2d');
        let W, H, pts = [];
        function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
        window.addEventListener('resize', resize); resize();
        for (let i = 0; i < 60; i++) pts.push({ x: Math.random() * 1400, y: Math.random() * 900, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 2 + .5 });
        function frame() {
            ctx2.clearRect(0, 0, W, H);
            const isDark = document.body.classList.contains('dark');
            const dotClr = isDark ? 'rgba(230,57,70,.6)' : 'rgba(196,30,58,.4)';
            const lineClr = isDark ? 'rgba(230,57,70,.12)' : 'rgba(196,30,58,.08)';
            pts.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > W) p.vx *= -1;
                if (p.y < 0 || p.y > H) p.vy *= -1;
                ctx2.beginPath(); ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx2.fillStyle = dotClr; ctx2.fill();
                pts.forEach(q => {
                    const dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 120) { ctx2.beginPath(); ctx2.moveTo(p.x, p.y); ctx2.lineTo(q.x, q.y); ctx2.strokeStyle = lineClr; ctx2.lineWidth = .5; ctx2.stroke(); }
                });
            });
            requestAnimationFrame(frame);
        }
        frame();
    }

    // ── Utilities ──────────────────────────────────
    function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }
    function setText(id, val) { const el = $(id); if (el) el.textContent = val; }
    function setTicker(msg) { if (ticker) ticker.textContent = msg.toUpperCase(); }
    function show(el) { if (el) el.classList.remove('hidden'); }
    function hide(...els) { els.forEach(el => el && el.classList.add('hidden')); }
    function countUp(id, target) {
        const el = $(id); if (!el) return;
        let c = 0;
        const speed = Math.max(10, 1000 / target);
        const iv = setInterval(() => { c = Math.min(c + Math.ceil(target / 40), target); el.textContent = c; if (c >= target) clearInterval(iv); }, speed);
    }
});
