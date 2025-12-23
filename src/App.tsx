import { useState, useEffect, useMemo } from 'react';
import {
  Users, Calendar, TrendingUp, Zap,
  Search, Download,
  RefreshCw, MessageSquare
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, FunnelChart, Funnel, LabelList
} from 'recharts';
import { format, subDays, parseISO, isAfter, isBefore, isValid } from 'date-fns';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChatWidget } from './components/ChatWidget';

// --- Types ---

interface Lead {
  timestamp: Date;
  leadId: string;
  nombre: string;
  telefono: string;
  canalOrigen: string;
  painPoint: string;
  scoringBot: "A" | "B" | "C" | "D";
  conversacionCompleta: boolean;
  citaAgendada: boolean;
  fechaCita: Date | null;
  asistio: boolean | null;
  cerroVenta: boolean | null;
  importeVenta: number | null;
  tiempoRespuestaBot: number; // segundos
  mensajesIntercambiados: number;
  estadoActual: string;
}

interface FilterState {
  dateRange: { start: Date | null; end: Date | null };
  canal: string;
  scoring: string;
  estado: string;
  soloCitas: boolean;
  soloVentas: boolean;
  search: string;
}

// --- Utils & Mock Data ---

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}



// Mock Data Generator
const generateMockLeads = (count: number): Lead[] => {
  const leads: Lead[] = [];
  const channels = ['Instagram', 'Instagram', 'Instagram', 'Facebook', 'Facebook', 'Google', 'WhatsApp Directo', 'Referidos'];
  const painPoints = ['Dolor rodilla', 'Ansiedad', 'Dolor espalda', 'Pérdida peso', 'Insomnio', 'Estrés laboral'];

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = subDays(now, daysAgo);
    // Randomize time between 08:00 and 23:00
    date.setHours(8 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60));

    const scoringRoll = Math.random();
    let scoring: "A" | "B" | "C" | "D" = "B";
    if (scoringRoll < 0.25) scoring = "A";
    else if (scoringRoll < 0.85) scoring = "B";
    else if (scoringRoll < 0.95) scoring = "C";
    else scoring = "D";

    const canal = channels[Math.floor(Math.random() * channels.length)];
    const pain = painPoints[Math.floor(Math.random() * painPoints.length)];

    // Funnel logic simulation
    const convCompleta = Math.random() > 0.1;
    let cita = false;
    let fechaCita: Date | null = null;
    let asistio: boolean | null = null;
    let cerro = false;
    let importe: number | null = null;
    let estado = "Conversación Activa";

    if (convCompleta && Math.random() > 0.6) {
      cita = true;
      estado = "Cita Agendada";
      // Cita is usually 1-3 days after lead
      fechaCita = new Date(date);
      fechaCita.setDate(fechaCita.getDate() + 1 + Math.floor(Math.random() * 3));
      fechaCita.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);

      // Check if cita has passed
      if (fechaCita < now) {
        if (Math.random() > 0.2) { // 80% asistencia
          asistio = true;
          estado = "Asistió";
          if (Math.random() > 0.35) { // 65% cierre
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
      timestamp: date,
      leadId: `LEAD-${1000 + i}`,
      nombre: `Usuario ${1000 + i}`,
      telefono: `+34 6${Math.floor(Math.random() * 100)} ${Math.floor(Math.random() * 100)} ${Math.floor(Math.random() * 100)}`,
      canalOrigen: canal,
      painPoint: pain,
      scoringBot: scoring,
      conversacionCompleta: convCompleta,
      citaAgendada: cita,
      fechaCita: fechaCita,
      asistio: asistio,
      cerroVenta: cerro,
      importeVenta: importe,
      tiempoRespuestaBot: Math.floor(Math.random() * 10) + 1,
      mensajesIntercambiados: 5 + Math.floor(Math.random() * 20),
      estadoActual: estado
    });
  }
  return leads.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// --- Components ---

const StatusBadge = ({ uptime }: { uptime: number }) => {
  let color = "bg-successGreen";
  let text = "OPERATIVO";
  if (uptime < 99) { color = "bg-yellow-500"; text = "DEGRADADO"; }
  if (uptime < 95) { color = "bg-alertRed"; text = "CAÍDO"; }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-opacity-20 bg-gray-800 border border-gray-700">
      <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
      <span className={`text-xs font-bold ${color.replace('bg-', 'text-')}`}>{text} {uptime}%</span>
    </div>
  );
};

const KpiCard = ({ title, value, subtext, icon: Icon, trend, colorClass = "text-textMain", metaStatus }: any) => (
  <div className="bg-card border border-cardBorder rounded-xl p-5 flex flex-col justify-between hover:border-accentBlue transition-colors duration-300 shadow-lg relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={48} />
    </div>
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
      {trend && (
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", trend > 0 ? "bg-successGreen/20 text-successGreen" : "bg-alertRed/20 text-alertRed")}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-2">
      <div className={cn("text-3xl font-bold font-mono tracking-tight", colorClass)}>{value}</div>
      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
        {subtext}
        {metaStatus !== undefined && (
          <span className={cn("w-2 h-2 rounded-full", metaStatus === 'good' ? "bg-successGreen" : metaStatus === 'warn' ? "bg-yellow-500" : "bg-alertRed")}></span>
        )}
      </div>
    </div>
  </div>
);

// --- Charts ---

const FunnelChartComponent = ({ data }: { data: Lead[] }) => {
  const stages = [
    { name: 'Leads Recibidos', value: data.length, fill: '#3b82f6' },
    { name: 'Conv. Completa', value: data.filter(l => l.conversacionCompleta).length, fill: '#60a5fa' },
    { name: 'Cita Agendada', value: data.filter(l => l.citaAgendada).length, fill: '#00d4ff' },
    { name: 'Asistió', value: data.filter(l => l.asistio).length, fill: '#34d399' },
    { name: 'Cerró Venta', value: data.filter(l => l.cerroVenta).length, fill: '#2ed573' },
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1f3a', borderColor: '#2d3250', color: '#e5e7eb' }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          <Funnel dataKey="value" data={stages} isAnimationActive>
            <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Main App Component ---

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<'live' | 'mock' | 'loading'>('loading');

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: subDays(new Date(), 30), end: new Date() },
    canal: 'Todos',
    scoring: 'Todos',
    estado: 'Todos',
    soloCitas: false,
    soloVentas: false,
    search: '',
  });

  // Fetch Data logic
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching data from n8n...");
      const res = await fetch('https://n8n.manusp.site/webhook/64dbf343-08e3-4a0b-8c8f-cd87c1554115');
      if (!res.ok) throw new Error(`API Failed with status: ${res.status}`);
      const json = await res.json();
      console.log("Fetched raw data count:", Array.isArray(json) ? json.length : "Single Object");

      // Normalize - filter out anything that doesn't look like a lead (e.g. the Count object)
      const dataArray = Array.isArray(json) ? json : (json.data || []);
      const normalized: Lead[] = dataArray
        .filter((item: any) => item && item.timestamp && item.timestamp !== "")
        .map((item: any) => ({
          ...item,
          timestamp: parseISO(item.timestamp), // Ensure date object
          fechaCita: item.fechaCita && item.fechaCita !== "" ? parseISO(item.fechaCita) : null,
        }));

      console.log("Normalized leads count:", normalized.length);

      if (normalized.length === 0 && dataArray.length > 0) {
        console.warn("Data found but no valid leads after normalization. Falling back to mock.");
        setLeads(generateMockLeads(100));
        setDataSource('mock');
      } else {
        setLeads(normalized.length > 0 ? normalized : generateMockLeads(100));
        setDataSource(normalized.length > 0 ? 'live' : 'mock');
      }
    } catch (e) {
      console.error("Dashboard Fetch Error:", e);
      setLeads(generateMockLeads(100));
      setDataSource('mock');
    } finally {
      setLoading(true); // Keep loading state if needed, or just set last updated
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // 60s auto refresh
    return () => clearInterval(interval);
  }, []);

  // Filter Logic
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Date Range
      if (filters.dateRange.start && isBefore(lead.timestamp, filters.dateRange.start)) return false;
      if (filters.dateRange.end && isAfter(lead.timestamp, filters.dateRange.end)) return false;

      // Selectors
      if (filters.canal !== 'Todos' && lead.canalOrigen !== filters.canal) return false;
      if (filters.scoring !== 'Todos' && lead.scoringBot !== filters.scoring) return false;
      if (filters.estado !== 'Todos' && lead.estadoActual !== filters.estado) return false;

      // Toggles
      if (filters.soloCitas && !lead.citaAgendada) return false;
      if (filters.soloVentas && !lead.cerroVenta) return false;

      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!lead.nombre.toLowerCase().includes(searchLower) && !lead.telefono.includes(searchLower)) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = (a.timestamp && isValid(a.timestamp)) ? a.timestamp.getTime() : 0;
      const timeB = (b.timestamp && isValid(b.timestamp)) ? b.timestamp.getTime() : 0;
      return timeB - timeA;
    });
  }, [leads, filters]);

  // Derived KPIs
  const kpis = useMemo(() => {
    const total = filteredLeads.length;
    const agendadas = filteredLeads.filter(l => l.citaAgendada).length;
    const asistencias = filteredLeads.filter(l => l.asistio).length;
    const ventas = filteredLeads.filter(l => l.cerroVenta).length;
    const revenue = filteredLeads.reduce((acc, l) => acc + (l.importeVenta || 0), 0);

    // Calculate conversions
    const convCita = total > 0 ? (agendadas / total) * 100 : 0;
    const convVenta = asistencias > 0 ? (ventas / asistencias) * 100 : 0;

    // Time saved calculation: 15 min per lead
    const minutesSaved = total * 15;
    const hoursSaved = Math.floor(minutesSaved / 60);

    // Bot Efficiency
    const convCompletaCount = filteredLeads.filter(l => l.conversacionCompleta).length;
    const convCompletaRate = total > 0 ? (convCompletaCount / total) * 100 : 0;
    const avgResponseTime = total > 0 ? filteredLeads.reduce((acc, l) => acc + l.tiempoRespuestaBot, 0) / total : 0;

    return {
      total,
      agendadas,
      asistencias,
      ventas,
      revenue,
      convCita,
      convVenta,
      hoursSaved,
      convCompletaRate,
      avgResponseTime
    };
  }, [filteredLeads]);

  // Chart Data: Timeline Area
  const timelineData = useMemo(() => {
    // Group by day
    const days: Record<string, any> = {};
    filteredLeads.forEach(l => {
      if (!l.timestamp || !isValid(l.timestamp)) return;
      const key = format(l.timestamp, 'dd/MM');
      if (!days[key]) days[key] = { name: key, leads: 0, citas: 0, asistencias: 0, ventas: 0 };
      days[key].leads++;
      if (l.citaAgendada) days[key].citas++;
      if (l.asistio) days[key].asistencias++;
      if (l.cerroVenta) days[key].ventas++;
    });
    return Object.values(days);
  }, [filteredLeads]);

  // Chart Data: Channels
  const channelData = useMemo(() => {
    const counts: Record<string, { name: string, leads: number, conversions: number }> = {};
    filteredLeads.forEach(l => {
      if (!counts[l.canalOrigen]) counts[l.canalOrigen] = { name: l.canalOrigen, leads: 0, conversions: 0 };
      counts[l.canalOrigen].leads++;
      if (l.citaAgendada) counts[l.canalOrigen].conversions++;
    });
    return Object.values(counts)
      .map(c => ({ ...c, rate: c.leads > 0 ? (c.conversions / c.leads) * 100 : 0 }))
      .sort((a, b) => b.rate - a.rate);
  }, [filteredLeads]);

  // Chart Data: Scoring
  const scoringData = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    filteredLeads.forEach(l => {
      if (counts[l.scoringBot] !== undefined) counts[l.scoringBot]++;
    });
    return [
      { name: 'A', value: counts.A, fill: '#2ed573' },
      { name: 'B', value: counts.B, fill: '#00d4ff' },
      { name: 'C', value: counts.C, fill: '#ffa502' },
      { name: 'D', value: counts.D, fill: '#ff4757' },
    ];
  }, [filteredLeads]);




  return (
    <div className="min-h-screen bg-background text-textMain font-sans pb-20">
      {/* Header */}
      <header className="bg-card border-b border-cardBorder p-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-accentBlue to-accentGreen p-2 rounded-lg">
              <Zap size={24} className="text-gray-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">APFitWorld <span className="text-accentBlue font-light">System</span></h1>
              <p className="text-xs text-gray-400">Sistema de Autonomía Comercial™</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge uptime={99.8} />
            <div className="text-right hidden md:block">
              <div className="text-xs text-gray-400">Origen de Datos</div>
              <div className={cn("text-sm font-bold", dataSource === 'live' ? "text-accentGreen" : "text-alertRed")}>
                {dataSource === 'live' ? "DATOS REALES (N8N)" : dataSource === 'mock' ? "MODO DEMO (MOCK)" : "CARGANDO..."}
              </div>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-xs text-gray-400">Última sincro</div>
              <div className="text-sm font-mono text-accentGreen">{format(lastUpdated, 'HH:mm:ss')}</div>
            </div>
            <button onClick={fetchData} className="p-2 bg-cardBorder rounded-full hover:bg-gray-700 transition">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">

        {/* Filters Panel */}
        <section className="bg-card border border-cardBorder rounded-xl p-4 sticky top-20 z-40 shadow-xl overflow-x-auto">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Simple Date Select - just show stub for now or functional native picker */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Desde</label>
              <input type="date" className="bg-background border border-cardBorder rounded px-2 py-1 text-sm w-32" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Canal</label>
              <select
                className="bg-background border border-cardBorder rounded px-2 py-1 text-sm w-32"
                value={filters.canal} onChange={e => setFilters({ ...filters, canal: e.target.value })}
              >
                {['Todos', 'Instagram', 'Facebook', 'Google', 'WhatsApp Directo'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Scoring</label>
              <select
                className="bg-background border border-cardBorder rounded px-2 py-1 text-sm w-24"
                value={filters.scoring} onChange={e => setFilters({ ...filters, scoring: e.target.value })}
              >
                {['Todos', 'A', 'B', 'C', 'D'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-1.5 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar lead..."
                  className="w-full bg-background border border-cardBorder rounded pl-8 py-1 text-sm focus:border-accentBlue outline-none transition-colors"
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, soloCitas: !filters.soloCitas })}
                className={cn("px-3 py-1 rounded text-sm border transition-colors", filters.soloCitas ? "bg-accentBlue/20 border-accentBlue text-accentBlue" : "border-cardBorder text-gray-400")}
              >
                Citas Agendadas
              </button>
              <button
                onClick={() => setFilters({ ...filters, soloVentas: !filters.soloVentas })}
                className={cn("px-3 py-1 rounded text-sm border transition-colors", filters.soloVentas ? "bg-accentGreen/20 border-accentGreen text-accentGreen" : "border-cardBorder text-gray-400")}
              >
                Ventas
              </button>
            </div>
          </div>
        </section>

        {/* KPIs Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            title="Leads Totales"
            value={kpis.total}
            subtext="Últimos 30 días"
            icon={Users}
            trend={12}
          />
          <KpiCard
            title="Conv. Bot → Cita"
            value={`${kpis.convCita.toFixed(1)}%`}
            subtext={`${kpis.agendadas} citas agendadas`}
            icon={Calendar}
            metaStatus={kpis.convCita >= 30 ? 'good' : kpis.convCita >= 20 ? 'warn' : 'bad'}
            colorClass={kpis.convCita >= 30 ? 'text-successGreen' : kpis.convCita >= 20 ? 'text-yellow-500' : 'text-alertRed'}
          />
          <KpiCard
            title="Conv. Cita → Venta"
            value={`${kpis.convVenta.toFixed(1)}%`}
            subtext={`${kpis.ventas} ventas cerradas`}
            icon={TrendingUp}
            metaStatus={kpis.convVenta >= 65 ? 'good' : 'warn'}
            colorClass={kpis.convVenta >= 65 ? 'text-successGreen' : 'text-gray-200'}
          />

        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolution Chart */}
          <div className="bg-card border border-cardBorder rounded-xl p-5 h-[350px]">
            <h3 className="text-gray-400 text-sm font-medium mb-4">Evolución del Funnel</h3>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ed573" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2ed573" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #2d3250' }} />
                <Area type="monotone" dataKey="leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="ventas" stroke="#2ed573" fillOpacity={1} fill="url(#colorVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Scoring Donut */}
          <div className="bg-card border border-cardBorder rounded-xl p-5 h-[350px] flex flex-col">
            <h3 className="text-gray-400 text-sm font-medium mb-4">Calidad de Leads (Scoring IA)</h3>
            <div className="flex-1 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoringData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {scoringData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={scoringData[index].fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round((kpis.agendadas / kpis.total) * 100) || 0}</div>
                  <div className="text-xs text-gray-500">Quality Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Channels Bar */}
          <div className="bg-card border border-cardBorder rounded-xl p-5 h-[350px]">
            <h3 className="text-gray-400 text-sm font-medium mb-4">Conversión por Canal</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart layout="vertical" data={channelData} barCategoryGap="20%">
                <CartesianGrid stroke="#2d3250" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" unit="%" />
                <YAxis dataKey="name" type="category" width={100} stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip cursor={{ fill: '#2d3250', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1a1f3a', borderColor: '#2d3250' }} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {channelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2ed573' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel Chart */}
          <div className="bg-card border border-cardBorder rounded-xl p-5 h-[350px]">
            <h3 className="text-gray-400 text-sm font-medium mb-4">Funnel de Conversión</h3>
            <FunnelChartComponent data={filteredLeads} />
          </div>


        </section>

        {/* Table Section */}
        <section className="bg-card border border-cardBorder rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-cardBorder flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Users size={18} className="text-accentBlue" />
              Últimos Leads
            </h3>
            <button className="text-xs text-accentBlue hover:underline flex items-center gap-1">
              <Download size={14} /> Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Lead</th>
                  <th className="px-6 py-3">Canal</th>
                  <th className="px-6 py-3">Scoring</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder">
                {filteredLeads.slice(0, 10).map((lead) => (
                  <tr key={lead.leadId} className="hover:bg-cardBorder/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {format(lead.timestamp, 'dd MMM HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{lead.nombre}</div>
                      <div className="text-xs text-gray-500">{lead.telefono}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-gray-800 border border-gray-700">
                        {lead.canalOrigen}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border",
                        lead.scoringBot === 'A' ? "bg-green-500/10 border-green-500 text-green-500" :
                          lead.scoringBot === 'B' ? "bg-blue-500/10 border-blue-500 text-blue-500" :
                            lead.scoringBot === 'C' ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" :
                              "bg-red-500/10 border-red-500 text-red-500"
                      )}>
                        {lead.scoringBot}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        lead.estadoActual === 'Cerró Venta' ? "bg-green-500/20 text-green-400" :
                          lead.estadoActual === 'Cita Agendada' ? "bg-blue-500/20 text-blue-400" :
                            "bg-gray-700 text-gray-300"
                      )}>
                        {lead.estadoActual}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {lead.importeVenta ? (
                        <span className="text-successGreen font-bold">€{lead.importeVenta}</span>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition">
                        <MessageSquare size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      <ChatWidget />


    </div>
  );
}

export default App;
