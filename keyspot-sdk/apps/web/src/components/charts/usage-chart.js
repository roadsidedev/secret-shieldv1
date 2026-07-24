'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageChart = UsageChart;
exports.QuotaGauge = QuotaGauge;
const recharts_1 = require("recharts");
function UsageChart({ data, type = 'line' }) {
    if (!data || data.length === 0) {
        return (<div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
        No usage data yet
      </div>);
    }
    if (type === 'bar') {
        return (<recharts_1.ResponsiveContainer width="100%" height={300}>
        <recharts_1.BarChart data={data}>
          <recharts_1.CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800"/>
          <recharts_1.XAxis dataKey="bucket" tick={{ fontSize: 11 }} className="text-zinc-500" tickFormatter={(v) => v.slice(5, 10)}/>
          <recharts_1.YAxis tick={{ fontSize: 11 }} className="text-zinc-500"/>
          <recharts_1.Tooltip contentStyle={{
                background: 'hsl(0 0% 100%)',
                border: '1px solid hsl(240 5% 84%)',
                borderRadius: '8px',
                fontSize: '12px',
            }}/>
          <recharts_1.Legend />
          <recharts_1.Bar dataKey="requests" fill="#18181b" radius={[4, 4, 0, 0]} name="Requests"/>
          <recharts_1.Bar dataKey="errors" fill="#ef4444" radius={[4, 4, 0, 0]} name="Errors"/>
        </recharts_1.BarChart>
      </recharts_1.ResponsiveContainer>);
    }
    return (<recharts_1.ResponsiveContainer width="100%" height={300}>
      <recharts_1.LineChart data={data}>
        <recharts_1.CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800"/>
        <recharts_1.XAxis dataKey="bucket" tick={{ fontSize: 11 }} className="text-zinc-500" tickFormatter={(v) => v.slice(5, 10)}/>
        <recharts_1.YAxis tick={{ fontSize: 11 }} className="text-zinc-500"/>
        <recharts_1.Tooltip contentStyle={{
            background: 'hsl(0 0% 100%)',
            border: '1px solid hsl(240 5% 84%)',
            borderRadius: '8px',
            fontSize: '12px',
        }}/>
        <recharts_1.Legend />
        <recharts_1.Line type="monotone" dataKey="requests" stroke="#18181b" strokeWidth={2} dot={false} name="Requests"/>
        <recharts_1.Line type="monotone" dataKey="avgLatency" stroke="#a1a1aa" strokeWidth={2} dot={false} name="Avg Latency (ms)"/>
      </recharts_1.LineChart>
    </recharts_1.ResponsiveContainer>);
}
function QuotaGauge({ current, max, label }) {
    const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
    const isWarning = pct > 80;
    const isCritical = pct > 95;
    return (<div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className={isCritical ? 'text-red-600 font-medium' : isWarning ? 'text-amber-600' : 'text-zinc-600'}>
          {current.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isCritical
            ? 'bg-red-500'
            : isWarning
                ? 'bg-amber-500'
                : 'bg-zinc-950 dark:bg-white'}`} style={{ width: `${pct}%` }}/>
      </div>
    </div>);
}
//# sourceMappingURL=usage-chart.js.map