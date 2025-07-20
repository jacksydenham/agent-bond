/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { getMeta, setMeta } from "src/app/lib/jira";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const meta = getMeta(req);
    const { boardId } = req.body as { boardId: string };

    if (!boardId) throw new Error("Missing boardId");
    meta.boardId = boardId;
    setMeta(meta, res);

    return res.status(200).end();
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
}
