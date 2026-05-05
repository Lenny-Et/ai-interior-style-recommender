"use client";
import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { CreditCard, DollarSign, TrendingUp, Shield, Download, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Transaction {
  _id: string;
  tx_ref: string;
  homeownerId: string;
  designerId: any; // populated with user object when available (profile)
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'held' | 'held_in_escrow' | 'refunded' | 'failed';
  projectStatus: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  description?: string;
}

const STATUS_VARIANT: Record<string, "green"|"gold"|"gray"|"red"> = {
  completed: "green", held: "gold", refunded: "gray", pending: "gray", failed: "red",
};

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadTransactions();
    }
  }, [page, mounted]);

  const loadTransactions = async (pageNum = 1) => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getTransactions(pageNum, 20);
      const transactionsData = (response as any).data || response;
      setTransactions(transactionsData.transactions || []);
      
      if (pageNum === 1) {
        setHasMore(transactionsData.pagination?.pages > 1);
      } else {
        setHasMore(transactionsData.pagination?.page < transactionsData.pagination?.pages);
      }
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
      toast.error(error.error || error.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center py-16 text-text-muted">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-semibold text-white">Loading...</p>
        </div>
      </div>
    );
  }

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const completedTransactions = transactions.filter(tx => tx.status === 'completed').length;
  const pendingTransactions = transactions.filter(tx => tx.status === 'pending' || tx.status === 'held_in_escrow').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Payments</h1>
          <p className="text-text-muted text-sm">All amounts processed via Chapa escrow</p>
        </div>
        <Button><Download className="w-4 h-4" /> Export Statement</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted">Total Spent</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">${totalAmount.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted">Completed</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{completedTransactions}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted">In Escrow</span>
            <Clock className="w-4 h-4 text-gold-400" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingTransactions}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted">Protection</span>
            <Shield className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">100%</div>
        </Card>
      </div>

      {/* Transactions list */}
      <Card>
        <div className="p-4 border-b border-surface-border">
          <h2 className="font-semibold text-white">Transaction History</h2>
        </div>
        <div className="divide-y divide-surface-border">
          {loading ? (
            <div className="text-center py-16 text-text-muted">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="font-semibold text-white">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-white">No transactions yet</p>
              <p className="text-sm mt-1">Your payment history will appear here</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction._id} className="p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      transaction.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      transaction.status === 'held_in_escrow' ? 'bg-gold-500/20 text-gold-400' :
                      'bg-gray-500/20 text-gray-400'
                    )}>
                      {transaction.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                       transaction.status === 'held_in_escrow' ? <Clock className="w-5 h-5" /> :
                       <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{transaction.tx_ref}</p>
                      <p className="text-xs text-text-muted">
                        {transaction.designerId ? 
                          `To ${transaction.designerId.profile?.firstName} ${transaction.designerId.profile?.lastName}` : 
                          'Processing...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">${transaction.amount.toLocaleString()}</p>
                    <p className="text-xs text-text-muted">{formatDate(transaction.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {hasMore && (
          <div className="p-4 border-t border-surface-border">
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => {
                if (mounted && !loading) {
                  setPage(prev => prev + 1);
                }
              }}
              disabled={loading}
            >
              Load More
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
