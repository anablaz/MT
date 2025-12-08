// URL backend-a
const API_URL = 'http://127.0.0.1:5000/covid_regije';

// Dimenzije grafa
const margin = { top: 30, right: 30, bottom: 80, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

fetch(API_URL)
    .then(response => response.json())
    .then(raw => {
        const data = raw.data;

        // Filtriramo samo zapise, ki imajo ime regije
        const filtered = data.filter(d => d.Statisticna_regija);

        // Mapiramo podatke
        const processed = filtered.map(d => ({
            regija: d.Statisticna_regija,   // ← IME REGIJE
            vrednost: d.St_cepljenj,
        }));

        console.log("PROCESSED:", processed);

        // ---- D3 KODA ----
        const svg = d3
            .select("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // SKALE
        const x = d3.scaleBand()
            .domain(processed.map(d => d.regija))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(processed, d => d.vrednost)])
            .nice()
            .range([height, 0]);

        // X OS
        chart.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end");

        // Y OS
        chart.append("g")
            .call(d3.axisLeft(y));

        // STOLPCI
        chart.selectAll("rect")
            .data(processed)
            .enter()
            .append("rect")
            .attr("x", d => x(d.regija))
            .attr("y", d => y(d.vrednost))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.vrednost))
            .attr("fill", "steelblue");
    })
    .catch(err => console.error("Napaka pri fetch-u:", err));
