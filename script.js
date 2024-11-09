const MA_counties = "./towns.topojson";
const gini_index = "./gini_index.csv";

const fipsData = [
    { "county": "Barnstable County, Massachusetts", "fips_code": 25001 },
    { "county": "Berkshire County, Massachusetts", "fips_code": 25003 },
    { "county": "Bristol County, Massachusetts", "fips_code": 25005 },
    { "county": "Dukes County, Massachusetts", "fips_code": 25007 },
    { "county": "Essex County, Massachusetts", "fips_code": 25009 },
    { "county": "Franklin County, Massachusetts", "fips_code": 25011 },
    { "county": "Hampden County, Massachusetts", "fips_code": 25013 },
    { "county": "Hampshire County, Massachusetts", "fips_code": 25015 },
    { "county": "Middlesex County, Massachusetts", "fips_code": 25017 },
    { "county": "Nantucket County, Massachusetts", "fips_code": 25019 },
    { "county": "Norfolk County, Massachusetts", "fips_code": 25021 },
    { "county": "Plymouth County, Massachusetts", "fips_code": 25023 },
    { "county": "Suffolk County, Massachusetts", "fips_code": 25025 },
    { "county": "Worcester County, Massachusetts", "fips_code": 25027 }
];

Promise.all([
    d3.json(MA_counties),
    d3.csv(gini_index)
]).then(data => {
    const topoData = data[0];
    const giniData = data[1];
    console.log(data[1])
    data[1]

    const geojson = topojson.feature(topoData, topoData.objects.ma);

    
    const fipsMap = {};
    giniData.forEach(d => {
        const fipsCode = parseInt(d.fips_code);
        if (!fipsMap[fipsCode]) fipsMap[fipsCode] = { trend: [] };

        fipsMap[fipsCode].trend.push({
            year: +d.year,
            gini: +d["Estimate!!Gini Index"]
        });

        if (+d.year === 2019) {
            fipsMap[fipsCode].gini2019 = +d["Estimate!!Gini Index"];
            fipsMap[fipsCode].fullName = d["Geographic Area Name"];
        }
    });


    const giniValues2019 = Object.values(fipsMap)
        .map(d => d.gini2019)
        .filter(v => v !== undefined);
    const giniMin = Math.min(...giniValues2019);
    const giniMax = Math.max(...giniValues2019);


    const svgWidth = window.innerWidth * 0.8;
    const svgHeight = window.innerHeight / 3;

    
    const colorScalePopulation = d3.scaleLinear()
        .domain(d3.extent(geojson.features, d => d.properties.POP1980 || 0))
        .range(['#f7fbff', '#08306b']);

    const colorScaleChange = d3.scaleDiverging(d3.interpolateRdBu)
        .domain([
            d3.min(geojson.features, d => (d.properties.POP2010 || 0) - (d.properties.POP1980 || 0)),
            0,
            d3.max(geojson.features, d => (d.properties.POP2010 || 0) - (d.properties.POP1980 || 0))
        ]);

    
    const colorScaleGini = d3.scaleSequential(d3.interpolateViridis)
        .domain([giniMin, giniMax]);

    
    const tooltip = d3.select("#tooltip");


    const createLineChartTooltip = (fipsCode, tooltip, fipsMap) => {
        const countyData = fipsMap[fipsCode]?.trend || [];
        if (countyData.length === 0) {
            console.warn(`No data found for FIPS code ${fipsCode}`);
            return;
        }

        const margin = { top: 10, right: 20, bottom: 20, left: 30 };
        const width = 200 - margin.left - margin.right;
        const height = 100 - margin.top - margin.bottom;

    
        tooltip.select("svg").remove();

    
        const svg = tooltip.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        

        const xScale = d3.scaleLinear()
            .domain(d3.extent(countyData, d => +d.year))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(countyData, d => d.gini))
            .range([height, 0]);

        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.gini));

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format("d")));

        svg.append("g")
            .call(d3.axisLeft(yScale).ticks(5));

        svg.append("path")
            .datum(countyData)
            .attr("fill", "none")
            .attr("stroke", "#007acc")
            .attr("stroke-width", 1.5)
            .attr("d", d=>{
                console.log(d)
                return line(d)});
    };


    const createMap = (container, colorScale, property, isGini = false) => {
        const svg = d3.select(container).append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        const projection = d3.geoMercator().fitSize([svgWidth, svgHeight], geojson);
        const path = d3.geoPath().projection(projection);

        svg.selectAll("path")
            .data(geojson.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                if (isGini) {
                    const fips = String(d.properties.FIPS_STCO);
                    const gini2019 = fipsMap[fips] ? fipsMap[fips].gini2019 : null;
                    return gini2019 ? colorScale(gini2019) : "#ccc";
                } else if (typeof property === 'function') {
                    return colorScale(property(d));
                } else if (typeof property === 'string') {
                    return colorScale(d.properties[property] || 0);
                }
                return '#ccc'; 
            })
            .on("mouseenter", (event, d) => {
                if (isGini) {
                    const fips = String(d.properties.FIPS_STCO);
                    if (fipsMap[fips]) {
                        const { gini2019, fullName } = fipsMap[fips];
                        tooltip.html("")
                            .style("opacity", 1)
                            .append("div")
                            .html(`<strong>${fullName}</strong><br>Gini Index (2019): ${gini2019}`);

                 
                        createLineChartTooltip(fips, tooltip, fipsMap);
                        tooltip.style("left", `${event.pageX + 10}px`)
                            .style("top", `${event.pageY + 10}px`);
                    }
                } else if (typeof property === 'function') {
                    const pop1980 = d.properties.POP1980;
                    const pop2010 = d.properties.POP2010;
                    const change = (typeof pop1980 === 'number' && typeof pop2010 === 'number') ? pop2010 - pop1980 : 'N/A';
                    tooltip.style("opacity", 1)
                        .html(`<strong>${d.properties.TOWN || d.properties.county}</strong><br>
                               Population in 1980: ${pop1980 !== undefined ? pop1980 : 'N/A'}<br>
                               Population in 2010: ${pop2010 !== undefined ? pop2010 : 'N/A'}<br>
                               Population Change: ${change}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY + 10}px`);
                } else {
                    tooltip.style("opacity", 1)
                        .html(`<strong>${d.properties.TOWN || d.properties.county}</strong><br>
                               Population in 1980: ${d.properties[property] !== undefined ? d.properties[property] : 'N/A'}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY + 10}px`);
                }
            })
            .on("mousemove", event => {
                tooltip.style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY + 10}px`);
            })
            .on("mouseleave", () => {
                tooltip.style("opacity", 0).select("svg").remove(); 
            });
    };

    createMap(".fig1", colorScalePopulation, "POP1980"); // Map A: Population in 1980
    createMap(".fig2", colorScaleChange, d => d.properties.POP2010 - d.properties.POP1980); // Map B: Population Change
    createMap(".fig3", colorScaleGini, null, true); // Map C: Gini Index
});
