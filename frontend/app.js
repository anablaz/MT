const API_REGIJE = 'http://127.0.0.1:5000/covid_regije';
const API_STAROST = 'http://127.0.0.1:5000/covid_starost';
const API_STATS_WEEKLY = 'http://127.0.0.1:5000/stats_weekly';

let globalFilters = {
    obdobje: 'all',
    granulacija: 'month'
};

let rawDataRegije = [];
let rawDataStarost = [];
let rawDataStatsWeekly = [];

function fixSumniki(text) {
    if (!text) return text;
    return text
        .replace(/Gori�ka/g, 'Goriška')
        .replace(/Koro�ka/g, 'Koroška')
        .replace(/Obalno-kra�ka/g, 'Obalno-kraška');
}

const COLORS = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    tertiary: '#a78bfa',
    quaternary: '#c4b5fd',
    text: '#a0a0a8',
    textMuted: '#5c5c66',
    grid: 'rgba(255, 255, 255, 0.06)'
};

function filterByObdobje(data, dateField = 'Datum_cepljenja') {
    if (globalFilters.obdobje === 'all') return data;
    return data.filter(d => {
        const datum = d[dateField];
        if (!datum) return false;
        return datum.startsWith(globalFilters.obdobje);
    });
}

function filterByObdobjeWeekly(data) {
    if (globalFilters.obdobje === 'all') return data;
    return data.filter(d => {
        const year = d.year || (d.week ? d.week.substring(0, 4) : null);
        return year && year.toString() === globalFilters.obdobje;
    });
}

function getDateKey(datum, granulacija) {
    if (!datum) return null;
    switch (granulacija) {
        case 'day':
            return datum;
        case 'month':
            return datum.substring(0, 7);
        case 'year':
            return datum.substring(0, 4);
        default:
            return datum.substring(0, 7);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const landing = document.getElementById('landing');
    const startBtn = document.getElementById('start-exploring');
    const mainHeader = document.getElementById('main-header');
    const filtersSection = document.getElementById('filters-section');
    const tabsSection = document.getElementById('tabs-section');
    const mainContent = document.getElementById('main-content');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            landing.classList.add('hidden');
            mainHeader.scrollIntoView({ behavior: 'smooth' });
        });
    }

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Funkcija za posodobitev opcij obdobja glede na tab
    function updateObdobjeOptions(tabId) {
        const obdobjeSelect = document.getElementById('filter-obdobje');
        let options = '';
        
        if (tabId === 'pandemija') {
            // Pandemija: 2020-2023
            options = `
                <option value="all">Vse</option>
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
            `;
        } else {
            // Cepljenja (zemljevid, kombinirano, timeline): 2023-2025
            options = `
                <option value="all">Vse</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
            `;
        }
        obdobjeSelect.innerHTML = options;
    }
    
    // Nastavi začetne opcije za pandemija tab
    updateObdobjeOptions('pandemija');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });
            
            // Posodobi opcije obdobja glede na tab
            updateObdobjeOptions(targetId);
            
            // Skrij filtre za timeline tab (ima svoj slider)
            const filtersSection = document.getElementById('filters-section');
            if (targetId === 'timeline') {
                filtersSection.style.display = 'none';
            } else {
                filtersSection.style.display = 'flex';
            }
            
            const granulacijaGroup = document.getElementById('filter-granulacija').closest('.filter-group');
            granulacijaGroup.style.display = 'none';
            
            // Osveži Leaflet zemljevid ko se tab prikaže
            if (targetId === 'zemljevid' && leafletMap) {
                setTimeout(() => {
                    leafletMap.invalidateSize();
                }, 100);
            }
        });
    });

    document.getElementById('filter-granulacija').closest('.filter-group').style.display = 'none';

    const filterApply = document.getElementById('filter-apply');
    filterApply.addEventListener('click', applyFilters);

    loadAllData();
});

function applyFilters() {
    globalFilters.obdobje = document.getElementById('filter-obdobje').value;
    globalFilters.granulacija = document.getElementById('filter-granulacija').value;
    
    console.log('Applying filters:', globalFilters);
    renderAllCharts();
}

function loadAllData() {
    fetch(API_REGIJE)
        .then(response => response.json())
        .then(raw => {
            rawDataRegije = raw.data || [];
            console.log('Loaded regije data:', rawDataRegije.length, 'records');
            updateLandingStats();
        })
        .catch(err => console.error('Error loading regije:', err));

    fetch(API_STAROST)
        .then(response => response.json())
        .then(raw => {
            rawDataStarost = raw.data || [];
            console.log('Loaded starost data:', rawDataStarost.length, 'records');
        })
        .catch(err => console.error('Error loading starost:', err));

    fetch(API_STATS_WEEKLY)
        .then(response => response.json())
        .then(raw => {
            rawDataStatsWeekly = raw.data || [];
            console.log('Loaded stats weekly:', rawDataStatsWeekly.length, 'records');
            updateLandingStats();
        })
        .catch(err => console.error('Error loading stats weekly:', err));

    setTimeout(renderAllCharts, 500);
}

function updateLandingStats() {
    const statOkuzbe = document.getElementById('stat-okuzbe');
    const statCepljenja = document.getElementById('stat-cepljenja');
    
    if (rawDataStatsWeekly.length > 0 && statOkuzbe) {
        const totalOkuzbe = rawDataStatsWeekly.reduce((sum, d) => sum + (d.confirmed || 0), 0);
        statOkuzbe.textContent = totalOkuzbe.toLocaleString('sl-SI');
    }
    
    if (rawDataRegije.length > 0 && statCepljenja) {
        const totalCepljenja = rawDataRegije.reduce((sum, d) => sum + (d.St_cepljenj || 0), 0);
        statCepljenja.textContent = totalCepljenja.toLocaleString('sl-SI');
    }
}

function renderAllCharts() {
    renderPandemijaChart();
    renderRegijeChart();
    renderZemljevidChart();
    renderStarostChart();
    renderKombiniranoChart();
    renderPresekChart();
    renderTimelineChart();
}

function createTooltip() {
    let tooltip = document.querySelector('.tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function showTooltip(tooltip, event, label, value) {
    tooltip.innerHTML = `
        <div class="tooltip-label">${label}</div>
        <div class="tooltip-value">${value.toLocaleString('sl-SI')}</div>
    `;
    tooltip.classList.add('visible');
    tooltip.style.left = (event.pageX + 15) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip(tooltip) {
    tooltip.classList.remove('visible');
}

function showError(selector, message) {
    const svg = d3.select(selector);
    svg.selectAll('*').remove();
    svg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('fill', COLORS.textMuted)
        .style('font-size', '14px')
        .text(message);
}

function renderPandemijaChart() {
    const weeklyData = filterByObdobjeWeekly(rawDataStatsWeekly);
    
    const processed = weeklyData.map(d => ({
        week: d.week,
        confirmed: d.confirmed || 0,
        healthcare: d.healthcare || 0
    })).filter(d => d.week).sort((a, b) => a.week.localeCompare(b.week));
    
    console.log('PANDEMIJA processed:', processed.length);
    drawMultiAreaChart('#graf-pandemija', processed);
}

function renderRegijeChart() {
    const filtered = filterByObdobje(rawDataRegije).filter(d => d.Statisticna_regija);
    
    const aggregated = {};
    filtered.forEach(d => {
        const regija = fixSumniki(d.Statisticna_regija);
        const vrednost = d.St_cepljenj || 0;
        aggregated[regija] = (aggregated[regija] || 0) + vrednost;
    });

    const processed = Object.entries(aggregated).map(([regija, vrednost]) => ({
        regija,
        vrednost
    })).sort((a, b) => b.vrednost - a.vrednost);

    console.log('REGIJE processed:', processed.length);
    drawBarChart('#graf-regije', processed, 'regija', 'vrednost', { width: 900, height: 450 });
}

function renderStarostChart() {
    const filtered = filterByObdobje(rawDataStarost);
    
    const aggregated = {};
    filtered.forEach(d => {
        const starost = fixSumniki(d.Starostni_razred || d.Starostna_skupina || d.starost || 'Neznano');
        const vrednost = d.st_cepljenj || d.St_cepljenj || d.stevilo || 0;
        if (starost && starost !== 'Neznano') {
            aggregated[starost] = (aggregated[starost] || 0) + vrednost;
        }
    });

    const processed = Object.entries(aggregated).map(([starost, vrednost]) => ({
        starost,
        vrednost
    }));

    console.log('STAROST processed:', processed.length);
    drawBarChart('#graf-starost', processed, 'starost', 'vrednost', { width: 900, height: 450 });
}

function renderKombiniranoChart() {
    const filtered = filterByObdobje(rawDataStarost);
    
    const aggregated = {};
    filtered.forEach(d => {
        let starost = fixSumniki(d.Starostni_razred || d.Starostna_skupina || 'Neznano');
        const bolezen = d.Naziv || 'Neznano';
        const vrednost = d.st_cepljenj || d.St_cepljenj || 0;
        
        // Odstrani črke a:, b:, c:, d:, e: iz začetka
        starost = starost.replace(/^[a-e]:\s*/i, '');
        
        if (starost && starost !== 'Neznano') {
            if (!aggregated[starost]) {
                aggregated[starost] = { 'Gripa': 0, 'COVID-19': 0 };
            }
            if (bolezen === 'Gripa' || bolezen === 'COVID-19') {
                aggregated[starost][bolezen] += vrednost;
            }
        }
    });

    const processed = Object.entries(aggregated).map(([starost, values]) => ({
        starost,
        gripa: values['Gripa'],
        covid: values['COVID-19'],
        total: values['Gripa'] + values['COVID-19']
    })).sort((a, b) => {
        const order = ['6 mesecev - 17 let', '18 - 59 let', '60 - 69 let', '70 - 79 let', '80 let +'];
        return order.indexOf(a.starost) - order.indexOf(b.starost);
    });

    console.log('KOMBINIRANO processed:', processed.length);
    drawStackedBarChart('#graf-kombinirano', processed);
}

function renderPresekChart() {
    // Filtriraj samo oktober-december 2023 (presek podatkov)
    const startDate = new Date('2023-10-01');
    const endDate = new Date('2023-12-31');
    
    // Okužbe iz stats_weekly
    const okuzbePodatki = rawDataStatsWeekly.filter(d => {
        const date = new Date(d.date || d.week);
        return date >= startDate && date <= endDate;
    });
    
    console.log('PRESEK okuzbePodatki:', okuzbePodatki.length, okuzbePodatki.slice(0,2));
    
    // Cepljenja iz regije podatkov
    const cepljenjaPodatki = rawDataRegije.filter(d => {
        const date = new Date(d.Datum_cepljenja);
        return date >= startDate && date <= endDate;
    });
    
    console.log('PRESEK cepljenjaPodatki:', cepljenjaPodatki.length, cepljenjaPodatki.slice(0,2));
    
    // Agregiraj okužbe po tednih
    const okuzbePoTednih = {};
    okuzbePodatki.forEach(d => {
        const week = d.date;
        if (!week) return;
        if (!okuzbePoTednih[week]) {
            okuzbePoTednih[week] = 0;
        }
        okuzbePoTednih[week] += (d.confirmed || 0);
    });
    
    // Agregiraj cepljenja po tednih
    const cepljenjaPoTednih = {};
    cepljenjaPodatki.forEach(d => {
        const datum = new Date(d.Datum_cepljenja);
        // Zaokroži na začetek tedna (ponedeljek)
        const day = datum.getDay();
        const diff = datum.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(datum.setDate(diff));
        const week = monday.toISOString().split('T')[0];
        
        if (!cepljenjaPoTednih[week]) {
            cepljenjaPoTednih[week] = 0;
        }
        cepljenjaPoTednih[week] += (d.St_cepljenj || 0);
    });
    
    // Združi podatke
    const allWeeks = [...new Set([...Object.keys(okuzbePoTednih), ...Object.keys(cepljenjaPoTednih)])].sort();
    
    const combined = allWeeks.map(week => ({
        week,
        okuzbe: okuzbePoTednih[week] || 0,
        cepljenja: cepljenjaPoTednih[week] || 0
    }));
    
    console.log('PRESEK combined:', combined);
    
    if (combined.length === 0) {
        d3.select('#graf-presek').append('text')
            .attr('x', 400)
            .attr('y', 200)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .text('Ni podatkov za prikaz');
        return;
    }
    
    drawPresekChart('#graf-presek', combined);
}

function drawPresekChart(selector, data) {
    const container = document.querySelector(selector)?.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth || 900;
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    d3.select(selector).selectAll('*').remove();
    
    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // X skala (tedni)
    const x = d3.scaleBand()
        .domain(data.map(d => d.week))
        .range([0, width])
        .padding(0.2);
    
    // Y skala za okužbe (leva os)
    const yOkuzbe = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.okuzbe) * 1.1])
        .nice()
        .range([height, 0]);
    
    // Y skala za cepljenja (desna os)
    const yCepljenja = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cepljenja) * 1.1])
        .nice()
        .range([height, 0]);
    
    // Grid
    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yOkuzbe).tickSize(-width).tickFormat(''))
        .selectAll('line')
        .attr('stroke', '#334155')
        .attr('stroke-opacity', 0.3);
    
    chart.selectAll('.grid .domain').remove();
    
    // X os
    chart.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => {
            const date = new Date(d);
            return `${date.getDate()}.${date.getMonth() + 1}`;
        }))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('fill', '#94a3b8');
    
    // Leva Y os (okužbe)
    chart.append('g')
        .call(d3.axisLeft(yOkuzbe).ticks(6).tickFormat(d => d.toLocaleString('sl-SI')))
        .selectAll('text')
        .attr('fill', '#f87171');
    
    chart.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -60)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f87171')
        .attr('font-size', '12px')
        .text('Okužbe');
    
    // Desna Y os (cepljenja)
    chart.append('g')
        .attr('transform', `translate(${width}, 0)`)
        .call(d3.axisRight(yCepljenja).ticks(6).tickFormat(d => d.toLocaleString('sl-SI')))
        .selectAll('text')
        .attr('fill', '#10b981');
    
    chart.append('text')
        .attr('transform', 'rotate(90)')
        .attr('y', -width - 60)
        .attr('x', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#10b981')
        .attr('font-size', '12px')
        .text('Cepljenja');
    
    const tooltip = createTooltip();
    
    // Črtni graf za okužbe
    const lineOkuzbe = d3.line()
        .x(d => x(d.week) + x.bandwidth() / 2)
        .y(d => yOkuzbe(d.okuzbe))
        .curve(d3.curveMonotoneX);
    
    chart.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#f87171')
        .attr('stroke-width', 3)
        .attr('d', lineOkuzbe);
    
    // Pike za okužbe
    chart.selectAll('.dot-okuzbe')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot-okuzbe')
        .attr('cx', d => x(d.week) + x.bandwidth() / 2)
        .attr('cy', d => yOkuzbe(d.okuzbe))
        .attr('r', 5)
        .attr('fill', '#f87171')
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 8);
            tooltip.innerHTML = `
                <div class="tooltip-label">${d.week}</div>
                <div class="tooltip-value" style="color: #f87171">${d.okuzbe.toLocaleString('sl-SI')} okužb</div>
            `;
            tooltip.classList.add('visible');
            tooltip.style.left = (event.pageX + 15) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 5);
            tooltip.classList.remove('visible');
        });
    
    // Stolpci za cepljenja
    chart.selectAll('.bar-cepljenja')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-cepljenja')
        .attr('x', d => x(d.week))
        .attr('width', x.bandwidth())
        .attr('y', d => yCepljenja(d.cepljenja))
        .attr('height', d => height - yCepljenja(d.cepljenja))
        .attr('fill', '#10b981')
        .attr('opacity', 0.6)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('opacity', 0.9);
            tooltip.innerHTML = `
                <div class="tooltip-label">${d.week}</div>
                <div class="tooltip-value" style="color: #10b981">${d.cepljenja.toLocaleString('sl-SI')} cepljenj</div>
            `;
            tooltip.classList.add('visible');
            tooltip.style.left = (event.pageX + 15) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
        })
        .on('mouseleave', function() {
            d3.select(this).attr('opacity', 0.6);
            tooltip.classList.remove('visible');
        });
    
    // Legenda
    const legendContainer = document.getElementById('legend-presek');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div class="legend-item">
                <span class="legend-dot" style="background: #f87171"></span>
                <span>Okužbe (leva os)</span>
            </div>
            <div class="legend-item">
                <span class="legend-dot" style="background: #10b981"></span>
                <span>Cepljenja (desna os)</span>
            </div>
        `;
    }
}

function renderTimelineChart() {
    // Najprej procesiraj vse podatke za določitev obsega
    const allData = rawDataRegije.filter(d => d.Datum_cepljenja);
    
    // Zberi vse unikatne mesece
    const allMonths = new Set();
    allData.forEach(d => {
        const datum = d.Datum_cepljenja;
        if (datum) {
            const key = datum.substring(0, 7); // YYYY-MM
            allMonths.add(key);
        }
    });
    
    const sortedMonths = Array.from(allMonths).sort();
    
    // Shrani globalno
    window.timelineMonths = sortedMonths;
    
    // Inicializiraj dropdowne
    initTimelineDropdowns(sortedMonths);
    
    // Nariši graf z vsemi podatki
    updateTimelineChart();
}

function initTimelineDropdowns(months) {
    const odSelect = document.getElementById('timeline-od');
    const doSelect = document.getElementById('timeline-do');
    const granSelect = document.getElementById('timeline-granulacija');
    
    if (!odSelect || !doSelect || months.length === 0) return;
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    
    function formatMonth(dateStr) {
        const parts = dateStr.split('-');
        const month = monthNames[parseInt(parts[1]) - 1];
        return `${month} ${parts[0]}`;
    }
    
    // Generiraj opcije
    let options = '';
    months.forEach(m => {
        options += `<option value="${m}">${formatMonth(m)}</option>`;
    });
    
    odSelect.innerHTML = options;
    doSelect.innerHTML = options;
    
    // Nastavi privzete vrednosti (prvi in zadnji mesec)
    odSelect.value = months[0];
    doSelect.value = months[months.length - 1];
    
    // Event listenerji
    odSelect.addEventListener('change', updateTimelineChart);
    doSelect.addEventListener('change', updateTimelineChart);
    granSelect.addEventListener('change', updateTimelineChart);
}

function updateTimelineChart() {
    const odSelect = document.getElementById('timeline-od');
    const doSelect = document.getElementById('timeline-do');
    const granSelect = document.getElementById('timeline-granulacija');
    
    if (!odSelect || !doSelect) return;
    
    const odValue = odSelect.value;
    const doValue = doSelect.value;
    const granulacija = granSelect ? granSelect.value : 'month';
    
    // Filtriraj podatke po izbranem obdobju
    const filtered = rawDataRegije.filter(d => {
        const datum = d.Datum_cepljenja;
        if (!datum) return false;
        const month = datum.substring(0, 7);
        return month >= odValue && month <= doValue;
    });
    
    // Agregiraj po granulaciji
    const aggregated = {};
    filtered.forEach(d => {
        const datum = d.Datum_cepljenja;
        if (!datum) return;
        
        let key;
        if (granulacija === 'year') {
            key = datum.substring(0, 4);
        } else if (granulacija === 'month') {
            key = datum.substring(0, 7); // YYYY-MM
        } else if (granulacija === 'week') {
            // Izračunaj teden v letu
            const date = new Date(datum);
            const startOfYear = new Date(date.getFullYear(), 0, 1);
            const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
            key = `${date.getFullYear()}-T${weekNum.toString().padStart(2, '0')}`;
        } else {
            // day
            key = datum.substring(0, 10); // YYYY-MM-DD
        }
        
        const bolezen = d.Naziv || 'Neznano';
        const vrednost = d.St_cepljenj || 0;
        
        if (!aggregated[key]) {
            aggregated[key] = { 'Gripa': 0, 'COVID-19': 0 };
        }
        if (bolezen === 'Gripa' || bolezen === 'COVID-19') {
            aggregated[key][bolezen] += vrednost;
        }
    });

    const processed = Object.entries(aggregated).map(([key, values]) => ({
        datum: key,
        gripa: values['Gripa'],
        covid: values['COVID-19']
    })).sort((a, b) => a.datum.localeCompare(b.datum));

    drawLineChart('#graf-timeline', processed);
}

function drawBarChart(selector, data, xKey, yKey, options = {}) {
    const container = document.querySelector(selector);
    if (!container) return;

    d3.select(selector).selectAll('*').remove();

    if (data.length === 0) {
        showError(selector, 'Ni podatkov za prikaz');
        return;
    }

    const margin = options.mini 
        ? { top: 20, right: 20, bottom: 80, left: 50 }
        : { top: 30, right: 30, bottom: 100, left: 70 };
    
    const width = (options.width || 800) - margin.left - margin.right;
    const height = (options.height || 450) - margin.top - margin.bottom;

    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d[xKey]))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey]) * 1.1])
        .nice()
        .range([height, 0]);

    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''))
        .selectAll('line')
        .attr('stroke', COLORS.grid);

    chart.selectAll('.grid .domain').remove();

    chart.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em')
        .style('font-size', options.mini ? '10px' : '12px');

    chart.append('g')
        .attr('class', 'axis axis-y')
        .call(d3.axisLeft(y).ticks(6).tickFormat(d => d.toLocaleString('sl-SI')));

    const tooltip = createTooltip();

    chart.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d[xKey]))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('rx', 4)
        .attr('fill', COLORS.primary)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('fill', COLORS.secondary);
            showTooltip(tooltip, event, d[xKey], d[yKey]);
        })
        .on('mousemove', function(event, d) {
            showTooltip(tooltip, event, d[xKey], d[yKey]);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('fill', COLORS.primary);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d[yKey]))
        .attr('height', d => height - y(d[yKey]));
}

function drawStackedBarChart(selector, data) {
    const container = document.querySelector(selector);
    if (!container) return;

    d3.select(selector).selectAll('*').remove();

    if (data.length === 0) {
        showError(selector, 'Ni podatkov za prikaz');
        return;
    }

    const margin = { top: 30, right: 30, bottom: 100, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const colorGripa = '#10b981';
    const colorCovid = '#6366f1';

    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.starost))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total) * 1.1])
        .nice()
        .range([height, 0]);

    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''))
        .selectAll('line')
        .attr('stroke', COLORS.grid);

    chart.selectAll('.grid .domain').remove();

    chart.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em')
        .style('font-size', '12px');

    chart.append('g')
        .attr('class', 'axis axis-y')
        .call(d3.axisLeft(y).ticks(6).tickFormat(d => d.toLocaleString('sl-SI')));

    const tooltip = createTooltip();

    chart.selectAll('.bar-gripa')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-gripa')
        .attr('x', d => x(d.starost))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', colorGripa)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('opacity', 0.8);
            showTooltip(tooltip, event, `${d.starost} - Gripa`, d.gripa);
        })
        .on('mousemove', function(event, d) {
            showTooltip(tooltip, event, `${d.starost} - Gripa`, d.gripa);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('opacity', 1);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 80)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.gripa))
        .attr('height', d => height - y(d.gripa));

    chart.selectAll('.bar-covid')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-covid')
        .attr('x', d => x(d.starost))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', colorCovid)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('opacity', 0.8);
            showTooltip(tooltip, event, `${d.starost} - COVID-19`, d.covid);
        })
        .on('mousemove', function(event, d) {
            showTooltip(tooltip, event, `${d.starost} - COVID-19`, d.covid);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('opacity', 1);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 80 + 400)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.gripa + d.covid))
        .attr('height', d => height - y(d.covid));

    // Dodaj oznake za seštevek nad vsakim stolpcem
    chart.selectAll('.total-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'total-label')
        .attr('x', d => x(d.starost) + x.bandwidth() / 2)
        .attr('y', d => y(d.total) - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('opacity', 0)
        .text(d => d.total.toLocaleString('sl-SI'))
        .transition()
        .duration(800)
        .delay((d, i) => i * 80 + 600)
        .attr('opacity', 1);

    const legendContainer = document.getElementById('legend-kombinirano');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background: ${colorGripa}"></div>
                <span>Gripa</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: ${colorCovid}"></div>
                <span>COVID-19</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #94a3b8; opacity: 0.5"></div>
                <span>Skupaj (številka nad stolpcem)</span>
            </div>
        `;
    }
}

function drawLineChart(selector, data) {
    const container = document.querySelector(selector);
    if (!container) return;

    d3.select(selector).selectAll('*').remove();

    if (data.length === 0) {
        showError(selector, 'Ni podatkov za prikaz');
        return;
    }

    const margin = { top: 30, right: 30, bottom: 80, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const colorGripa = '#10b981';
    const colorCovid = '#6366f1';

    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(data.map(d => d.datum))
        .range([0, width])
        .padding(0.5);

    const maxVal = d3.max(data, d => Math.max(d.gripa, d.covid));
    const y = d3.scaleLinear()
        .domain([0, maxVal * 1.1])
        .nice()
        .range([height, 0]);

    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''))
        .selectAll('line')
        .attr('stroke', COLORS.grid);

    chart.selectAll('.grid .domain').remove();

    chart.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickValues(
            // Če je več kot 30 točk, prikaži samo vsako 15. (1. in 15. v mesecu)
            data.length > 30 
                ? data.filter((d, i) => {
                    const day = parseInt(d.datum.split('-')[2] || d.datum.split('.')[0]);
                    return day === 1 || day === 15;
                  }).map(d => d.datum)
                : data.map(d => d.datum)
        ))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em')
        .style('font-size', '11px');

    chart.append('g')
        .attr('class', 'axis axis-y')
        .call(d3.axisLeft(y).ticks(6).tickFormat(d => d.toLocaleString('sl-SI')));

    const lineGripa = d3.line()
        .x(d => x(d.datum))
        .y(d => y(d.gripa))
        .curve(d3.curveMonotoneX);

    const lineCovid = d3.line()
        .x(d => x(d.datum))
        .y(d => y(d.covid))
        .curve(d3.curveMonotoneX);

    const pathGripa = chart.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', colorGripa)
        .attr('stroke-width', 3)
        .attr('d', lineGripa);

    const lengthGripa = pathGripa.node().getTotalLength();
    pathGripa
        .attr('stroke-dasharray', lengthGripa)
        .attr('stroke-dashoffset', lengthGripa)
        .transition()
        .duration(1500)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

    const pathCovid = chart.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', colorCovid)
        .attr('stroke-width', 3)
        .attr('d', lineCovid);

    const lengthCovid = pathCovid.node().getTotalLength();
    pathCovid
        .attr('stroke-dasharray', lengthCovid)
        .attr('stroke-dashoffset', lengthCovid)
        .transition()
        .duration(1500)
        .delay(300)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

    const tooltip = createTooltip();

    chart.selectAll('.dot-gripa')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot-gripa')
        .attr('cx', d => x(d.datum))
        .attr('cy', d => y(d.gripa))
        .attr('r', 5)
        .attr('fill', colorGripa)
        .attr('opacity', 0)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 8);
            showTooltip(tooltip, event, `${d.datum} - Gripa`, d.gripa);
        })
        .on('mousemove', function(event, d) {
            showTooltip(tooltip, event, `${d.datum} - Gripa`, d.gripa);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 5);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(500)
        .delay((d, i) => 1500 + i * 50)
        .attr('opacity', 1);

    chart.selectAll('.dot-covid')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot-covid')
        .attr('cx', d => x(d.datum))
        .attr('cy', d => y(d.covid))
        .attr('r', 5)
        .attr('fill', colorCovid)
        .attr('opacity', 0)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 8);
            showTooltip(tooltip, event, `${d.datum} - COVID-19`, d.covid);
        })
        .on('mousemove', function(event, d) {
            showTooltip(tooltip, event, `${d.datum} - COVID-19`, d.covid);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 5);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(500)
        .delay((d, i) => 1800 + i * 50)
        .attr('opacity', 1);

    const legendContainer = document.getElementById('legend-timeline');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background: ${colorGripa}"></div>
                <span>Gripa</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: ${colorCovid}"></div>
                <span>COVID-19</span>
            </div>
        `;
    }
}

function drawMultiAreaChart(selector, data) {
    const container = document.querySelector(selector);
    if (!container) return;

    d3.select(selector).selectAll('*').remove();

    if (data.length === 0) {
        showError(selector, 'Ni podatkov za prikaz');
        return;
    }

    const margin = { top: 30, right: 80, bottom: 80, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const colorConfirmed = '#ef4444';
    const colorHealthcare = '#f59e0b';

    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(data.map(d => d.week))
        .range([0, width])
        .padding(0.5);

    const yLeft = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.confirmed) * 1.1])
        .nice()
        .range([height, 0]);

    const yRight = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.healthcare) * 1.1])
        .nice()
        .range([height, 0]);

    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yLeft).tickSize(-width).tickFormat(''))
        .selectAll('line')
        .attr('stroke', COLORS.grid);

    chart.selectAll('.grid .domain').remove();

    chart.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => i % 8 === 0)))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em')
        .style('font-size', '10px');

    chart.append('g')
        .attr('class', 'axis axis-y-left')
        .call(d3.axisLeft(yLeft).ticks(6).tickFormat(d => d.toLocaleString('sl-SI')))
        .selectAll('text')
        .style('fill', colorConfirmed);

    chart.append('g')
        .attr('class', 'axis axis-y-right')
        .attr('transform', `translate(${width}, 0)`)
        .call(d3.axisRight(yRight).ticks(6).tickFormat(d => d.toLocaleString('sl-SI')))
        .selectAll('text')
        .style('fill', colorHealthcare);

    const areaConfirmed = d3.area()
        .x(d => x(d.week))
        .y0(height)
        .y1(d => yLeft(d.confirmed))
        .curve(d3.curveMonotoneX);

    const lineHealthcare = d3.line()
        .x(d => x(d.week))
        .y(d => yRight(d.healthcare))
        .curve(d3.curveMonotoneX);

    chart.append('path')
        .datum(data)
        .attr('fill', colorConfirmed)
        .attr('fill-opacity', 0.3)
        .attr('stroke', colorConfirmed)
        .attr('stroke-width', 2)
        .attr('d', areaConfirmed);

    const pathHealthcare = chart.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', colorHealthcare)
        .attr('stroke-width', 3)
        .attr('d', lineHealthcare);

    const lengthHealthcare = pathHealthcare.node().getTotalLength();
    pathHealthcare
        .attr('stroke-dasharray', lengthHealthcare)
        .attr('stroke-dashoffset', lengthHealthcare)
        .transition()
        .duration(2000)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

    const tooltip = createTooltip();

    chart.selectAll('.dot-healthcare')
        .data(data.filter((d, i) => i % 4 === 0))
        .enter()
        .append('circle')
        .attr('cx', d => x(d.week))
        .attr('cy', d => yRight(d.healthcare))
        .attr('r', 4)
        .attr('fill', colorHealthcare)
        .attr('opacity', 0)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 7);
            tooltip.innerHTML = `
                <div class="tooltip-label">${d.week}</div>
                <div class="tooltip-value" style="color: ${colorConfirmed}">Potrjeni: ${d.confirmed.toLocaleString('sl-SI')}</div>
                <div class="tooltip-value" style="color: ${colorHealthcare}">Zdravstvo: ${d.healthcare.toLocaleString('sl-SI')}</div>
            `;
            tooltip.classList.add('visible');
            tooltip.style.left = (event.pageX + 15) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 4);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(500)
        .delay((d, i) => 2000 + i * 30)
        .attr('opacity', 1);

    const legendContainer = document.getElementById('legend-pandemija');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background: ${colorConfirmed}"></div>
                <span>Potrjeni primeri (leva os)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: ${colorHealthcare}"></div>
                <span>Okužbe v zdravstvu (desna os)</span>
            </div>
        `;
    }
}

const SLOVENIA_REGIONS = {};

let leafletMap = null;
let geojsonLayer = null;

function renderZemljevidChart() {
    const mapContainer = document.getElementById('leaflet-map');
    if (!mapContainer) return;
    
    // Če zemljevid že obstaja, ga odstrani
    if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
    }
    
    // Počisti container
    mapContainer.innerHTML = '';
    
    // Ustvari Leaflet zemljevid s središčem na Sloveniji
    leafletMap = L.map('leaflet-map', {
        center: [46.15, 14.99],
        zoom: 8,
        minZoom: 7,
        maxZoom: 12
    });
    
    // Dodaj tile layer (OpenStreetMap - zanesljivejši)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMap);
    
    // Počakaj da se kontejner naloži in osveži velikost
    setTimeout(() => {
        leafletMap.invalidateSize();
    }, 100);
    
    // Naloži GeoJSON podatke
    fetch('SR.geojson')
        .then(response => {
            if (!response.ok) throw new Error('GeoJSON not found');
            return response.json();
        })
        .then(geojson => {
            console.log('GeoJSON loaded:', geojson.features.length, 'features');
            
            // Agregiraj podatke o cepljenjih
            const filtered = filterByObdobje(rawDataRegije).filter(d => d.Statisticna_regija);
            
            const aggregated = {};
            filtered.forEach(d => {
                const regija = fixSumniki(d.Statisticna_regija);
                const vrednost = d.St_cepljenj || 0;
                const bolezen = d.Naziv || 'Neznano';
                
                if (!aggregated[regija]) {
                    aggregated[regija] = { total: 0, gripa: 0, covid: 0 };
                }
                aggregated[regija].total += vrednost;
                if (bolezen === 'Gripa') aggregated[regija].gripa += vrednost;
                if (bolezen === 'COVID-19') aggregated[regija].covid += vrednost;
            });
            
            console.log('Aggregated data:', aggregated);
            
            const values = Object.values(aggregated).map(d => d.total);
            const maxValue = Math.max(...values, 1);
            const minValue = Math.min(...values, 0);
            
            // Funkcija za barvo glede na vrednost
            function getColor(value) {
                if (!value || value === 0) return '#3b82f6';
                const ratio = (value - minValue) / (maxValue - minValue);
                // Gradient od temno modre do svetlo modre
                const r = Math.round(30 + ratio * (147 - 30));
                const g = Math.round(58 + ratio * (197 - 58));
                const b = Math.round(95 + ratio * (253 - 95));
                return `rgb(${r}, ${g}, ${b})`;
            }
            
            // Stil za vsako regijo
            function style(feature) {
                const name = feature.properties.SR_UIME;
                const data = aggregated[name];
                const value = data ? data.total : 0;
                return {
                    fillColor: getColor(value),
                    weight: 2,
                    opacity: 1,
                    color: '#1e293b',
                    fillOpacity: 0.7
                };
            }
            
            // Interaktivnost
            function highlightFeature(e) {
                const layer = e.target;
                layer.setStyle({
                    weight: 4,
                    color: '#a855f7',
                    fillOpacity: 0.9
                });
                layer.bringToFront();
            }
            
            function resetHighlight(e) {
                geojsonLayer.resetStyle(e.target);
            }
            
            function onEachFeature(feature, layer) {
                const name = feature.properties.SR_UIME;
                const data = aggregated[name] || { total: 0, gripa: 0, covid: 0 };
                
                layer.bindTooltip(`<strong>${name}</strong><br>${data.total.toLocaleString('sl-SI')} cepljenj`, {
                    permanent: false,
                    direction: 'center'
                });
                
                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight,
                    click: function(e) {
                        showRegionDetails(name, data);
                    }
                });
            }
            
            // Dodaj GeoJSON layer
            geojsonLayer = L.geoJSON(geojson, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(leafletMap);
            
            // Prilagodi pogled na Slovenijo
            leafletMap.fitBounds(geojsonLayer.getBounds());
            
            // Legenda
            const legendContainer = document.getElementById('map-legend');
            if (legendContainer) {
                legendContainer.innerHTML = `
                    <div class="map-legend-gradient">
                        <span class="gradient-label">${minValue.toLocaleString('sl-SI')}</span>
                        <div class="gradient-bar"></div>
                        <span class="gradient-label">${maxValue.toLocaleString('sl-SI')}</span>
                    </div>
                `;
            }
        })
        .catch(err => {
            console.error('Napaka pri nalaganju GeoJSON:', err);
            mapContainer.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">Napaka pri nalaganju zemljevida. Preverite da je SR.geojson datoteka prisotna.</p>';
        });
}

function showRegionDetails(name, data) {
    const detailsContainer = document.getElementById('region-details');
    if (!detailsContainer) return;
    
    detailsContainer.innerHTML = `
        <div class="region-info visible">
            <h3>${name}</h3>
            <div class="region-stats">
                <div class="region-stat">
                    <div class="region-stat-value">${data.total.toLocaleString('sl-SI')}</div>
                    <div class="region-stat-label">Skupaj cepljenj</div>
                </div>
                <div class="region-stat">
                    <div class="region-stat-value" style="color: #10b981">${data.gripa.toLocaleString('sl-SI')}</div>
                    <div class="region-stat-label">Gripa</div>
                </div>
                <div class="region-stat">
                    <div class="region-stat-value" style="color: #6366f1">${data.covid.toLocaleString('sl-SI')}</div>
                    <div class="region-stat-label">COVID-19</div>
                </div>
            </div>
        </div>
    `;
}
