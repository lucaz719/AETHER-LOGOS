'use client';

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { 
  Plus, 
  MapPin, 
  Trash2, 
  Home, 
  Building2, 
  CheckCircle2, 
  Map as MapIcon,
  ShieldCheck
} from "lucide-react";

interface UserAddress {
  id: number;
  address_type: string;
  recipient_name: string;
  street: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

const API = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

export default function AddressBookPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingAddr, setAddingAddr] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [addrForm, setAddrForm] = useState({ 
    addressType: "shipping", 
    recipientName: "", 
    street: "", 
    city: "", 
    stateProvince: "", 
    postalCode: "", 
    country: "", 
    phone: "", 
    isDefault: false 
  });

  const loadAddresses = useCallback(async () => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API}/api/users/${wallet}/addresses`);
      if (res.ok) setAddresses(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [wallet]);

  useEffect(() => {
    if (!wallet) { setLoading(false); return; }
    loadAddresses();
  }, [wallet, loadAddresses]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setAddingAddr(true);
    try {
      const res = await fetch(`${API}/api/users/${wallet}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address_type: addrForm.addressType,
          recipient_name: addrForm.recipientName,
          street: addrForm.street,
          city: addrForm.city,
          state_province: addrForm.stateProvince,
          postal_code: addrForm.postalCode,
          country: addrForm.country,
          phone: addrForm.phone,
          is_default: addrForm.isDefault,
        }),
      });
      if (res.ok) {
        await loadAddresses();
        setAddrForm({ addressType: "shipping", recipientName: "", street: "", city: "", stateProvince: "", postalCode: "", country: "", phone: "", isDefault: false });
        setShowForm(false);
        setMsg({ tone: "success", text: "Logistics endpoint registered." });
        setTimeout(() => setMsg(null), 3000);
      }
    } catch { /* ignore */ }
    finally { setAddingAddr(false); }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API}/api/users/${wallet}/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch { /* ignore */ }
  };

  if (!publicKey) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 rounded-full bg-primary/10 p-6 text-primary">
          <MapIcon size={48} />
        </div>
        <h2 className="text-2xl font-black text-foreground">Registry Access Denied</h2>
        <p className="mt-2 mb-8 max-w-sm text-muted-foreground">Logistics data is encrypted. Connect your wallet to decrypt and manage your shipping endpoints.</p>
        <WalletMultiButton />
      </main>
    );
  }

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse">Accessing Secure Ledger...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Address Book</h1>
          <p className="mt-1 text-muted-foreground">Manage verified shipping and billing endpoints for global fulfillment.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary gap-2"
        >
          {showForm ? 'Cancel' : <><Plus size={18} /> Add Endpoint</>}
        </button>
      </header>

      {msg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          msg.tone === "success" ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
        }`}>
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">{msg.text}</span>
        </div>
      )}

      {showForm && (
        <section className="glass rounded-3xl p-8 space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Plus size={14} className="text-primary" />
            New Logistics Endpoint
          </h2>
          <form onSubmit={handleAddAddress} className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="form-group">
                <label className="form-label">Classification</label>
                <select className="form-input" value={addrForm.addressType} onChange={(e) => setAddrForm({ ...addrForm, addressType: e.target.value })}>
                  <option value="shipping">Global Shipping</option>
                  <option value="billing">Financial Billing</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Authorized Recipient</label>
                <input className="form-input" placeholder="Full entity or individual name" value={addrForm.recipientName} onChange={(e) => setAddrForm({ ...addrForm, recipientName: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input className="form-input" placeholder="Primary operational address" value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} required />
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">State / Province</label>
                <input className="form-input" value={addrForm.stateProvince} onChange={(e) => setAddrForm({ ...addrForm, stateProvince: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input className="form-input" value={addrForm.postalCode} onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })} required />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="form-group">
                <label className="form-label">Country Code</label>
                <input className="form-input" placeholder="ISO Alpha-2 (e.g. US, CN, DE)" value={addrForm.country} onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Direct Contact Line</label>
                <input className="form-input" placeholder="+1 555-000-0000" value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} required />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  checked={addrForm.isDefault} 
                  onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} 
                />
                <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">Set as Master Endpoint</span>
              </label>
              <button type="submit" className="btn-primary" disabled={addingAddr}>
                {addingAddr ? "Registering..." : "Add Endpoint"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {addresses.length === 0 && !showForm ? (
          <div className="md:col-span-2 glass rounded-3xl p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <MapPin size={22} />
            </div>
            <p className="text-sm font-bold">No endpoints registered</p>
            <p className="mt-1 text-sm text-muted-foreground">Register a shipping address to accelerate the procurement lifecycle.</p>
          </div>
        ) : (
          addresses.map((addr) => (
            <article key={addr.id} className="glass rounded-3xl p-6 relative group overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    addr.address_type === 'shipping' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {addr.address_type === 'shipping' ? <Home size={20} /> : <Building2 size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {addr.address_type === 'shipping' ? 'Logistics / Shipping' : 'Financial / Billing'}
                    </p>
                    <h3 className="text-base font-bold text-foreground mt-0.5">{addr.recipient_name}</h3>
                  </div>
                </div>
                {addr.is_default && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-500">
                    <ShieldCheck size={12} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Master</span>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} className="mt-1 shrink-0" />
                  <span>{[addr.street, addr.city, addr.state_province, addr.postal_code, addr.country].filter(Boolean).join(", ")}</span>
                </div>
                {addr.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">Phone:</span>
                    {addr.phone}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-red-500"
                  onClick={() => handleDeleteAddress(addr.id)}
                  title="Remove endpoint"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
