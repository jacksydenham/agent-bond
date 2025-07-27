import type { NextApiRequest, NextApiResponse } from "next";

const buffer = new Set<string>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { sentence } = req.body as { sentence: string };
    if (!sentence) return res.status(400).end("Missing sentence");
    buffer.add(sentence);
    return res.status(200).json({ success: true });
  }

  if (req.method === "GET") {
    // clear buffer
    const items = Array.from(buffer);
    buffer.clear();
    return res.status(200).json(items);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end("Method Not Allowed");
}
