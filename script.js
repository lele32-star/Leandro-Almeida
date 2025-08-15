// Configurações do PDF
const cfg = {
    map: document.getElementById('cfgMap'),
    route: document.getElementById('cfgRoute'),
    distance: document.getElementById('cfgDistance'),
    aircraft: document.getElementById('cfgAircraft'),
    rate: document.getElementById('cfgRate'),
    legs: document.getElementById('cfgLegs'),
    subtotal: document.getElementById('cfgSubtotal'),
    adjustment: document.getElementById('cfgAdjustment'),
    total: document.getElementById('cfgTotal'),
    general: document.getElementById('cfgGeneral')
};

let map, markers = [], line, lastCalc;

// Função para formatar valores em BRL
function toBRL(val) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(val);
}

// Função para garantir que o mapa existe
function ensureMap(center) {
    if (!map) {
        map = L.map('map').setView(center || [-15.7942, -47.8822], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
}

// Função para calcular distância entre dois pontos (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Função para buscar coordenadas de aeroportos (simulada)
function getAirportCoordinates(query) {
    const airports = {
        'SBBR': { coords: [-15.8697, -47.9172], name: 'Brasília' },
        'SBBH': { coords: [-19.8512, -43.9506], name: 'Pampulha' },
        'SBSP': { coords: [-23.6261, -46.6556], name: 'Congonhas' },
        'SBGR': { coords: [-23.4356, -46.4731], name: 'Guarulhos' },
        'SBRJ': { coords: [-22.8099, -43.2505], name: 'Santos Dumont' },
        'SBGL': { coords: [-22.8099, -43.2505], name: 'Galeão' },
        'SBPA': { coords: [-29.9939, -51.1711], name: 'Porto Alegre' },
        'SBRF': { coords: [-8.1264, -34.9236], name: 'Recife' },
        'SBSV': { coords: [-12.9086, -38.3225], name: 'Salvador' },
        'SBFZ': { coords: [-3.7763, -38.5267], name: 'Fortaleza' }
    };

    const upperQuery = query.toUpperCase();
    
    // Busca por código ICAO
    if (airports[upperQuery]) {
        return airports[upperQuery];
    }
    
    // Busca por nome da cidade
    for (const [icao, data] of Object.entries(airports)) {
        if (data.name.toLowerCase().includes(query.toLowerCase()) || 
            query.toLowerCase().includes(data.name.toLowerCase())) {
            return { ...data, icao };
        }
    }
    
    // Se não encontrar, retorna coordenadas aleatórias para demonstração
    return {
        coords: [-15.7942 + Math.random() * 20 - 10, -47.8822 + Math.random() * 20 - 10],
        name: query
    };
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    
    // Adicionar aeroporto
    document.getElementById('addAirport').addEventListener('click', () => {
        const container = document.getElementById('airports');
        const count = container.children.length + 1;
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label>Aeroporto ${count}</label>
            <input type="text" placeholder="Ex.: SBSP ou 'Congonhas'" data-index="${count - 1}">
        `;
        container.appendChild(div);
    });

    // Calcular rota
    document.getElementById('btCalc').addEventListener('click', async () => {
        try {
            const inputs = document.querySelectorAll('#airports input');
            const places = [];
            
            for (let input of inputs) {
                const val = input.value.trim();
                if (!val) continue;
                
                const airportData = getAirportCoordinates(val);
                places.push({
                    name: airportData.name || val,
                    icao: airportData.icao || (val.length === 4 ? val.toUpperCase() : null),
                    coords: airportData.coords
                });
            }

            if (places.length < 2) {
                throw new Error('Informe pelo menos 2 aeroportos');
            }

            const coords = places.map(p => p.coords);
            
            // Calcular distância total
            let totalKm = 0;
            for (let i = 0; i < coords.length - 1; i++) {
                const [lat1, lon1] = coords[i];
                const [lat2, lon2] = coords[i + 1];
                totalKm += calculateDistance(lat1, lon1, lat2, lon2);
            }

            const roundtrip = document.getElementById('roundtrip').value === 'round';
            const distKm = totalKm * (roundtrip ? 2 : 1);
            const nm = distKm / 1.852;

            const aircraftName = document.getElementById('aircraft').value;
            const rate = parseFloat(document.getElementById('rate').value) || 0;

            const subtotal = distKm * rate;

            const adjType = document.getElementById('adjType').value;
            const adjVal = parseFloat(document.getElementById('adjValue').value) || 0;
            const total = adjType === 'add' ? subtotal + adjVal
                        : adjType === 'sub' ? Math.max(0, subtotal - adjVal)
                        : subtotal;

            // Atualizar mapa
            ensureMap(coords[0]);
            markers.forEach(m => map.removeLayer(m));
            markers = [];
            if (line) { map.removeLayer(line); }
            line = L.polyline(coords).addTo(map);
            markers = coords.map((c, i) => 
                L.marker(c).addTo(map).bindPopup(places[i].icao || places[i].name || `Ponto ${i+1}`)
            );
            map.fitBounds(line.getBounds(), { padding: [20, 20] });
            setTimeout(() => map.invalidateSize(), 200);

            // Atualizar resumo
            const resumo = document.getElementById('resumo');
            const routeStr = places.map(p => p.icao || p.name).join(' → ');
            const legs = (coords.length - 1) * (roundtrip ? 2 : 1);
            const lines = [
                `<b>Rota:</b> ${routeStr} ${roundtrip ? "(ida/volta)" : ""}<br>`,
                `<b>Distância:</b> ${distKm.toFixed(1)} km (${nm.toFixed(1)} NM) — ${legs} perna(s)<br>`,
                `<b>Aeronave:</b> ${aircraftName}<br>`,
                `<b>Tarifa:</b> ${toBRL(rate)}/km<br>`,
                `<b>Subtotal:</b> ${toBRL(subtotal)}<br>`
            ];

            if (adjType === 'add') lines.push(`<b>Despesas acessórias:</b> ${toBRL(adjVal)}<br>`);
            if (adjType === 'sub') lines.push(`<b>Desconto:</b> -${toBRL(adjVal)}<br>`);
            lines.push(`<b>Total:</b> ${toBRL(total)}`);

            resumo.innerHTML = lines.join('\n');

            lastCalc = { places, coords, km: distKm, nm, aircraftName, rate, subtotal, adjType, adjVal, total, round: roundtrip, legs };
            document.getElementById('btPdf').disabled = false;

        } catch (e) {
            alert(e.message);
        }
    });

    // Gerar PDF
    document.getElementById('btPdf').addEventListener('click', () => {
        if (!lastCalc || !map) return;

        // Gerar imagem do mapa
        window.leafletImage(map, function(err, canvas) {
            if (err) {
                console.error('Erro ao gerar imagem do mapa:', err);
                return;
            }

            const imgData = canvas.toDataURL();

            const rows = [];
            if (cfg.route.checked) rows.push(["Rota", lastCalc.places.map(p => p.icao || p.name).join(' → ')]);
            if (cfg.distance.checked) rows.push(["Distância", lastCalc.km.toFixed(1) + " km (" + lastCalc.nm.toFixed(1) + " NM)"]);
            if (cfg.aircraft.checked) rows.push(["Aeronave", lastCalc.aircraftName]);
            if (cfg.rate.checked) rows.push(["Tarifa", toBRL(lastCalc.rate) + "/km"]);
            if (cfg.legs.checked) {
                const legLabel = lastCalc.round ? 'Ida e volta (' + lastCalc.legs + ')' : 'Só ida (' + lastCalc.legs + ')';
                rows.push(["Pernas", legLabel]);
            }
            if (cfg.subtotal.checked) rows.push(["Subtotal", toBRL(lastCalc.subtotal)]);
            if (cfg.adjustment.checked) {
                if (lastCalc.adjType === 'add') rows.push(["Despesas acessórias", toBRL(lastCalc.adjVal)]);
                if (lastCalc.adjType === 'sub') rows.push(["Desconto", '-' + toBRL(lastCalc.adjVal)]);
            }
            if (cfg.total.checked) rows.push([{ text: "Total", bold: true }, { text: toBRL(lastCalc.total), bold: true }]);

            const body = [
                [
                    { text: "Item", style: "tableHeader" },
                    { text: "Informação", style: "tableHeader" }
                ],
                ...rows
            ];

            const content = [
                { text: "Cotação de Voo Executivo", style: "h1", alignment: "center", margin: [0, 0, 0, 15] }
            ];
            if (cfg.map.checked) content.push({ image: imgData, width: 460, margin: [0, 0, 0, 15] });
            content.push({
                table: {
                    headerRows: 1,
                    widths: ["*", "*"],
                    body
                },
                layout: {
                    fillColor: function(rowIndex) {
                        return rowIndex === 0 ? '#eeeeee' : (rowIndex % 2 === 0 ? '#f5f5f5' : null);
                    }
                }
            });

            const generalText = document.getElementById('generalInfo').value;
            if (cfg.general.checked && generalText.trim()) {
                content.push({ text: generalText, margin: [0, 15, 0, 0] });
            }

            const doc = {
                pageSize: "A4",
                pageMargins: [40, 60, 40, 60],
                content,
                styles: {
                    h1: { fontSize: 18, bold: true },
                    tableHeader: { bold: true }
                },
                defaultStyle: {
                    fontSize: 11
                }
            };
            pdfMake.createPdf(doc).download("cotacao-voo.pdf");
        });
    });
});

// Função para validar entrada de aeroportos
function validateAirportInput(input) {
    const value = input.value.trim();
    if (value.length === 4 && /^[A-Z]{4}$/.test(value.toUpperCase())) {
        input.value = value.toUpperCase();
    }
}

// Adicionar validação em tempo real para códigos ICAO
document.addEventListener('input', function(e) {
    if (e.target.matches('#airports input')) {
        validateAirportInput(e.target);
    }
});
