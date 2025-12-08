// =============================================
// COVID VIZUALIZACIJA - APP.JS
// MT 2025/26
// =============================================

// API URLs
const API_REGIJE = 'http://127.0.0.1:5000/covid_regije?days=365';
const API_STAROST = 'http://127.0.0.1:5000/covid_starost?days=365';

// =============================================
// FIX ENCODING - ŠUMNIKI
// =============================================

function fixSumniki(text) {
    if (!text) return text;
    return text
        .replace(/Gori�ka/g, 'Goriška')
        .replace(/Koro�ka/g, 'Koroška')
        .replace(/Obalno-kra�ka/g, 'Obalno-kraška');
}

// Chart colors from CSS
const COLORS = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    tertiary: '#a78bfa',
    quaternary: '#c4b5fd',
    text: '#a0a0a8',
    textMuted: '#5c5c66',
    grid: 'rgba(255, 255, 255, 0.06)'
};

// =============================================
// TAB NAVIGATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Load all data
    loadRegijeData();
    loadStarostData();
    loadKombiniranoData();
    loadTimelineData();
});

// =============================================
// CHART UTILITIES
// =============================================

function createTooltip() {
    // Check if tooltip already exists
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

// =============================================
// REGIJE CHART
// =============================================

function loadRegijeData() {
    fetch(API_REGIJE)
        .then(response => response.json())
        .then(raw => {
            const data = raw.data || [];
            const filtered = data.filter(d => d.Statisticna_regija);
            
            // Aggregate by region
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

            console.log('REGIJE DATA:', processed);

            // Draw main chart
            drawBarChart('#graf-regije', processed, 'regija', 'vrednost', {
                width: 900,
                height: 450
            });
        })
        .catch(err => {
            console.error('Napaka pri pridobivanju podatkov regij:', err);
            showError('#graf-regije', 'Napaka pri nalaganju podatkov');
        });
}

// =============================================
// STAROST CHART
// =============================================

function loadStarostData() {
    fetch(API_STAROST)
        .then(response => response.json())
        .then(raw => {
            const data = raw.data || [];
            
            // Aggregate by age group
            const aggregated = {};
            data.forEach(d => {
                // Podpira različna imena polj
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

            console.log('STAROST DATA:', processed);

            // Draw main chart
            drawBarChart('#graf-starost', processed, 'starost', 'vrednost', {
                width: 900,
                height: 450
            });
        })
        .catch(err => {
            console.error('Napaka pri pridobivanju podatkov starosti:', err);
            showError('#graf-starost', 'Napaka pri nalaganju podatkov');
        });
}

// =============================================
// GENERIC BAR CHART
// =============================================

function drawBarChart(selector, data, xKey, yKey, options = {}) {
    const container = document.querySelector(selector);
    if (!container) return;

    // Clear existing content
    d3.select(selector).selectAll('*').remove();

    if (data.length === 0) {
        showError(selector, 'Ni podatkov za prikaz');
        return;
    }

    // Dimensions
    const margin = options.mini 
        ? { top: 20, right: 20, bottom: 80, left: 50 }
        : { top: 30, right: 30, bottom: 100, left: 70 };
    
    const width = (options.width || 800) - margin.left - margin.right;
    const height = (options.height || 450) - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
        .domain(data.map(d => d[xKey]))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey]) * 1.1])
        .nice()
        .range([height, 0]);

    // Grid lines
    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        )
        .selectAll('line')
        .attr('stroke', COLORS.grid);

    chart.selectAll('.grid .domain').remove();

    // X Axis
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

    // Y Axis
    chart.append('g')
        .attr('class', 'axis axis-y')
        .call(d3.axisLeft(y)
            .ticks(6)
            .tickFormat(d => d.toLocaleString('sl-SI'))
        );

    // Tooltip
    const tooltip = createTooltip();

    // Bars with animation
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

// =============================================
// ERROR DISPLAY
// =============================================

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

// =============================================
// KOMBINIRANO - STACKED BAR CHART
// =============================================

function loadKombiniranoData() {
    fetch(API_STAROST)
        .then(response => response.json())
        .then(raw => {
            const data = raw.data || [];
            
            // Aggregate by age group AND disease
            const aggregated = {};
            
            data.forEach(d => {
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
                // Sort by age group order
                const order = ['a: 6 mesecev - 17 let', 'b: 18 - 59 let', 'c: 60 - 69 let', 'd: 70 - 79 let', 'e: 80 let +'];
                return order.indexOf(a.starost) - order.indexOf(b.starost);
            });

            console.log('KOMBINIRANO DATA:', processed);

            drawStackedBarChart('#graf-kombinirano', processed);
        })
        .catch(err => {
            console.error('Napaka pri pridobivanju kombiniranih podatkov:', err);
            showError('#graf-kombinirano', 'Napaka pri nalaganju podatkov');
        });
}

function drawStackedBarChart(selector, data) {
    const container = document.querySelector(selector);
    if (!container) return;

    d3.select(selector).selectAll('*').remove();

    if (data.length === 0) {
        showError(selector, 'Ni podatkov za prikaz');
        return;
    }

    // Dimensions
    const margin = { top: 30, right: 30, bottom: 100, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    // Colors for diseases
    const colorGripa = '#10b981';  // Green
    const colorCovid = '#6366f1';  // Purple

    // Create SVG
    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
        .domain(data.map(d => d.starost))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total) * 1.1])
        .nice()
        .range([height, 0]);

    // Grid lines
    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        )
        .selectAll('line')
        .attr('stroke', COLORS.grid);

    chart.selectAll('.grid .domain').remove();

    // X Axis
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

    // Y Axis
    chart.append('g')
        .attr('class', 'axis axis-y')
        .call(d3.axisLeft(y)
            .ticks(6)
            .tickFormat(d => d.toLocaleString('sl-SI'))
        );

    // Tooltip
    const tooltip = createTooltip();

    // Draw stacked bars - Gripa (bottom)
    chart.selectAll('.bar-gripa')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-gripa')
        .attr('x', d => x(d.starost))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('rx', 0)
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

    // Draw stacked bars - COVID (top)
    chart.selectAll('.bar-covid')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-covid')
        .attr('x', d => x(d.starost))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('rx', 0)
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

    // Legend
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

// =============================================
// TIMELINE - LINE CHART
// =============================================

function loadTimelineData() {
    fetch(API_REGIJE)
        .then(response => response.json())
        .then(raw => {
            const data = raw.data || [];
            
            // Aggregate by month AND disease
            const aggregated = {};
            
            data.forEach(d => {
                const datum = d.Datum_cepljenja;
                if (!datum) return;
                
                // Extract year-month
                const mesec = datum.substring(0, 7); // "2024-01"
                const bolezen = d.Naziv || 'Neznano';
                const vrednost = d.St_cepljenj || 0;
                
                if (!aggregated[mesec]) {
                    aggregated[mesec] = { 'Gripa': 0, 'COVID-19': 0 };
                }
                if (bolezen === 'Gripa' || bolezen === 'COVID-19') {
                    aggregated[mesec][bolezen] += vrednost;
                }
            });

            const processed = Object.entries(aggregated).map(([mesec, values]) => ({
                mesec,
                gripa: values['Gripa'],
                covid: values['COVID-19']
            })).sort((a, b) => a.mesec.localeCompare(b.mesec));

            console.log('TIMELINE DATA:', processed);

            drawLineChart('#graf-timeline', processed);
        })
        .catch(err => {
            console.error('Napaka pri pridobivanju timeline podatkov:', err);
            showError('#graf-timeline', 'Napaka pri nalaganju podatkov');
        });
}

function drawLineChart(selector, data) {
    const container = document.querySelector(selector);
    if (!container) return;

    d3.select(selector).selectAll('*').remove();

    if (data.length === 0) {
        showError(selector, 'Ni podatkov za prikaz');
        return;
    }

    // Dimensions
    const margin = { top: 30, right: 30, bottom: 80, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    // Colors
    const colorGripa = '#10b981';
    const colorCovid = '#6366f1';

    // Create SVG
    const svg = d3.select(selector)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scalePoint()
        .domain(data.map(d => d.mesec))
        .range([0, width])
        .padding(0.5);

    const maxVal = d3.max(data, d => Math.max(d.gripa, d.covid));
    const y = d3.scaleLinear()
        .domain([0, maxVal * 1.1])
        .nice()
        .range([height, 0]);

    // Grid lines
    chart.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        )
        .selectAll('line')
        .attr('stroke', COLORS.grid);

    chart.selectAll('.grid .domain').remove();

    // X Axis
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

    // Y Axis
    chart.append('g')
        .attr('class', 'axis axis-y')
        .call(d3.axisLeft(y)
            .ticks(6)
            .tickFormat(d => d.toLocaleString('sl-SI'))
        );

    // Line generators
    const lineGripa = d3.line()
        .x(d => x(d.mesec))
        .y(d => y(d.gripa))
        .curve(d3.curveMonotoneX);

    const lineCovid = d3.line()
        .x(d => x(d.mesec))
        .y(d => y(d.covid))
        .curve(d3.curveMonotoneX);

    // Draw Gripa line
    const pathGripa = chart.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', colorGripa)
        .attr('stroke-width', 3)
        .attr('d', lineGripa);

    // Animate Gripa line
    const lengthGripa = pathGripa.node().getTotalLength();
    pathGripa
        .attr('stroke-dasharray', lengthGripa)
        .attr('stroke-dashoffset', lengthGripa)
        .transition()
        .duration(1500)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

    // Draw COVID line
    const pathCovid = chart.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', colorCovid)
        .attr('stroke-width', 3)
        .attr('d', lineCovid);

    // Animate COVID line
    const lengthCovid = pathCovid.node().getTotalLength();
    pathCovid
        .attr('stroke-dasharray', lengthCovid)
        .attr('stroke-dashoffset', lengthCovid)
        .transition()
        .duration(1500)
        .delay(300)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

    // Tooltip
    const tooltip = createTooltip();

    // Dots for Gripa
    chart.selectAll('.dot-gripa')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot-gripa')
        .attr('cx', d => x(d.mesec))
        .attr('cy', d => y(d.gripa))
        .attr('r', 5)
        .attr('fill', colorGripa)
        .attr('opacity', 0)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 8);
            showTooltip(tooltip, event, `${d.mesec} - Gripa`, d.gripa);
        })
        .on('mousemove', function(event, d) {
            showTooltip(tooltip, event, `${d.mesec} - Gripa`, d.gripa);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 5);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(500)
        .delay((d, i) => 1500 + i * 50)
        .attr('opacity', 1);

    // Dots for COVID
    chart.selectAll('.dot-covid')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot-covid')
        .attr('cx', d => x(d.mesec))
        .attr('cy', d => y(d.covid))
        .attr('r', 5)
        .attr('fill', colorCovid)
        .attr('opacity', 0)
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 8);
            showTooltip(tooltip, event, `${d.mesec} - COVID-19`, d.covid);
        })
        .on('mousemove', function(event, d) {
            showTooltip(tooltip, event, `${d.mesec} - COVID-19`, d.covid);
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 5);
            hideTooltip(tooltip);
        })
        .transition()
        .duration(500)
        .delay((d, i) => 1800 + i * 50)
        .attr('opacity', 1);

    // Legend
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
