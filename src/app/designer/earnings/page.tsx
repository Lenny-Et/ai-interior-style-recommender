"use client";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { DollarSign, TrendingUp, Download, Clock, CheckCircle, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatDate } from "@/lib/utils";

const MONTHLY = [
  { month: "Oct", earnings: 820  },
  { month: "Nov", earnings: 1450 },
  { month: "Dec", earnings: 1100 },
  { month: "Jan", earnings: 2300 },
  { month: "Feb", earnings: 1800 },
  { month: "Mar", earnings: 3200 },
  { month: "Apr", earnings: 2700 },
];

const BREAKDOWN = [
  { name: "Living Room", value: 4200, color: "#d946ef" },
  { name: "Bedroom",     value: 2800, color: "#7c3aed" },
  { name: "Kitchen",     value: 1500, color: "#f59e0b" },
  { name: "Other",       value: 740,  color: "#06b6d4" },
];

const PAYOUTS = [
  { id: "PO-341", date: "2026-04-01", amount: 2880, status: "Completed", method: "Bank Transfer" },
  { id: "PO-298", date: "2026-03-01", amount: 2880, status: "Completed", method: "Bank Transfer" },
  { id: "PO-241", date: "2026-02-01", amount: 1620, status: "Completed", method: "Bank Transfer" },
  { id: "PO-442", date: "2026-04-08", amount: 2430, status: "Pending",   method: "Bank Transfer" },
];

export default function EarningsPage() {
  const totalGross     = 12370;
  const platformFee    = Math.round(totalGross * 0.12);
  const netEarnings    = totalGross - platformFee;
  const pendingPayout  = 2430;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Earnings & Payouts</h1>
          <p className="text-text-muted text-sm">All amounts processed via Chapa escrow</p>
        </div>
        <Button><Download className="w-4 h-4" /> Export Statement</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Gross Earned",    value: `$${totalGross.toLocaleString()}`,    icon: DollarSign,  color: "text-brand-400",    bg: "bg-brand-500/10" },
          { label: "Platform Fee (12%)", value: `-$${platformFee.toLocaleString()}`, icon: ArrowUpRight, color: "text-red-400",     bg: "bg-red-500/10" },
          { label: "Net Earnings",    value: `$${netEarnings.toLocaleString()}`,   icon: TrendingUp,  color: "text-emerald-400",  bg: "bg-emerald-500/10" },
          { label: "Pending Payout",  value: `$${pendingPayout.toLocaleString()}`, icon: Clock,       color: "text-gold-400",     bg: "bg-gold-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-xl font-bold text-white font-display">{value}</div>
            <div className="text-xs text-text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Pending payout portal */}
      <div className="relative rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-900/20 to-surface-card p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <Badge variant="gold" className="mb-2"><Clock className="w-3 h-3" /> Pending</Badge>
          <h2 className="font-semibold text-white mb-1">You have $2,430 awaiting release</h2>
          <p className="text-sm text-text-muted">Client approval is pending on TK-103. Funds release automatically upon approval.</p>
        </div>
        <Button variant="gold">Request Early Release</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Monthly bar chart */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Monthly Earnings</h2>
          </div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY}>
                <XAxis dataKey="month" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" }} />
                <Bar dataKey="earnings" fill="#d946ef" radius={[6,6,0,0]} name="Earnings ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie by room */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Earnings by Room Type</h2>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={BREAKDOWN} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {BREAKDOWN.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {BREAKDOWN.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
                    <span className="text-text-muted">{b.name}</span>
                  </div>
                  <span className="font-medium text-white">${b.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Payout history */}
      <div>
        <h2 className="font-semibold text-white mb-3">Payout History</h2>
        <Card>
          <table className="data-table">
            <thead>
              <tr><th>Reference</th><th>Date</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {PAYOUTS.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.id}</td>
                  <td className="text-xs text-text-muted">{formatDate(p.date)}</td>
                  <td className="text-xs text-text-muted">{p.method}</td>
                  <td><Badge variant={p.status === "Completed" ? "green" : "gold"}>{p.status === "Completed" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{p.status}</Badge></td>
                  <td className="text-right font-semibold">${p.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
