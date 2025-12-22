
import { subDays, format } from 'date-fns';
import fs from 'fs';
import path from 'path';

// Utils
const formatDate = (date) => date.toISOString();

// Mock Data Generator (Ported from App.tsx)
const generateMockLeads = (count) => {
    const leads = [];
    const channels = ['Instagram', 'Instagram', 'Instagram', 'Facebook', 'Facebook', 'Google', 'WhatsApp Directo', 'Referidos'];
    const painPoints = ['Dolor rodilla', 'Ansiedad', 'Dolor espalda', 'Pérdida peso', 'Insomnio', 'Estrés laboral'];

    const now = new Date();

    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const date = subDays(now, daysAgo);
        date.setHours(8 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60));

        const scoringRoll = Math.random();
        let scoring = "B";
        if (scoringRoll < 0.25) scoring = "A";
        else if (scoringRoll < 0.85) scoring = "B";
        else if (scoringRoll < 0.95) scoring = "C";
        else scoring = "D";

        const canal = channels[Math.floor(Math.random() * channels.length)];
        const pain = painPoints[Math.floor(Math.random() * painPoints.length)];

        // Funnel logic
        const convCompleta = Math.random() > 0.1;
        let cita = false;
        let fechaCita = null;
        let asistio = null;
        let cerro = false;
        let importe = null;
        let estado = "Conversación Activa";

        if (convCompleta && Math.random() > 0.6) {
            cita = true;
            estado = "Cita Agendada";
            fechaCita = new Date(date);
            fechaCita.setDate(fechaCita.getDate() + 1 + Math.floor(Math.random() * 3));
            fechaCita.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);

            if (fechaCita < now) {
                if (Math.random() > 0.2) {
                    asistio = true;
                    estado = "Asistió";
                    if (Math.random() > 0.35) {
                        cerro = true;
                        estado = "Cerró Venta";
                        importe = 500 + Math.floor(Math.random() * 700);
                    } else {
                        estado = "No Convirtió";
                        cerro = false;
                    }
                } else {
                    asistio = false;
                    estado = "No Asistió";
                }
            }
        }

        leads.push({
            timestamp: formatDate(date),
            leadId: `LEAD-${1000 + i}`,
            nombre: `Usuario ${1000 + i}`,
            telefono: `+34 6${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 100)} ${Math.floor(Math.random() * 100)} ${Math.floor(Math.random() * 100)}`,
            canalOrigen: canal,
            painPoint: pain,
            scoringBot: scoring,
            conversacionCompleta: convCompleta,
            citaAgendada: cita,
            fechaCita: fechaCita ? formatDate(fechaCita) : '',
            asistio: asistio !== null ? asistio : '',
            cerroVenta: cerro,
            importeVenta: importe !== null ? importe : '',
            tiempoRespuestaBot: Math.floor(Math.random() * 10) + 1,
            mensajesIntercambiados: 5 + Math.floor(Math.random() * 20),
            estadoActual: estado
        });
    }
    return leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Convert to CSV
const leads = generateMockLeads(100);
const headers = Object.keys(leads[0]).join(',');
const rows = leads.map(l => Object.values(l).map(v => typeof v === 'string' ? `"${v}"` : v).join(','));
const csvContent = [headers, ...rows].join('\n');

const outputPath = path.resolve('mock_leads.csv');
fs.writeFileSync(outputPath, csvContent);
console.log(`CSV generated at: ${outputPath}`);
