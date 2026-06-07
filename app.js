// Career Data Configuration
let careers = [];

// State Management
const state = {
    prefs: {
        social: 20,
        salary: 30,
        difficulty: 50,
        wlb: 80,
        quality: 80,
        travel: 20
    },
    matches: []
};

// DOM Elements
const els = {
    sliders: document.querySelectorAll('.slider'),
    socialValue: document.getElementById('socialValue'),
    salaryValue: document.getElementById('salaryValue'),
    difficultyValue: document.getElementById('difficultyValue'),
    wlbValue: document.getElementById('wlbValue'),
    qualityValue: document.getElementById('qualityValue'),
    travelValue: document.getElementById('travelValue'),
    careerCards: document.getElementById('careerCards'),
    salaryChart: document.getElementById('salaryChart'),
    tableBody: document.getElementById('tableBody'),
    radarSelect1: document.getElementById('radarSelect1'),
    radarSelect2: document.getElementById('radarSelect2'),
    radarCanvas: document.getElementById('radarCanvas'),
    radarLegend: document.getElementById('radarLegend'),
    detailsAccordion: document.getElementById('detailsAccordion')
};

// Initialize
async function init() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        careers = data.careers;
        
        setupEventListeners();
        populateSelects();
        updateAnalysis();
    } catch (error) {
        console.error('Failed to load career data:', error);
        els.careerCards.innerHTML = '<p style="color:var(--accent-4)">数据加载失败，请确保您通过 HTTP 服务器运行此页面，而不是直接打开本地文件。</p>';
    }
}

// Event Listeners
function setupEventListeners() {
    els.sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const id = e.target.id.replace('Pref', '');
            state.prefs[id] = parseInt(e.target.value);
            
            // Update display value
            const valEl = document.getElementById(`${id}Value`);
            if (id === 'salary') {
                valEl.textContent = `${state.prefs[id]}万`;
            } else {
                valEl.textContent = `${state.prefs[id]}%`;
            }
            
            // Debounce update
            clearTimeout(window.updateTimeout);
            window.updateTimeout = setTimeout(updateAnalysis, 50);
        });
    });

    els.radarSelect1.addEventListener('change', drawRadarChart);
    els.radarSelect2.addEventListener('change', drawRadarChart);

    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortBy = th.dataset.sort;
            sortAndRenderTable(sortBy);
        });
    });
}

// Core Matching Algorithm
function calculateMatchScore(career, prefs) {
    let score = 0;
    const maxScore = 600; // 6 dimensions * 100

    // Inverse match for social & travel (lower preference = penalize high requirement)
    const socialDiff = Math.abs(career.attributes.social - prefs.social);
    const travelDiff = Math.abs(career.attributes.travel - prefs.travel);
    
    // Direct match for quality & wlb
    const qualityDiff = Math.abs(career.attributes.quality - prefs.quality);
    const wlbDiff = Math.abs(career.attributes.wlb - prefs.wlb);
    
    // Difficulty acceptance (if user diff pref is low, penalize high diff careers)
    let diffPenalty = 0;
    if (prefs.difficulty < career.attributes.difficulty) {
        diffPenalty = (career.attributes.difficulty - prefs.difficulty) * 1.5;
    }

    // Salary (if median salary is way below expectation, penalize)
    let salaryPenalty = 0;
    if (career.salaryMedian < prefs.salary) {
        salaryPenalty = ((prefs.salary - career.salaryMedian) / prefs.salary) * 100;
    } else if (career.salaryMax > prefs.salary) {
        // Bonus for meeting/exceeding salary
        score += 20;
    }

    const totalDiff = socialDiff * 1.2 + travelDiff * 1.2 + qualityDiff + wlbDiff + diffPenalty + salaryPenalty;
    
    // Normalize to percentage
    let matchPercentage = Math.round(100 - (totalDiff / maxScore * 100) * 1.5);
    return Math.max(15, Math.min(99, matchPercentage)); // Cap between 15% and 99%
}

function updateAnalysis() {
    // Calculate matches
    state.matches = careers.map(c => ({
        ...c,
        matchScore: calculateMatchScore(c, state.prefs)
    })).sort((a, b) => b.matchScore - a.matchScore);

    renderCards();
    renderSalaryChart();
    renderTable();
    renderAccordion();
    
    // Auto update radar if not manually selected
    if (!els.radarSelect1.dataset.manual) {
        els.radarSelect1.value = state.matches[0].id;
        els.radarSelect2.value = state.matches[1].id;
        drawRadarChart();
    }
}

// Renderers
function renderCards() {
    els.careerCards.innerHTML = state.matches.slice(0, 3).map((c, idx) => `
        <div class="career-card" style="animation-delay: ${idx * 0.1}s">
            <div class="card-header">
                <span class="card-rank ${idx === 0 ? 'top-3' : ''}">推荐 #${idx + 1}</span>
                <span class="card-match">${c.matchScore}% 匹配</span>
            </div>
            <h3>${c.name}</h3>
            <p class="card-subtitle">${c.description.substring(0, 50)}...</p>
            <div class="card-tags">
                ${c.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}
            </div>
            <div class="card-metrics">
                <div class="metric">
                    <div class="metric-value">${c.salaryMedian}W</div>
                    <div class="metric-label">中位年薪</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${c.attributes.wlb}%</div>
                    <div class="metric-label">WLB指数</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${c.attributes.social}%</div>
                    <div class="metric-label">社交需求</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderSalaryChart() {
    const maxGlobalSalary = Math.max(...careers.map(c => c.salaryMax));
    
    els.salaryChart.innerHTML = state.matches.map(c => {
        const minPercent = (c.salaryMin / maxGlobalSalary) * 100;
        const widthPercent = ((c.salaryMax - c.salaryMin) / maxGlobalSalary) * 100;
        const medianPercent = ((c.salaryMedian - c.salaryMin) / (c.salaryMax - c.salaryMin)) * 100;

        return `
            <div class="salary-bar-row">
                <div class="salary-label">${c.name}</div>
                <div class="salary-bar-container">
                    <div class="salary-bar min-bar" style="left: 0; width: ${minPercent}%; justify-content: center;">${c.salaryMin}w</div>
                    <div class="salary-bar max-bar" style="left: ${minPercent}%; width: ${widthPercent}%;">
                        <div style="position: absolute; left: ${medianPercent}%; width: 2px; height: 100%; background: #fff; box-shadow: 0 0 4px #000; z-index: 2;"></div>
                        ${c.salaryMax}w
                    </div>
                </div>
            </div>
        `;
    }).join('') + `
        <div class="salary-scale">
            <span>0</span>
            <span>中位数标志 (竖线)</span>
            <span>${maxGlobalSalary}w</span>
        </div>
    `;
}

function getLevelDots(value) {
    const level = Math.ceil(value / 20); // 1-5 scale
    let html = '';
    for(let i=1; i<=5; i++) {
        let activeClass = i <= level ? 'active' : '';
        if(i <= level && value >= 80) activeClass += ' high';
        if(i <= level && value <= 30) activeClass += ' low';
        html += `<div class="level-dot ${activeClass}"></div>`;
    }
    return html;
}

function renderTable(data = state.matches) {
    els.tableBody.innerHTML = data.map(c => `
        <tr>
            <td style="font-weight: 600; color: #fff;">${c.name}</td>
            <td><div class="level-indicator">${getLevelDots(c.attributes.social)}</div></td>
            <td style="color: var(--accent-3); font-weight: 600;">${c.salaryMedian}W</td>
            <td><div class="level-indicator">${getLevelDots(c.attributes.difficulty)}</div></td>
            <td><div class="level-indicator">${getLevelDots(c.attributes.wlb)}</div></td>
            <td><div class="level-indicator">${getLevelDots(c.attributes.quality)}</div></td>
            <td><div class="level-indicator">${getLevelDots(c.attributes.travel)}</div></td>
            <td><div class="level-indicator">${getLevelDots(c.attributes.growth)}</div></td>
        </tr>
    `).join('');
}

let sortDir = 1;
function sortAndRenderTable(key) {
    sortDir *= -1;
    const sorted = [...state.matches].sort((a, b) => {
        let valA, valB;
        if(key === 'name') {
            return a.name.localeCompare(b.name) * sortDir;
        } else if(key === 'salary') {
            valA = a.salaryMedian;
            valB = b.salaryMedian;
        } else {
            valA = a.attributes[key];
            valB = b.attributes[key];
        }
        return (valA - valB) * sortDir;
    });
    renderTable(sorted);
}

// Radar Chart (Custom Canvas Implementation)
function populateSelects() {
    const options = careers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    els.radarSelect1.innerHTML = options;
    els.radarSelect2.innerHTML = options;
    els.radarSelect1.addEventListener('change', () => els.radarSelect1.dataset.manual = 'true');
}

function drawRadarChart() {
    const ctx = els.radarCanvas.getContext('2d');
    const width = els.radarCanvas.width;
    const height = els.radarCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    
    ctx.clearRect(0, 0, width, height);
    
    const labels = ['社交需求', '入行难度', 'WLB指数', '人群素质', '出差频率', '成长潜力'];
    const keys = ['social', 'difficulty', 'wlb', 'quality', 'travel', 'growth'];
    const sides = labels.length;
    const angleStep = (Math.PI * 2) / sides;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(130, 140, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let step = 1; step <= 5; step++) {
        const r = radius * (step / 5);
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Draw axes & labels
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        // Axis
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.stroke();
        
        // Label
        const labelR = radius + 20;
        const x = centerX + Math.cos(angle) * labelR;
        const y = centerY + Math.sin(angle) * labelR;
        ctx.fillStyle = '#9d9db8';
        ctx.fillText(labels[i], x, y);
    }
    
    // Draw Data
    const c1 = careers.find(c => c.id === els.radarSelect1.value);
    const c2 = careers.find(c => c.id === els.radarSelect2.value);
    
    drawRadarPolygon(ctx, c1, keys, centerX, centerY, radius, angleStep, 'rgba(129, 140, 248, 0.5)', '#818cf8');
    if (c1.id !== c2.id) {
        drawRadarPolygon(ctx, c2, keys, centerX, centerY, radius, angleStep, 'rgba(192, 132, 252, 0.5)', '#c084fc');
    }
    
    // Legend
    els.radarLegend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background: #818cf8"></div>
            <span>${c1.name}</span>
        </div>
        ${c1.id !== c2.id ? `
        <div class="legend-item">
            <div class="legend-color" style="background: #c084fc"></div>
            <span>${c2.name}</span>
        </div>` : ''}
    `;
}

function drawRadarPolygon(ctx, career, keys, cx, cy, maxR, angleStep, fill, stroke) {
    ctx.beginPath();
    keys.forEach((key, i) => {
        const val = career.attributes[key];
        const r = maxR * (val / 100);
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Dots
    keys.forEach((key, i) => {
        const val = career.attributes[key];
        const r = maxR * (val / 100);
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = stroke;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Accordion
function renderAccordion() {
    els.detailsAccordion.innerHTML = state.matches.map((c, idx) => `
        <div class="accordion-item ${idx === 0 ? 'open' : ''}">
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                <h3>${c.name}</h3>
                <svg class="accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="accordion-body">
                <div class="accordion-content">
                    <p>${c.description}</p>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="label">核心工作</div>
                            <div class="value">${c.details.core}</div>
                        </div>
                        <div class="info-item">
                            <div class="label">薪资预期</div>
                            <div class="value">${c.details.salary}</div>
                        </div>
                        <div class="info-item">
                            <div class="label">入行门槛</div>
                            <div class="value">${c.details.requirement}</div>
                        </div>
                    </div>

                    <h4>优势 (Pros)</h4>
                    <ul>
                        ${c.pros.map(p => `<li>${p}</li>`).join('')}
                    </ul>

                    <h4>挑战 (Cons)</h4>
                    <ul>
                        ${c.cons.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `).join('');
}

// Run
init();
