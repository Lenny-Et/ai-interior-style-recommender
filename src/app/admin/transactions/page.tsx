"use client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DollarSign, TrendingUp, ArrowUpRight, Download, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const REV_DATA = [
  { month: "Oct", revenue: 1840, commission: 221 },
  { month: "Nov", revenue: 3200, commission: 384 },
  { month: "Dec", revenue: 2900, commission: 348 },
  { month: "Jan", revenue: 4100, commission: 492 },
  { month: "Feb", revenue: 3800, commission: 456 },
  { month: "Mar", revenue: 5200, commission: 624 },
  { month: "Apr", revenue: 4700, commission: 564 },
];

const TRANSACTIONS = [
  { id: "CHX-9901", date: "2026-04-08", buyer: "Alex Johnson",  seller: "Sara Mitchell",  amount: 2000, commission: 240, status: "Held",      chapaId: "chp_78a12bc" },
  { id: "CHX-9856", date: "2026-04-07", buyer: "Maria Santos",  seller: "James Park",     amount: 1500, commission: 180, status: "Held",      chapaId: "chp_78a11de" },
  { id: "CHX-9741", date: "2026-04-01", buyer: "Emma Walsh",    seller: "Sara Mitchell",  amount: 3200, commission: 384, status: "Completed", chapaId: "chp_78980fg" },
  { id: "CHX-9620", date: "2026-03-28", buyer: "Chris Nguyen",  seller: "Mike Thompson", amount: 800,  commission: 96,  status: "Refunded",  chapaId: "chp_78870hi" },
  { id: "CHX-9512", date: "2026-03-20", buyer: "David Kim",     seller: "Lena Rodriguez",amount: 3500, commission: 420, status: "Completed", chapaId: "chp_77741jk" },
  { id: "CHX-9441", date: "2026-03-15", buyer: "Priya Patel",   seller: "Ana Kowalski",  amount: 1200, commission: 144, status: "Completed", chapaId: "chp_77610lm" },
];

const STATUS_VARIANT: Record<string, "green"|"gold"|"gray"> = { Completed: "green", Held: "gold", Refunded: "gray" };

export default function TransactionsPage() {
  const [search, setSearch] = useState("");

  const totalRevenue    = REV_DATA.reduce((a, r) => a + r.revenue, 0);
  const totalCommission = REV_DATA.reduce((a, r) => a + r.commission, 0);
  const avgCommPct      = ((totalCommission / totalRevenue) * 100).toFixed(1);

  const filtered = TRANSACTIONS.filter((t) =>
    !search || t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.buyer.toLowerCase().includes(search.toLowerCase()) ||
    t.seller.toLowerCase().includes(search.toLowerCase()) ||
    t.chapaId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-400" /> Transaction Monitor
          </h1>
          <p className="text-text-muted text-sm">Real-time view of all marketplace sales via Chapa</p>
        </div>
        <Button variant="ghost"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total GMV",        value: `$${totalRevenue.toLocaleString()}`,    icon: DollarSign,  color: "text-brand-400",    bg: "bg-brand-500/10" },
          { label: "Platform Commission", value: `$${totalCommission.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Avg Commission %",  value: `${avgCommPct}%`,                      icon: ArrowUpRight, color: "text-gold-400",    bg: "bg-gold-500/10" },
          { label: "Total Transactions",value: TRANSACTIONS.length.toString(),         icon: DollarSign,  color: "text-blue-400",    bg: "bg-blue-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-white font-display">{value}</div>
            <div className="text-xs text-text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <div className="p-4 border-b border-surface-border">
          <h2 className="font-semibold text-white">Revenue vs. Commission</h2>
          <p className="text-xs text-text-muted">Last 7 months</p>
        </div>
        <div className="p-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REV_DATA}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d946ef" stopOpacity={0.25}/><stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="com" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" }} />
              <Area type="monotone" dataKey="revenue"    stroke="#d946ef" strokeWidth={2} fill="url(#rev)" name="GMV ($)" />
              <Area type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={2} fill="url(#com)" name="Commission ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Transaction log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">All Transactions</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, user, or Chapa ID…"
              className="pl-9 pr-4 py-2 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" />
          </div>
        </div>
        <Card>
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th><th>Date</th><th>Buyer → Seller</th><th>Chapa ID</th>
                <th className="text-right">Amount</th><th className="text-right">Commission</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.id}</td>
                  <td className="text-xs text-text-muted">{formatDate(t.date)}</td>
                  <td>
                    <p className="text-xs text-purple-100">{t.buyer}</p>
                    <p className="text-[10px] text-text-muted">→ {t.seller}</p>
                  </td>
                  <td><span className="font-mono text-[10px] text-text-muted">{t.chapaId}</span></td>
                  <td className="text-right font-semibold text-sm">${t.amount.toLocaleString()}</td>
                  <td className="text-right text-xs text-emerald-400">+${t.commission}</td>
                  <td><Badge variant={STATUS_VARIANT[t.status] ?? "gray"}>{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
