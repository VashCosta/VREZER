// ═══════════════════════════════════════════════════════════════════
//  VREZER – Vision Your Future Engine [STANDARD ENGLISH SYNC]
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const get = (id) => document.getElementById(id);

    const dropZone      = get('drop-zone');
    const fileInput     = get('file-input');
    const igniteBtn     = get('ignite-btn');
    const fileNameNode  = get('file-name');
    const themeToggle   = get('theme-toggle');
    const copyBtn       = get('copy-btn');

    const portalSection = get('portal-section');
    const loadingSection = get('loading-section');
    const dashboardSection = get('dashboard-section');

    const stateSelect   = get('state-select');
    const citySelect    = get('city-select');

    if (!dropZone || !igniteBtn) return;

    let currentFile = null;

    // ─── Theme Shift Logic ──────────────────────────────
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            document.body.classList.toggle('light-theme', !e.target.checked);
        });
    }

    if (copyBtn) copyBtn.onclick = () => {
        window.print();
        console.log('VREZER: Dossier Copy Finalised.');
    };

    // ─── Regional Predictor Interaction ─────────────────
    [stateSelect, citySelect].forEach(sel => {
        if (sel) sel.onchange = () => {
            if (stateSelect.value && citySelect.value) {
                console.log(`VREZER: Regional Focus Shifted to ${citySelect.value}, ${stateSelect.value}`);
                // In a real scenario, this could trigger a re-analysis for that hub.
            }
        };
    });

    // ─── Drag & Drop Interactivity ──────────────────────
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        dropZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
    });

    dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
    if (fileInput) fileInput.addEventListener('change', function() { handleFiles(this.files); });

    function handleFiles(files) {
        if (!files.length) return;
        const f = files[0];
        if (f.type !== 'application/pdf') { alert('Vision Alert: PDF Dossier Required'); return; }
        currentFile = f;
        if (fileNameNode) fileNameNode.textContent = 'DOSSIER DETECTED: ' + f.name.toUpperCase();
        igniteBtn.disabled = false;
        igniteBtn.style.opacity = '1';
    }

    // ─── Career Tier Synthesis ──────────────────────────
    igniteBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        show(loadingSection);
        hide(portalSection, dashboardSection);

        try {
            const fd = new FormData(); fd.append('file', currentFile);
            const exRes = await fetch('/api/analyzer/extract', { method: 'POST', body: fd });
            const exJson = await exRes.json();
            
            const anRes = await fetch('/api/analyzer/analyze', { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain' }, 
                body: exJson.text 
            });
            const data = await anRes.json();

            // Ignite Vision Dashboard
            renderVision(data);
            setTimeout(() => {
                show(dashboardSection);
                hide(loadingSection);
            }, 2500);

        } catch (err) {
            console.error('VREZER Vision Latency:', err);
            location.reload(); 
        }
    });

    function renderVision(data) {
        // ATS Rank
        if (get('ats-score')) animateNumber('ats-score', data.atsScore || 0);

        // Tier Mapping (Horizontal Cards) - FIXED SYNC
        mapTier('tier-1-card', data.tier1);
        mapTier('tier-2-card', data.tier2);
        mapTier('tier-3-card', data.tier3);

        // Predictive Oracle
        if (get('prediction-text')) get('prediction-text').textContent = data.careerPredictor || "Dossier Synthesised Successfully.";
        
        const roadMap = get('roadmap-list');
        if (roadMap) {
            roadMap.innerHTML = '';
            (data.improvementRoadmap || []).forEach(step => {
                const node = document.createElement('div');
                node.style.borderLeft = '2px solid var(--fg)';
                node.style.paddingLeft = '20px';
                node.innerHTML = `<label style="font-size:0.5rem; letter-spacing:2px; opacity:0.4;">OPTIMISATION STEP</label><p style="font-weight:900;">${step}</p>`;
                roadMap.appendChild(node);
            });
        }
    }

    function mapTier(cardId, tierData) {
        const card = get(cardId); if (!card || !tierData) return;
        
        // Role & Info Sync
        if (card.querySelector('.tier-role')) card.querySelector('.tier-role').textContent = tierData.role || "Professional Node";
        if (card.querySelector('.t-company')) card.querySelector('.t-company').textContent = tierData.company || "Elite Entity";
        if (card.querySelector('.t-salary')) card.querySelector('.t-salary').textContent = tierData.salary || "Competitive LPA";
        
        // Location Hub Sync
        if (card.querySelector('.t-location')) {
            const loc = (tierData.city && tierData.state) ? `${tierData.city.toUpperCase()}, ${tierData.state.toUpperCase()}` : "PREDICTED HUB";
            card.querySelector('.t-location').textContent = loc;
        }
    }

    function animateNumber(id, target) {
        const el = get(id); if (!el) return;
        let start = 0; const tm = setInterval(() => { start++; if (start >= target) { start=target; clearInterval(tm); } el.textContent = start; }, 20);
    }

    function show(el) { if (el) el.classList.remove('hidden'); }
    function hide(...els) { els.forEach(el => el && el.classList.add('hidden')); }
});
