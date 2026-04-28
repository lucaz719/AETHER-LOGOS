import { NextRequest, NextResponse } from "next/server";
import PinataClient from "@pinata/sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> },
) {
  const { pubkey } = await params;
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const pinata = new PinataClient({ pinataApiKey: apiKey, pinataSecretApiKey: secretKey });

  const { IpfsHash } = await pinata.pinFileToIPFS(
    require("stream").Readable.from(buffer),
    { pinataMetadata: { name: `listing-${pubkey}-image` } },
  );

  return NextResponse.json({ cid: IpfsHash });
}
