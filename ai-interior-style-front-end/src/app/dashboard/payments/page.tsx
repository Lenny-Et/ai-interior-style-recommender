"use client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { CreditCard, DollarSign, TrendingUp, Shield, Download, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

const TRANSACTIONS = [
  { id: "CHX-7821", date: "2026-04-01", amount: 3200, type: "debit",  status: "Completed", desc: "Payment to Lena Rodriguez – Art Deco Dining Room",   method: "Chapa · Visa ****4291" },
  { id: "CHX-7654", date: "2026-03-28", amount: 1500, type: "debit",  status: "Held",      desc: "Escrow – James Park · Scandinavian Bedroom",          method: "Chapa · Mastercard ****8811" },
  { id: "CHX-7498", date: "2026-03-20", amount: 2000, type: "debit",  status: "Held",      desc: "Escrow – Sara Mitchell · Modern Living Room",          method: "Chapa · Visa ****4291" },
  { id: "CHX-7102", date: "2026-02-15", amount: 800,  type: "refund", status: "Completed", desc: "Refund – Cancelled request TK-099",                    method: "Chapa · Visa ****4291" },
  { id: "CHX-6980", date: "2026-02-01", amount: 2700, type: "debit",  status: "Completed", desc: "Payment to Mike Thompson – Urban Home Office",         method: "Chapa · Mobile ****3421" },
];

const STATUS_VARIANT: Record<string, "green"|"gold"|"gray"> = {
  Completed: "green", Held: "gold", Refunded: "gray",
};

export default function PaymentsPage() {
  const totalSpent   = TRANSACTIONS.filter((t) => t.type === "debit" && t.status === "Completed").reduce((a, t) => a + t.amount, 0);
  const totalHeld    = TRANSACTIONS.filter((t) => t.status === "Held").reduce((a, t) => a + t.amount, 0);
  const totalRefunds = TRANSACTIONS.filter((t) => t.type === "refund").reduce((a, t) => a + t.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Payment History</h1>
        <p className="text-text-muted text-sm">All transactions processed securely via Chapa</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Spent",     value: totalSpent,   icon: DollarSign, color: "text-brand-400", bg: "bg-brand-500/10" },
          { label: "Funds in Escrow", value: totalHeld,    icon: Shield,     color: "text-gold-400",  bg: "bg-gold-500/10"  },
          { label: "Total Refunds",   value: totalRefunds, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-white font-display">${value.toLocaleString()}</div>
            <div className="text-xs text-text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Payment method */}
      <div>
        <h2 className="font-semibold text-white mb-3">Payment Methods</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Visa", last4: "4291", expiry: "08/28", primary: true  },
            { label: "Mastercard", last4: "8811", expiry: "12/26", primary: false },
          ].map((card) => (
            <div key={card.last4} className={`p-4 rounded-2xl border transition-all ${card.primary ? "border-brand-500/40 bg-brand-600/10" : "border-surface-border bg-surface-card"}`}>
              <div className="flex items-center justify-between mb-4">
                <CreditCard className="w-6 h-6 text-brand-400" />
                {card.primary && <Badge variant="brand">Primary</Badge>}
              </div>
              <p className="font-mono text-white text-sm tracking-widest">•••• •••• •••• {card.last4}</p>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-text-muted">{card.label}</span>
                <span className="text-xs text-text-muted">{card.expiry}</span>
              </div>
            </div>
          ))}
          <button className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-surface-border text-text-muted hover:border-brand-500/60 hover:text-brand-400 transition-all">
            <span className="text-lg">+</span><span className="text-sm">Add Payment Method</span>
          </button>
        </div>
      </div>

      {/* Transaction log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Transaction History</h2>
          <Button variant="ghost" size="sm"><Download className="w-3.5 h-3.5" /> Export CSV</Button>
        </div>
        <Card>
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Date</th>
                <th>Description</th>
                <th>Method</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${t.type === "refund" ? "bg-emerald-500/15" : "bg-brand-500/15"}`}>
                        {t.type === "refund" ? <ArrowDownLeft className="w-3 h-3 text-emerald-400" /> : <ArrowUpRight className="w-3 h-3 text-brand-400" />}
                      </div>
                      <span className="font-mono text-xs">{t.id}</span>
                    </div>
                  </td>
                  <td className="text-xs text-text-muted">{formatDate(t.date)}</td>
                  <td className="max-w-[200px]">
                    <p className="text-xs text-purple-100 truncate">{t.desc}</p>
                    <p className="text-[10px] text-text-muted">{t.method}</p>
                  </td>
                  <td><Badge variant="gray">{t.type === "refund" ? "Refund" : "Payment"}</Badge></td>
                  <td><Badge variant={STATUS_VARIANT[t.status] ?? "gray"}>{t.status}</Badge></td>
                  <td className="text-right font-semibold text-sm">
                    <span className={t.type === "refund" ? "text-emerald-400" : "text-white"}>
                      {t.type === "refund" ? "+" : "-"}${t.amount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
