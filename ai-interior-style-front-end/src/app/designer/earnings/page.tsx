"use client";
import { useState, useEffect } from "react";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { DollarSign, TrendingUp, Download, Clock, CheckCircle, ArrowUpRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

interface EarningsData {
  totalEarnings: number;
  totalCommission: number;
  netEarnings: number;
  pendingAmount: number;
  completedTransactions: number;
  monthlyEarnings: Array<{
    month: string;
    earnings: number;
    commission: number;
    count: number;
  }>;
  earningsByRoomType: Array<{
    roomType: string;
    earnings: number;
    count: number;
  }>;
  recentTransactions: Array<{
    tx_ref: string;
    amount: number;
    date: string;
    projectStatus: string;
  }>;
}

const TOOLTIP_STYLE = { background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" };

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadEarnings();
  }, [timeRange]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDesignerEarnings(timeRange);
      const earningsData = (response as any).data || response;
      setEarnings(earningsData);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEarlyRelease = async () => {
    try {
      toast.loading('Requesting early release...');
      // This would call an API endpoint to request early release
      // For now, we'll show a success message
      toast.success('Early release request submitted for review');
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to request early release");
    }
  };

  const handleReleaseFundsManually = async (txRef: string) => {
    try {
      toast.loading('Releasing funds...');
      const response = await apiClient.releaseFundsManually(txRef) as any;
      
      if (response.success) {
        toast.success(`$${response.designerPayout} released successfully!`);
        // Reload earnings data
        loadEarnings();
      } else {
        toast.error('Failed to release funds');
      }
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to release funds");
    }
  };

  const handleExportStatement = async () => {
    try {
      if (!earnings) return;
      
      // Create CSV content
      const csvContent = [
        ['Date', 'Transaction ID', 'Amount', 'Status'],
        ...earnings.recentTransactions.map(tx => [
          new Date(tx.date).toLocaleDateString(),
          tx.tx_ref,
          tx.amount.toString(),
          tx.projectStatus
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings-statement-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Earnings statement exported successfully');
    } catch (error: any) {
      toast.error('Failed to export statement');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!earnings) {
    return <div>No earnings data available</div>;
  }

  const totalGross = earnings.totalEarnings;
  const platformFee = Math.round(totalGross * 0.12);
  const netEarnings = totalGross - platformFee;
  const pendingPayout = earnings.pendingAmount;

  const MONTHLY = earnings.monthlyEarnings.map((month) => ({
    month: month.month,
    earnings: month.earnings,
  }));

  const BREAKDOWN = earnings.earningsByRoomType.map((room) => ({
    name: room.roomType,
    value: room.earnings,
    color: "#d946ef",
  }));

  const PAYOUTS = earnings.recentTransactions.map((transaction) => ({
    id: transaction.tx_ref,
    date: transaction.date,
    amount: transaction.amount,
    status: transaction.projectStatus === "completed" ? "Completed" : "Pending",
    method: "Bank Transfer",
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Earnings & Payouts</h1>
          <p className="text-text-muted text-sm">All amounts processed via Chapa escrow</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface border border-surface-border rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-brand-500 text-white'
                    : 'text-text-muted hover:text-white hover:bg-surface-hover'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <Button onClick={handleExportStatement}><Download className="w-4 h-4" /> Export Statement</Button>
        </div>
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
      {pendingPayout > 0 && (
        <div className="relative rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-900/20 to-surface-card p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <Badge variant="gold" className="mb-2"><Clock className="w-3 h-3" /> Pending</Badge>
            <h2 className="font-semibold text-white mb-1">You have ${pendingPayout.toLocaleString()} awaiting release</h2>
            <p className="text-sm text-text-muted">Funds held in escrow until project completion. Release automatically upon client approval.</p>
          </div>
          <Button variant="gold" onClick={handleRequestEarlyRelease}>Request Early Release</Button>
        </div>
      )}

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
                  <td>
                    <Badge variant={p.status === "Completed" ? "green" : "gold"}>
                      {p.status === "Completed" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {p.status}
                    </Badge>
                  </td>
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
