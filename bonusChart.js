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
        .domain(d3.extent(countyData, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(countyData, d => d.gini))
        .range([height, 0]);

    const line = d3.line()
        .x(d => {
            console.log("d",d)
            return xScale(new Date(d.year))}
    
    )
        .y(d => yScale(d.gini));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(5));

    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
        )
        .style("stroke-dasharray", ("3,3"))
        .style("color", "#ddd");


    svg.append("path")
        .datum(countyData)
        .attr("fill", "none")
        .attr("stroke", "#007acc")
        .attr("stroke-width", 1.5)
        .attr("d", d=>{
            console.log(d)
            return line(d)});

    tooltip.style("opacity", 1)
        .append("div")
        .html(`<strong>${fipsMap[fipsCode].fullName}</strong><br>Gini Index over Time`);

    console.log(`Rendering line chart for ${fipsMap[fipsCode].fullName}`, countyData);
};
