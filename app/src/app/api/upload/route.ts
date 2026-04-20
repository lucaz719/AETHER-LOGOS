import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_SECRET_KEY;
  if (!apiKey || !secret) {
    return NextResponse.json({ error: "Pinata credentials are missing" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const body = new FormData();
  body.append("file", file, file.name);

  const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secret,
    },
    body,
  });
  if (!pinataRes.ok) {
    const errorBody = await pinataRes.text();
    return NextResponse.json({ error: errorBody || "Pinata upload failed" }, { status: 502 });
  }

  const payload = (await pinataRes.json()) as { IpfsHash: string };
  const cid = payload.IpfsHash;
  return NextResponse.json({
    cid,
    ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
  });
}
