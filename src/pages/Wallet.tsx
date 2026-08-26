import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownRight, ArrowUpRight, DollarSign, Lock, Banknote, Landmark, Smartphone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "../i18n";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function WalletPage() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState("");
  
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const [newMethodType, setNewMethodType] = useState<"UPI" | "BANK">("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [walletRes, txRes, payoutRes] = await Promise.all([
        fetch("/api/wallet"),
        fetch("/api/wallet/transactions"),
        fetch("/api/wallet/payout-methods")
      ]);
      
      if (walletRes.ok) {
        const wData = await walletRes.json();
        setWallet(wData.wallet);
      } else {
        setWallet(null);
      }
      if (txRes.ok) {
        const tData = await txRes.json();
        setTransactions(tData.transactions);
      }
      if (payoutRes.ok) {
        const pData = await payoutRes.json();
        setPayoutMethods(pData.payoutMethods);
        const def = pData.payoutMethods.find((m: any) => m.isDefault);
        if (def) setSelectedPayoutMethod(def.id);
        else if (pData.payoutMethods.length > 0) setSelectedPayoutMethod(pData.payoutMethods[0].id);
      }
    } catch (error) {
      console.error(error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (!isNaN(amt) && amt > 0) {
      try {
        const res = await fetch("/api/wallet/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt, idempotencyKey: crypto.randomUUID() })
        });
        if (res.ok) {
          const data = await res.json();
          
          if (!data.key_id) {
            // Mock mode if key missing
            alert("Razorpay key not configured. Mocking success.");
            setIsDepositOpen(false);
            setDepositAmount("");
            fetchWalletData();
            return;
          }

          const resLoad = await loadRazorpay();
          if (!resLoad) {
            alert("Razorpay SDK failed to load");
            return;
          }

          const options = {
            key: data.key_id,
            amount: data.amount,
            currency: data.currency,
            name: "HelpGram",
            description: "Wallet Deposit",
            order_id: data.orderId,
            handler: function (response: any) {
               alert("Payment successful! ID: " + response.razorpay_payment_id);
               setIsDepositOpen(false);
               setDepositAmount("");
               fetchWalletData();
            },
            theme: { color: "#2563EB" }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
           const err = await res.json();
           alert(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error)));
        }
      } catch (e) { console.error(e?.message || e); }
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!selectedPayoutMethod) {
      alert("Please select a payout method");
      return;
    }
    if (!isNaN(amt) && amt > 0 && wallet && amt <= Number(wallet.balanceAvailable)) {
      try {
        const res = await fetch("/api/wallet/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt, payoutMethodId: selectedPayoutMethod, idempotencyKey: crypto.randomUUID() })
        });
        if (res.ok) {
          setIsWithdrawOpen(false);
          setWithdrawAmount("");
          fetchWalletData();
        } else {
           const err = await res.json();
           alert(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error)));
        }
      } catch (e) { console.error(e?.message || e); }
    }
  };

  const handleAddPayoutMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { type: newMethodType };
    if (newMethodType === "UPI") {
      if (!upiId) return alert("UPI ID is required");
      payload.upiId = upiId;
    } else {
      if (!accountHolderName || !accountNumber || !ifscCode) return alert("Bank details are required");
      payload.accountHolderName = accountHolderName;
      payload.accountNumber = accountNumber;
      payload.ifscCode = ifscCode;
    }

    try {
      const res = await fetch("/api/wallet/payout-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setUpiId("");
        setAccountHolderName("");
        setAccountNumber("");
        setIfscCode("");
        fetchWalletData();
      } else {
        const err = await res.json();
        alert(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error)));
      }
    } catch (e) { console.error(e?.message || e); }
  };

  const setAsDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/wallet/payout-methods/${id}/default`, {
        method: "POST"
      });
      if (res.ok) fetchWalletData();
    } catch (e) { console.error(e?.message || e); }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payout method?")) return;
    try {
      const res = await fetch(`/api/wallet/payout-methods/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchWalletData();
      else {
        const err = await res.json();
        alert(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error)));
      }
    } catch (e) { console.error(e?.message || e); }
  };

  if (loading) return <div className="p-8 text-center">{t("ui.loading_wallet")}</div>;
  if (!wallet) return <div className="p-8 text-center text-red-500">{t("ui.failed_to_load")}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("wallet.title")}</h1>
        <p className="text-muted-foreground">{t("ui.manage_your_funds")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-blue-600 text-white">
          <CardHeader>
            <CardTitle className="text-blue-100 text-sm font-medium">{t("ui.available_balance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">${Number(wallet.balanceAvailable).toFixed(2)}</div>
            <div className="flex gap-2 mt-4">
               {/* Withdraw Dialog */}
               <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                 <DialogTrigger className="w-full py-2 px-4 rounded-md text-sm font-semibold bg-white text-blue-600 hover:bg-blue-50 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center" disabled={payoutMethods.length === 0}>
                   {t("ui.withdraw")}</DialogTrigger>
                 <DialogContent className="sm:max-w-[400px]">
                   <form onSubmit={handleWithdraw}>
                     <DialogHeader>
                       <DialogTitle>{t("wallet.withdraw")}</DialogTitle>
                       <DialogDescription>
                         {t("ui.transfer_available_balance")}</DialogDescription>
                     </DialogHeader>
                     <div className="grid gap-4 py-4">
                       <div className="grid gap-2">
                         <Label htmlFor="wamount">{t("ui.amount_max")}{Number(wallet.balanceAvailable).toFixed(2)})</Label>
                         <Input id="wamount" type="number" required min="1" max={Number(wallet.balanceAvailable)} step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" />
                       </div>
                       <div className="grid gap-2">
                         <Label>{t("ui.payout_method")}</Label>
                         <Select value={selectedPayoutMethod} onValueChange={setSelectedPayoutMethod}>
                           <SelectTrigger>
                             <SelectValue placeholder="Select method" />
                           </SelectTrigger>
                           <SelectContent>
                             {payoutMethods.map(m => (
                               <SelectItem key={m.id} value={m.id}>
                                 {m.type === "UPI" ? `UPI: ${m.upiId}` : `Bank: ${m.accountNumber} (${m.accountHolderName})`}
                                 {m.isDefault ? " (Default)" : ""}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                     <DialogFooter>
                       <Button type="submit">{t("ui.confirm_withdrawal")}</Button>
                     </DialogFooter>
                   </form>
                 </DialogContent>
               </Dialog>

               {/* Deposit Dialog */}
               <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
                 <DialogTrigger className="w-full py-2 px-4 rounded-md text-sm font-semibold border border-blue-400 text-white hover:bg-blue-500 cursor-pointer inline-flex items-center justify-center">
                   {t("ui.deposit")}</DialogTrigger>
                 <DialogContent className="sm:max-w-[400px]">
                   <form onSubmit={handleDeposit}>
                     <DialogHeader>
                       <DialogTitle>{t("wallet.deposit")}</DialogTitle>
                       <DialogDescription>
                         {t("ui.add_funds_to")}</DialogDescription>
                     </DialogHeader>
                     <div className="grid gap-4 py-4">
                       <div className="grid gap-2">
                         <Label htmlFor="damount">{t("wallet.amount")}</Label>
                         <Input id="damount" type="number" required min="5" step="0.01" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0.00" />
                       </div>
                     </div>
                     <DialogFooter>
                       <Button type="submit">{t("wallet.depositBtn")}</Button>
                     </DialogFooter>
                   </form>
                 </DialogContent>
               </Dialog>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium">{t("wallet.escrow")}</CardTitle>
              <CardDescription>{t("ui.locked_for_ongoing")}</CardDescription>
            </div>
            <Lock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${Number(wallet.balanceEscrowed).toFixed(2)}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {t("ui.funds_are_held")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full mt-6">
        <TabsList>
          <TabsTrigger value="transactions">{t("ui.recent_transactions")}</TabsTrigger>
          <TabsTrigger value="methods">{t("ui.payout_methods")}</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">{t("ui.no_transactions_found")}</div>
                ) : transactions.map((tx) => {
                  const isPositive = ['DEPOSIT', 'ESCROW_RELEASE', 'ESCROW_REFUND'].includes(tx.type);
                  const isNegative = ['WITHDRAWAL', 'ESCROW_LOCK', 'PLATFORM_FEE'].includes(tx.type);
                  
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100 text-green-600' : isNegative ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                          {isPositive ? <ArrowDownRight className="h-5 w-5" /> : isNegative ? <ArrowUpRight className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.type} — {tx.description || "Transaction"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()} {t("ui.balance_after")}{Number(tx.balanceAfter).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className={`font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-amber-600' : ''}`}>
                         {isPositive ? '+' : isNegative ? '-' : ''}${Math.abs(Number(tx.amount)).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="methods" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("ui.manage_payout_methods")}</CardTitle>
              <CardDescription>{t("ui.add_upi_id")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                {payoutMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("ui.no_payout_methods")}</p>
                ) : (
                  <div className="divide-y border rounded-md">
                    {payoutMethods.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          {m.type === "UPI" ? <Smartphone className="h-6 w-6 text-muted-foreground" /> : <Landmark className="h-6 w-6 text-muted-foreground" />}
                          <div>
                            <p className="font-medium">{m.type === "UPI" ? m.upiId : m.accountNumber}</p>
                            <p className="text-xs text-muted-foreground">{m.type === "BANK" && `${m.accountHolderName} • IFSC: ${m.ifscCode}`}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          {m.isDefault ? (
                            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{t("ui.default")}</span>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setAsDefault(m.id)}>{t("ui.set_default")}</Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteMethod(m.id)}>{t("ui.delete")}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rounded-md p-4 bg-muted/50">
                <h3 className="font-medium mb-4">{t("ui.add_new_method")}</h3>
                <form onSubmit={handleAddPayoutMethod} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>{t("ui.method_type")}</Label>
                    <Select value={newMethodType} onValueChange={(val: any) => setNewMethodType(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">{t("ui.upi_id")}</SelectItem>
                        <SelectItem value="BANK">{t("ui.bank_account")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newMethodType === "UPI" && (
                    <div className="grid gap-2">
                      <Label>{t("ui.upi_id")}</Label>
                      <Input required value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="username@upi" />
                    </div>
                  )}

                  {newMethodType === "BANK" && (
                    <>
                      <div className="grid gap-2">
                        <Label>{t("ui.account_holder_name")}</Label>
                        <Input required value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} placeholder="John Doe" />
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("ui.account_number")}</Label>
                        <Input required value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="1234567890" />
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("ui.ifsc_code")}</Label>
                        <Input required value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="HDFC0001234" />
                      </div>
                    </>
                  )}

                  <Button type="submit" variant="secondary">{t("ui.add")}{newMethodType === "UPI" ? "UPI" : "Bank"} {t("ui.method")}</Button>
                </form>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

