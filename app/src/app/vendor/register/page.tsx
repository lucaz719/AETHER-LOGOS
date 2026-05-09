'use client';

import { useCallback, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useRegistrationStore } from "@/lib/stores/registrationStore";
import { fetchAgent } from "@/lib/agentApi";

const VENDOR_TYPES = ["Retailer", "Wholesaler", "Distributor", "Manufacturer"] as const;
const ALL_CATEGORIES = ["Electronics", "Apparel", "HomeGoods", "Machinery", "FoodBeverage", "Chemicals", "Automotive", "Healthcare", "Construction", "Other"];

async function hashEmail(email: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(email.toLowerCase().trim());
	const hashInput = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
	const hashBuffer = await crypto.subtle.digest('SHA-256', hashInput);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function VendorRegisterPage() {
	const { publicKey } = useWallet();
	
	// Use registration store for persistence
	const shopName = useRegistrationStore((state) => state.shopName);
	const setShopName = useRegistrationStore((state) => state.setShopName);
	const shopDesc = useRegistrationStore((state) => state.shopDesc);
	const setShopDesc = useRegistrationStore((state) => state.setShopDesc);
	const vendorType = useRegistrationStore((state) => state.vendorType);
	const setVendorType = useRegistrationStore((state) => state.setVendorType);
	const categories = useRegistrationStore((state) => state.categories);
	const setCategories = useRegistrationStore((state) => state.setCategories);
	const email = useRegistrationStore((state) => state.email);
	const setEmail = useRegistrationStore((state) => state.setEmail);
	const registrationCompleted = useRegistrationStore((state) => state.registrationCompleted);
	const markRegistrationComplete = useRegistrationStore((state) => state.markRegistrationComplete);
	const clearDraft = useRegistrationStore((state) => state.clearDraft);
	
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const toggleCategory = useCallback((cat: string) => {
		setCategories(
			categories.includes(cat)
				? categories.filter((c) => c !== cat)
				: categories.length < 8
				? [...categories, cat]
				: categories,
		);
	}, [categories, setCategories]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!publicKey) return;
			setSubmitting(true);
			setError(null);
			try {
				const emailHash = await hashEmail(email);
				const response = await fetchAgent('http://localhost:8080/api/vendor/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						wallet: publicKey.toString(),
						shop_name: shopName,
						description: shopDesc,
						vendor_type: vendorType,
						categories: categories.join(','),
						email_hash: emailHash,
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(errorText || `HTTP ${response.status}`);
				}

				// Mark registration complete and clear draft
				markRegistrationComplete();
				clearDraft();
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : String(e));
			} finally {
				setSubmitting(false);
			}
		},
		[publicKey, shopName, shopDesc, vendorType, categories, email, markRegistrationComplete, clearDraft],
	);

	if (!publicKey) {
		return (
			<main className="page-container" style={{ textAlign: "center", paddingTop: "4rem", maxWidth: 600 }}>
				<h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>Register as Vendor</h2>
				<p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Connect your wallet to create a vendor shop.</p>
				<WalletMultiButton />
			</main>
		);
	}

	return (
		<main className="page-container" style={{ display: "flex", gap: "2rem" }}>
			<div style={{ flex: 1 }}>
				<h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.75rem" }}>
					Shop Profile
				</h1>
				{registrationCompleted ? (
					<div className="glass" style={{ textAlign: "center", padding: "3rem" }}>
						<h2 style={{ color: "var(--green)", marginBottom: "0.5rem" }}>Vendor registered successfully!</h2>
						<div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.25rem" }}>
							<Link href="/vendor/dashboard" className="btn-primary" style={{ textDecoration: "none" }}>
								Go to Dashboard
							</Link>
						</div>
					</div>
				) : (
					<form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem", maxWidth: 560 }}>
						<div style={{ display: "grid", gap: "0.35rem" }}>
							<label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Shop Name *</label>
							<input
								required
								maxLength={64}
								value={shopName}
								onChange={(e) => setShopName(e.target.value)}
								className="input"
								placeholder="e.g. TechParts Global"
							/>
						</div>

						<div style={{ display: "grid", gap: "0.35rem" }}>
							<label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Shop Description *</label>
							<textarea
								required
								maxLength={256}
								value={shopDesc}
								onChange={(e) => setShopDesc(e.target.value)}
								rows={3}
								className="input"
								style={{ resize: "vertical" }}
								placeholder="Describe your business…"
							/>
						</div>

						<div style={{ display: "grid", gap: "0.35rem" }}>
							<label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Vendor Type *</label>
							<select value={vendorType} onChange={(e) => setVendorType(e.target.value)} className="input">
								{VENDOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
							</select>
						</div>

						<div style={{ display: "grid", gap: "0.5rem" }}>
							<label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
								Categories <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(max 8)</span>
							</label>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
								{ALL_CATEGORIES.map((cat) => (
									<button
										key={cat}
										type="button"
										onClick={() => toggleCategory(cat)}
										style={{
											padding: "0.3rem 0.75rem",
											borderRadius: "var(--radius-pill)",
											border: categories.includes(cat) ? "1px solid var(--cyan)" : "1px solid var(--border)",
											background: categories.includes(cat) ? "var(--cyan-dim)" : "transparent",
											color: categories.includes(cat) ? "var(--cyan)" : "var(--text-secondary)",
											fontSize: "0.8rem",
											cursor: "pointer",
											transition: "all var(--transition)",
										}}
									>
										{cat}
									</button>
								))}
							</div>
						</div>

						<div style={{ display: "grid", gap: "0.35rem" }}>
							<label style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
								Contact Email <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(hashed locally)</span>
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="input"
								placeholder="you@example.com"
							/>
							<small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Only a SHA-256 hash is sent to the agent.</small>
						</div>

						{error && (
							<div
								style={{
									background: "rgba(244,63,94,0.08)",
									border: "1px solid rgba(244,63,94,0.2)",
									borderRadius: "var(--radius-md)",
									padding: "0.75rem",
									color: "var(--red)",
									fontSize: "0.85rem",
								}}
							>
								{error}
							</div>
						)}

						<button type="submit" disabled={submitting} className="btn-primary">
							{submitting ? "Registering…" : "Register Vendor"}
						</button>
					</form>
				)}
			</div>
		</main>
	);
}

