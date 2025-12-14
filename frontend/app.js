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

function getWeekFromDate(dateStr) {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-${week.toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

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
            
            const granulacijaGroup = document.getElementById('filter-granulacija').closest('.filter-group');
            if (targetId === 'timeline') {
                granulacijaGroup.style.display = 'flex';
            } else {
                granulacijaGroup.style.display = 'none';
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
        })
        .catch(err => console.error('Error loading stats weekly:', err));

    setTimeout(renderAllCharts, 500);
}

function renderAllCharts() {
    renderRegijeChart();
    renderStarostChart();
    renderKombiniranoChart();
    renderTimelineChart();
    renderKorelacijaChart();
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
        const starost = fixSumniki(d.Starostni_razred || d.Starostna_skupina || 'Neznano');
        const bolezen = d.Naziv || 'Neznano';
        const vrednost = d.st_cepljenj || d.St_cepljenj || 0;
        
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
        const order = ['a: 6 mesecev - 17 let', 'b: 18 - 59 let', 'c: 60 - 69 let', 'd: 70 - 79 let', 'e: 80 let +'];
        return order.indexOf(a.starost) - order.indexOf(b.starost);
    });

    console.log('KOMBINIRANO processed:', processed.length);
    drawStackedBarChart('#graf-kombinirano', processed);
}

function renderTimelineChart() {
    const filtered = filterByObdobje(rawDataRegije);
    
    const aggregated = {};
    filtered.forEach(d => {
        const datum = d.Datum_cepljenja;
        if (!datum) return;
        
        const key = getDateKey(datum, globalFilters.granulacija);
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

    console.log('TIMELINE processed:', processed.length);
    drawLineChart('#graf-timeline', processed);
}

function renderKorelacijaChart() {
    const weeklyData = filterByObdobjeWeekly(rawDataStatsWeekly);
    
    const processed = weeklyData.map(d => ({
        week: d.week,
        confirmed: d.confirmed || 0,
        healthcare: d.healthcare || 0
    })).filter(d => d.week).sort((a, b) => a.week.localeCompare(b.week));
    
    console.log('KORELACIJA processed:', processed.length);
    drawMultiAreaChart('#graf-korelacija', processed);
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
        .call(d3.axisBottom(x))
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

    const legendContainer = document.getElementById('legend-korelacija');
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
