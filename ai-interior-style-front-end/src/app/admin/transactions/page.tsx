"use client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DollarSign, TrendingUp, ArrowUpRight, Download, Search, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  date: string;
  buyer: string;
  buyerEmail: string;
  seller: string;
  sellerEmail: string;
  amount: number;
  commission: number;
  designerPayout: number;
  status: string;
  projectStatus: string;
  purchaseType: string;
  chapaId: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  commission: number;
}

const STATUS_VARIANT: Record<string, "green"|"gold"|"gray"|"blue"> = { 
  "released_to_designer": "green", 
  "held_in_escrow": "gold", 
  "refunded": "gray",
  "pending": "blue"
};

const STATUS_LABELS: Record<string, string> = {
  "released_to_designer": "Completed",
  "held_in_escrow": "Held",
  "refunded": "Refunded",
  "pending": "Pending"
};

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalTransactions: 0,
    avgCommissionPct: "0.0"
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: ""
  });

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
  }, [search, filters, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load transactions and revenue data in parallel
      const [transactionsResponse, revenueResponse] = await Promise.all([
        apiClient.getAdminTransactions({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status: filters.status || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        }),
        apiClient.getAdminRevenueAnalytics('7m')
      ]);

      const transactionsData = (transactionsResponse as any).data || transactionsResponse;
      const revenueAnalyticsData = (revenueResponse as any).data || revenueResponse;

      console.log('Transactions response:', transactionsData);
      console.log('Revenue response:', revenueAnalyticsData);

      setTransactions(transactionsData?.transactions || []);
      setRevenueData(revenueAnalyticsData?.revenueData || []);
      setSummary(transactionsData?.summary || summary);
      setPagination(transactionsData?.pagination || pagination);
    } catch (error: any) {
      console.error('Failed to load admin transactions:', error);
      
      // Handle different error structures
      let errorMessage = 'Failed to load transactions';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // Set empty data to prevent crashes
      setTransactions([]);
      setRevenueData([]);
      setSummary({
        totalRevenue: 0,
        totalCommission: 0,
        totalTransactions: 0,
        avgCommissionPct: "0.0"
      });
      setPagination({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      if (transactions.length === 0) {
        toast.error('No transactions to export');
        return;
      }

      // Create CSV content
      const headers = ['Transaction ID', 'Date', 'Buyer', 'Seller', 'Amount', 'Commission', 'Status', 'Purchase Type'];
      const csvContent = [
        headers.join(','),
        ...transactions.map(tx => [
          tx.id,
          new Date(tx.date).toLocaleDateString(),
          `"${tx.buyer}"`,
          `"${tx.seller}"`,
          tx.amount.toString(),
          tx.commission.toString(),
          STATUS_LABELS[tx.status] || tx.status,
          tx.purchaseType
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Transactions exported successfully');
    } catch (error: any) {
      toast.error('Failed to export transactions');
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-emerald-400" /> Transaction Monitor
            </h1>
            <p className="text-text-muted text-sm">Loading transaction data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-400" /> Transaction Monitor
          </h1>
          <p className="text-text-muted text-sm">Real-time view of all marketplace sales via Chapa</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="ghost" onClick={handleExportCSV} disabled={transactions.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-surface-card border border-surface-border rounded-xl">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Status:</label>
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-1 rounded-lg bg-surface border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="released_to_designer">Completed</option>
            <option value="held_in_escrow">Held</option>
            <option value="refunded">Refunded</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">From:</label>
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="px-3 py-1 rounded-lg bg-surface border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">To:</label>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="px-3 py-1 rounded-lg bg-surface border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total GMV",        value: `$${summary.totalRevenue.toLocaleString()}`,    icon: DollarSign,  color: "text-brand-400",    bg: "bg-brand-500/10" },
          { label: "Platform Commission", value: `$${summary.totalCommission.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Avg Commission %",  value: `${summary.avgCommissionPct}%`,                      icon: ArrowUpRight, color: "text-gold-400",    bg: "bg-gold-500/10" },
          { label: "Total Transactions",value: summary.totalTransactions.toString(),         icon: DollarSign,  color: "text-blue-400",    bg: "bg-blue-500/10" },
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
            <AreaChart data={revenueData}>
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
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search ID, user, or Chapa ID…"
                className="pl-9 pr-4 py-2 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" 
              />
            </div>
            <div className="text-sm text-text-muted">
              Showing {transactions.length} of {pagination.total} transactions
            </div>
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
              {transactions.map((t) => (
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
                  <td><Badge variant={STATUS_VARIANT[t.status] ?? "gray"}>{STATUS_LABELS[t.status] || t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-surface-border">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded-lg bg-surface border border-surface-border text-sm text-white hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 rounded-lg bg-surface border border-surface-border text-sm text-white hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
