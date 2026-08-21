import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import Portal from "../../components/Portal";
import { Plus } from "lucide-react";

export default function FeesPage() {
  const supabase = createClient();
  const { institution } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("unpaid");

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    setLoading(true);
    let query = supabase
      .from("invoices")
      .select("*, profiles ( first_name, surname ), programmes ( name )")
      .order("due_date", { ascending: true });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setInvoices(data || []);
    setLoading(false);
  };

  const markPaid = async (invoiceId) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", invoiceId);
    if (error) alert("Could not update: " + error.message);
    else fetchInvoices();
  };

  const statusColor = (status) => {
    if (status === "paid") return { background: "#ECFDF5", color: "#047857" };
    if (status === "overdue") return { background: "#FEF2F2", color: "#B91C1C" };
    return { background: "var(--seal-gold-soft)", color: "var(--seal-gold)" };
  };

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-mono text-[var(--text-muted)] mb-1">INSTITUTION ADMIN</p>
      <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--text)" }}>Fees &amp; Invoices</h1>
      <p className="text-[var(--text-muted)] mb-6">Track learner fees and payment status for {institution?.name}.</p>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          {["unpaid", "paid", "overdue", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
              style={filter === f ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110"
          style={{ background: "var(--brand-color)" }}
        >
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {loading ? (
        <p className="text-sm font-mono text-[var(--text-muted)]">Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <div className="paper p-8 text-center text-gray-500 text-sm">No invoices {filter !== "all" ? filter : ""} yet.</div>
      ) : (
        <div className="paper overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--border-soft)" }}>
                <th className="px-4 py-3 font-medium text-gray-500">Learner</th>
                <th className="px-4 py-3 font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500">Due</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const name = inv.profiles ? `${inv.profiles.first_name || ""} ${inv.profiles.surname || ""}`.trim() : "Unknown";
                return (
                  <tr key={inv.id} className="border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{name}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.description}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text)" }}>${inv.amount}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full capitalize" style={statusColor(inv.status)}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {inv.status !== "paid" && (
                        <button onClick={() => markPaid(inv.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateInvoiceModal institution={institution} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); fetchInvoices(); }} />
      )}
    </div>
  );
}

function CreateInvoiceModal({ institution, onClose, onCreated }) {
  const supabase = createClient();
  const [learners, setLearners] = useState([]);
  const [userId, setUserId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, first_name, surname")
      .eq("institution_id", institution.id)
      .eq("role", "learner")
      .then(({ data }) => setLearners(data || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("invoices").insert({
        institution_id: institution.id,
        user_id: userId,
        description,
        amount: Number(amount),
        due_date: dueDate || null,
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: userId,
        institution_id: institution.id,
        type: "invoice",
        title: "New invoice",
        body: `${description} - $${amount}`,
        link: "/progress",
      });

      onCreated();
    } catch (err) {
      alert("Could not create invoice: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm";

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-8" style={{ background: "var(--paper)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">X</button>
          <p className="text-xs font-mono text-[var(--text-muted)] mb-1">NEW INVOICE</p>
          <h2 className="font-display text-xl font-semibold mb-5" style={{ color: "var(--text)" }}>Create Invoice</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={userId} onChange={(e) => setUserId(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }}>
              <option value="">Select learner</option>
              {learners.map((l) => <option key={l.id} value={l.id}>{l.first_name} {l.surname}</option>)}
            </select>
            <input type="text" placeholder="Description (e.g. Term 3 Tuition)" value={description} onChange={(e) => setDescription(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
            <input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Due date (optional)</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} style={{ borderColor: "var(--border-soft)" }} />
            </div>
            <button type="submit" disabled={saving} className="w-full py-3 mt-2 rounded-xl text-white font-medium disabled:opacity-50" style={{ background: "var(--brand-color)" }}>
              {saving ? "Creating..." : "Create Invoice"}
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}