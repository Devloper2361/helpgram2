import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Download, FileText, Printer, ArrowLeft } from "lucide-react";
import { useTranslation } from "../i18n";

export function InvoicePage() {
    const { t } = useTranslation();
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tasks/${id}/invoice`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch invoice");
      setInvoice(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-700">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
          <Link to={`/tasks/${id}`} className="mt-4 inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("ui.back_to_task")}</Link>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Controls - Hidden when printing */}
      <div className="mb-6 flex justify-between items-center print:hidden">
        <Link to={`/tasks/${id}`} className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t("ui.back_to_task")}</Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Printer className="w-4 h-4 mr-2" />
          {t("ui.print_save_pdf")}</button>
      </div>

      {/* Invoice Document */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 md:p-12 print:shadow-none print:border-none print:p-0">
        <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">{t("ui.tax_invoice_receipt")}</h1>
            </div>
            <p className="mt-2 text-sm text-gray-500">{t("ui.authoritative_digital_payment")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{t("ui.invoice_no")}{invoice.invoiceId}</p>
            <p className="text-sm text-gray-500">{t("ui.date")}{new Date(invoice.issueDate).toLocaleDateString()}</p>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 uppercase tracking-wide">
              {invoice.financials.paymentStatus}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">{t("ui.billed_to_customer")}</h3>
            <p className="text-gray-900 font-medium">{invoice.customer.name}</p>
            <p className="text-gray-500 text-sm">{invoice.customer.email}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">{t("ui.service_provider")}</h3>
            <p className="text-gray-900 font-medium">{invoice.worker.name}</p>
            <p className="text-gray-500 text-sm">{invoice.worker.email}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">{t("ui.task_details")}</h3>
          <p className="text-sm text-gray-900"><span className="font-medium">{t("ui.service")}</span> {invoice.serviceName}</p>
          <p className="text-sm text-gray-500"><span className="font-medium text-gray-700">{t("ui.ref")}</span> {invoice.taskRef}</p>
          <p className="text-sm text-gray-500"><span className="font-medium text-gray-700">{t("ui.completed_on")}</span> {new Date(invoice.completionDate).toLocaleString()}</p>
        </div>

        <table className="min-w-full divide-y divide-gray-200 mb-8 border-b border-gray-200">
          <thead>
            <tr>
              <th scope="col" className="py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">{t("ui.description")}</th>
              <th scope="col" className="py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">{t("ui.amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-4 text-sm text-gray-900">{invoice.description}</td>
              <td className="py-4 text-sm text-gray-900 text-right font-medium">
                ₹{invoice.financials.grossAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <p>{t("ui.gross_amount")}</p>
              <p>₹{invoice.financials.grossAmount.toFixed(2)}</p>
            </div>
            
            <div className="flex justify-between text-sm text-gray-600">
              <p>{t("ui.platform_fee")}</p>
              <p>₹{invoice.financials.platformFee.toFixed(2)}</p>
            </div>

            <div className="flex justify-between text-sm text-gray-600 border-b border-gray-200 pb-3">
              <p>{t("ui.worker_payout")}</p>
              <p>₹{invoice.financials.workerPayout.toFixed(2)}</p>
            </div>

            {invoice.financials.refundAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600 border-b border-gray-200 pb-3">
                <p>{t("ui.refund_amount")}</p>
                <p>-₹{invoice.financials.refundAmount.toFixed(2)}</p>
              </div>
            )}

            <div className="flex justify-between text-base font-bold text-gray-900 pt-2">
              <p>{t("ui.total_paid")}</p>
              <p>{invoice.financials.currency} ₹{invoice.financials.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>{t("ui.this_is_a")}</p>
          <p>{t("ui.no_signature_is")}</p>
        </div>
      </div>
    </div>
  );
}
