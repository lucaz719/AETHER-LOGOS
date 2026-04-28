import { NextRequest, NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;
// Legacy key-pair auth still supported as fallback
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/**
 * POST /api/upload
 * Body: multipart/form-data with field "file"
 * Returns: { cid: string, ipfsUrl: string, mock?: true }
 *
 * Auth priority: PINATA_JWT > PINATA_API_KEY + PINATA_SECRET_KEY > mock fallback
 * Mock mode returns a deterministic CID so development works without credentials.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided. Send a multipart/form-data request with field 'file'." },
        { status: 400 },
      );
    }

    const fileName = (file as File).name ?? "upload";

    // ── Development fallback (no Pinata credentials set) ─────────────
    if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
      const mockCid = `bafyDEV${Buffer.from(fileName + file.size).toString("base64url").slice(0, 32)}`;
      console.warn("[upload] No Pinata credentials — returning mock CID:", mockCid);
      const gateway =
        process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";
      return NextResponse.json({
        cid: mockCid,
        ipfsUrl: `${gateway}/${mockCid}`,
        mock: true,
      });
    }

    // ── Build Pinata request ─────────────────────────────────────────
    const pinataForm = new FormData();
    pinataForm.append("file", file, fileName);
    pinataForm.append(
      "pinataMetadata",
      JSON.stringify({ name: `aether-logos/${fileName}` }),
    );

    const headers: Record<string, string> = {};
    if (PINATA_JWT) {
      headers["Authorization"] = `Bearer ${PINATA_JWT}`;
    } else {
      headers["pinata_api_key"] = PINATA_API_KEY!;
      headers["pinata_secret_api_key"] = PINATA_SECRET_KEY!;
    }

    const pinataRes = await fetch(PINATA_URL, {
      method: "POST",
      headers,
      body: pinataForm,
    });

    if (!pinataRes.ok) {
      const text = await pinataRes.text();
      console.error("[upload] Pinata error:", pinataRes.status, text);
      return NextResponse.json(
        { error: text || `Pinata upload failed (${pinataRes.status})` },
        { status: 502 },
      );
    }

    const payload = (await pinataRes.json()) as { IpfsHash: string };
    const cid = payload.IpfsHash;
    const gateway =
      process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";

    return NextResponse.json({
      cid,
      ipfsUrl: `${gateway}/${cid}`,
    });
  } catch (err) {
    console.error("[upload] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
