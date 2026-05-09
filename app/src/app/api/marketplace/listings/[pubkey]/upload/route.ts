import { NextRequest, NextResponse } from "next/server";

const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> },
) {
  const { pubkey } = await params;

  // Check for JWT first, then fallback to API key/secret
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    return NextResponse.json({ error: "Pinata credentials are missing" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Build Pinata FormData
  const pinataForm = new FormData();
  pinataForm.append("file", file, `listing-${pubkey}-image`);
  pinataForm.append(
    "pinataMetadata",
    JSON.stringify({ name: `listing-${pubkey}-image` }),
  );

  // Build headers (JWT preferred over API key)
  const headers: Record<string, string> = {};
  if (PINATA_JWT) {
    headers["Authorization"] = `Bearer ${PINATA_JWT}`;
  } else {
    headers["pinata_api_key"] = PINATA_API_KEY!;
    headers["pinata_secret_api_key"] = PINATA_SECRET_KEY!;
  }

  try {
    const pinataRes = await fetch(PINATA_URL, {
      method: "POST",
      headers,
      body: pinataForm,
    });

    if (!pinataRes.ok) {
      const text = await pinataRes.text();
      console.error("[listing-upload] Pinata error:", pinataRes.status, text);
      return NextResponse.json(
        { error: `Pinata upload failed (${pinataRes.status})` },
        { status: 502 },
      );
    }

    const payload = (await pinataRes.json()) as { IpfsHash: string };
    return NextResponse.json({ cid: payload.IpfsHash });
  } catch (err) {
    console.error("[listing-upload] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
