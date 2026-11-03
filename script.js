
// Bollebarometeret – data indlæses fra Excel-eksporteret CSV

const GREEN_COLORS = [
    "#31452F",
    "#71816A",
    "#A8B49A",
    "#D5DDC9"
];

Chart.defaults.font.family = "Arial";
Chart.defaults.color = "#332D26";

// Konverterer værdier fra CSV til tal
function parseNumber(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const normalized = String(value).trim().replace(",", ".");

    if (normalized.toUpperCase() === "NULL") {
        return null;
    }

    const number = Number(normalized);

    return Number.isFinite(number) ? number : null;
}

// Formaterer tal efter dansk skrivemåde
function formatNumber(value, decimals = 1) {
    return value.toLocaleString("da-DK", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Beregner gennemsnit
function average(values) {
    const valid = values.filter(value =>
        value !== null && Number.isFinite(value)
    );

    if (valid.length === 0) {
        return null;
    }

    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

// Indlæser data fra CSV-filen
Papa.parse("data/frederiksberg.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function (results) {

        const places = results.data.map(row => ({
            name: row.name,
            bmoScore: parseNumber(row.bmo_score),
            price: parseNumber(row.bmo_price),
            cheeseType: row.cheese_type || "Ikke oplyst",
            reviewUrl: row.review_url || ""
        }));

        renderPage(places);
    },

    error: function (error) {
        console.error("CSV-filen kunne ikke indlæses:", error);

        document.getElementById("pivotTable").innerHTML =
            '<tr><td colspan="4">Data kunne ikke indlæses. Kontrollér CSV-filens placering.</td></tr>';

        document.getElementById("placesTable").innerHTML =
            '<tr><td colspan="5">Data kunne ikke indlæses.</td></tr>';
    }
});

// Samler alle funktionerne
function renderPage(places) {
    updateStatistics(places);
    createPriceChart(places);
    createScoreChart(places);
    createPivotTable(places);
    createPlacesTable(places);
    updateConclusion(places);
}

// Opdaterer de tre nøgletal
function updateStatistics(places) {

    const prices = places.map(place => place.price);
    const scores = places.map(place => place.bmoScore);

    const avgPrice = average(prices);
    const avgScore = average(scores);

    document.getElementById("placesCount").textContent =
        places.length;

    document.getElementById("averagePrice").textContent =
        avgPrice === null ? "–" : formatNumber(avgPrice, 2) + " kr.";

    document.getElementById("averageScore").textContent =
        avgScore === null ? "–" : formatNumber(avgScore, 2);
}

// Diagram 1: Pris på BMO
function createPriceChart(places) {

    const withPrice = places.filter(place =>
        place.price !== null
    );

    new Chart(document.getElementById("priceChart"), {

        type: "bar",

        data: {
            labels: withPrice.map(place => place.name),

            datasets: [{
                label: "Pris på BMO",

                data: withPrice.map(place => place.price),

                backgroundColor: withPrice.map((_, index) =>
                    GREEN_COLORS[index % GREEN_COLORS.length]
                ),

                borderRadius: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: context =>
                            formatNumber(context.parsed.y, 2) + " kr."
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: "Pris i kr."
                    }
                },

                x: {
                    ticks: {
                        maxRotation: 35,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

// Diagram 2: BMO-bedømmelse
function createScoreChart(places) {

    const withScore = places.filter(place =>
        place.bmoScore !== null
    );

    new Chart(document.getElementById("scoreChart"), {

        type: "bar",

        data: {
            labels: withScore.map(place => place.name),

            datasets: [{
                label: "BMO-score",

                data: withScore.map(place => place.bmoScore),

                backgroundColor: withScore.map((_, index) =>
                    GREEN_COLORS[index % GREEN_COLORS.length]
                ),

                borderRadius: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: context =>
                            "BMO-score: " + formatNumber(context.parsed.y, 1)
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    max: 6,

                    title: {
                        display: true,
                        text: "Score"
                    }
                },

                x: {
                    ticks: {
                        maxRotation: 35,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

// Pivottabel: grupperer stederne efter ostetype
function createPivotTable(places) {

    const groups = {};

    places.forEach(place => {

        const type = place.cheeseType || "Ikke oplyst";

        if (!groups[type]) {
            groups[type] = {
                count: 0,
                scores: [],
                prices: []
            };
        }

        groups[type].count++;

        if (place.bmoScore !== null) {
            groups[type].scores.push(place.bmoScore);
        }

        if (place.price !== null) {
            groups[type].prices.push(place.price);
        }
    });

    const tbody = document.getElementById("pivotTable");

    tbody.innerHTML = "";

    Object.entries(groups)
        .sort((a, b) => a[0].localeCompare(b[0], "da"))
        .forEach(([type, group]) => {

            const avgScore = average(group.scores);
            const avgPrice = average(group.prices);

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${escapeHTML(type)}</td>
                <td>${group.count}</td>
                <td>${avgScore === null ? "–" : formatNumber(avgScore, 2)}</td>
                <td>${avgPrice === null ? "–" : formatNumber(avgPrice, 2) + " kr."}</td>
            `;

            tbody.appendChild(row);
        });
}

// Tabel med alle undersøgte steder
function createPlacesTable(places) {

    const tbody = document.getElementById("placesTable");

    tbody.innerHTML = "";

    places.forEach(place => {

        const row = document.createElement("tr");

        const review = place.reviewUrl
            ? `<a href="${escapeAttribute(place.reviewUrl)}" target="_blank" rel="noopener noreferrer">Se anmeldelse</a>`
            : "–";

        row.innerHTML = `
            <td>${escapeHTML(place.name)}</td>
            <td>${place.price === null ? "Ikke oplyst" : formatNumber(place.price, 2) + " kr."}</td>
            <td>${place.bmoScore === null ? "–" : formatNumber(place.bmoScore, 1)}</td>
            <td>${escapeHTML(place.cheeseType)}</td>
            <td>${review}</td>
        `;

        tbody.appendChild(row);
    });
}

// Automatisk konklusion baseret på data
function updateConclusion(places) {

    const avgPrice = average(
        places.map(place => place.price)
    );

    const avgScore = average(
        places.map(place => place.bmoScore)
    );

    const highest = places
        .filter(place => place.bmoScore !== null)
        .sort((a, b) => b.bmoScore - a.bmoScore)[0];

    let text = `Undersøgelsen omfatter ${places.length} steder på Frederiksberg. `;

    if (avgPrice !== null) {
        text += `Den gennemsnitlige registrerede pris på en bolle med ost er ${formatNumber(avgPrice, 2)} kr. `;
    }

    if (avgScore !== null) {
        text += `Den gennemsnitlige BMO-score er ${formatNumber(avgScore, 2)} ud af 6. `;
    }

    if (highest) {
        text += `${highest.name} har den højeste BMO-score med ${formatNumber(highest.bmoScore, 1)}.`;
    }

    document.getElementById("conclusionText").textContent = text;
}

// Sikrer at tekst fra CSV ikke bliver fortolket som HTML
function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function escapeAttribute(value) {
    return escapeHTML(value);
}
