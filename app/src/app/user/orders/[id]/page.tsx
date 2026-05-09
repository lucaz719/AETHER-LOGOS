'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Box, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  FileCheck2, 
  Globe, 
  MapPin, 
  ShieldCheck, 
  Truck 
} from "lucide-react";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8080";

interface Milestone {
  status: string;
  description: string;
  location: string;
  timestamp: number;
}

interface ShipmentData {
  tracking_id: string;
  carrier: string;
  last_known_status: string;
  proof_hash?: string;
  proof_tx_sig?: string;
  trade_account: string;
}

interface TrackingResponse {
  shipment: ShipmentData;
  milestones: Milestone[];
}

export default function OrderTrackingPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingResponse | null>(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${AGENT_URL}/api/tracking/trade/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setData({
              shipment: {
                tracking_id: "PENDING-CARRIER",
                carrier: "dhl",
                last_known_status: "Processing",
                trade_account: String(id),
              },
              milestones: [
                {
                  status: "Escrow Locked",
                  description: "Funds secured on-chain. Awaiting agent carrier registration.",
                  location: "Solana Network",
                  timestamp: Date.now(),
                }
              ]
            });
            return;
          }
          throw new Error(await res.text());
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Tracking fetch error:", err);
        setError(err instanceof Error ? err.message : "Unable to connect to Settlement Agent.");
      } finally {
        setLoading(false);
      }
    };

    if (!id) {
      setError("Missing trade account.");
      setLoading(false);
      return;
    }

    void fetchTracking();
  }, [id]);

  if (loading) return <div className="p-20 text-center">Initializing Settlement Protocol...</div>;
  if (error) {
    return (
      <main className="min-h-screen bg-background pt-24">
        <div className="mx-auto max-w-2xl px-4">
          <section className="glass rounded-3xl p-8 text-center">
            <h1 className="text-2xl font-black text-foreground">Tracking unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link href="/user/orders" className="btn-primary mt-6 inline-flex">
              Back to orders
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const currentStatus = data?.shipment.last_known_status.toLowerCase() ?? "pending";
  const isDelivered = currentStatus === "delivered";
  const hasProof = !!data?.shipment.proof_hash && data?.shipment.proof_hash !== "";

  return (
    <main className="min-h-screen bg-background pb-20 pt-24">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/user/orders" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={16} />
            Back to Orders
          </Link>
          <div className="flex gap-2">
            <span className="badge badge-cyan">Trade: {String(id).slice(0, 8)}...</span>
            <span className={`badge ${isDelivered ? 'badge-green' : 'badge-amber'}`}>
              {data?.shipment.last_known_status ?? "Processing"}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Timeline & Milestones */}
          <div className="lg:col-span-2 space-y-6">
            <section className="glass rounded-3xl p-8 shadow-2xl border border-white/5 bg-white/[0.02]">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3 tracking-tight text-foreground">
                <Truck className="text-primary" />
                Logistics Intelligence
              </h2>

              {/* Progress Stepper */}
              <div className="relative mb-12">
                <div className="absolute top-5 left-0 w-full h-0.5 bg-border -z-10" />
                <div className="flex justify-between">
                  <Step icon={<Box size={18}/>} label="Order Placed" active done />
                  <Step icon={<ShieldCheck size={18}/>} label="Escrow Locked" active done />
                  <Step icon={<Truck size={18}/>} label="In Transit" active={!isDelivered} done={isDelivered} />
                  <Step icon={<FileCheck2 size={18}/>} label="zkTLS Verified" active={hasProof} done={hasProof} />
                </div>
              </div>

              {/* Milestone List */}
              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {data?.milestones.slice().reverse().map((m, i) => (
                  <div key={i} className="relative pl-10">
                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center ${i === 0 ? 'bg-primary' : 'bg-muted'}`}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground">{m.status}</h4>
                        <p className="text-sm text-muted-foreground">{m.description}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
                          <MapPin size={12} />
                          {m.location}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Settlement & Proof Details */}
          <div className="space-y-6">
            <section className="glass rounded-3xl p-8 shadow-2xl border border-primary/20 bg-primary/[0.03]">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase tracking-widest text-primary">
                <ShieldCheck className="text-primary" />
                Settlement Status
              </h3>
              
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Carrier Reference</p>
                  <p className="font-mono text-sm font-black text-foreground">{data?.shipment.tracking_id}</p>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">zkTLS Protocol</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground">Active & Watching</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">LIVE</span>
                    </div>
                  </div>
                </div>

                {hasProof ? (
                  <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-500 mb-3">
                      <CheckCircle2 size={18} />
                      <span className="text-sm font-black uppercase tracking-widest">Proof Verified</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed font-bold uppercase tracking-wider">
                      Settlement Agent has generated a zkTLS proof confirming delivery. Funds are eligible for release.
                    </p>
                    <Link 
                      href={`https://solscan.io/tx/${data?.shipment.proof_tx_sig}?cluster=devnet`}
                      target="_blank"
                      className="btn-enter w-full justify-center text-[10px] gap-2 font-black uppercase tracking-widest py-3 rounded-xl"
                    >
                      <ExternalLink size={14} />
                      View On-Chain Proof
                    </Link>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <Clock size={16} />
                      <span className="text-sm font-black uppercase tracking-widest">Awaiting Delivery</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-wider">
                      Proof generation will trigger automatically upon carrier confirmation of delivery to the registered recipient.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="glass rounded-3xl p-8 shadow-2xl border border-white/5">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase tracking-widest text-foreground">
                <Globe className="text-primary" />
                Network Metrics
              </h3>
              <div className="space-y-4">
                <MetricItem label="Protocol" value="AETHER-SETTLE v1" />
                <MetricItem label="Verification" value="zkTLS / Reclaim" />
                <MetricItem label="Network" value="Solana Devnet" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Step({ icon, label, active, done }: { icon: React.ReactNode, label: string, active: boolean, done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center w-20">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
        done ? 'bg-primary text-white' : active ? 'bg-primary/20 text-primary border border-primary/50' : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <CheckCircle2 size={20} /> : icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${active || done ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

function MetricItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}
