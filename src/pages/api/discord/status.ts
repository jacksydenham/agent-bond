/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

const BOT_URL = process.env.BOT_URL || "http://localhost:4000/status";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  let botRes: Response;

  try {
    botRes = await fetch(BOT_URL);
  } catch (err: any) {
    console.warn(`⚠️ Could not reach bot at ${BOT_URL}: ${err.message}`);
    return res.status(200).json({ online: false, listening: false });
  }
  if (!botRes.ok) {
    console.warn(`⚠️ Bot returned HTTP ${botRes.status}`);
    return res.status(200).json({ online: false, listening: false });
  }
  try {
    const status = await botRes.json();
    return res.status(200).json(status);
  } catch (err: any) {
    console.warn(`⚠️ Could not parse bot status JSON: ${err.message}`);
    return res.status(200).json({ online: false, listening: false });
  }
}
