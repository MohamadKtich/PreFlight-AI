import { Router, type IRouter } from "express";
import { SearchPreflightBody, SearchPreflightResponse } from "@workspace/api-zod";
import { OrianeSearchError, searchOriane } from "../lib/oriane";

const router: IRouter = Router();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_IP = 6;
const MAX_ACTIVE_PER_IP = 2;
const MAX_ACTIVE_SEARCHES = 3;
const requestTimesByIp = new Map<string, number[]>();
const activeSearchesByIp = new Map<string, number>();
let activeSearches = 0;

router.post("/preflight/search", async (req, res): Promise<void> => {
  const parsed = SearchPreflightBody.safeParse(req.body);
  if (!parsed.success || (
    parsed.data && ["brand", "market", "audience", "concept"].some(
      (field) => !parsed.data[field as "brand" | "market" | "audience" | "concept"].trim(),
    )
  )) {
    res.status(400).json({ error: "Brand, market, audience, campaign goal, and concept are required." });
    return;
  }

  const brief = {
    ...parsed.data,
    brand: parsed.data.brand.trim(),
    market: parsed.data.market.trim(),
    audience: parsed.data.audience.trim(),
    concept: parsed.data.concept.trim(),
  };
  const now = Date.now();
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  for (const [key, timestamps] of requestTimesByIp) {
    const recent = timestamps.filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
    if (recent.length) requestTimesByIp.set(key, recent);
    else requestTimesByIp.delete(key);
  }
  const recentRequests = (requestTimesByIp.get(ip) ?? [])
    .filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (
    recentRequests.length >= MAX_REQUESTS_PER_IP ||
    (activeSearchesByIp.get(ip) ?? 0) >= MAX_ACTIVE_PER_IP ||
    activeSearches >= MAX_ACTIVE_SEARCHES
  ) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "PreFlight search is temporarily rate limited; retry shortly." });
    return;
  }
  recentRequests.push(now);
  requestTimesByIp.set(ip, recentRequests);
  activeSearches += 1;
  activeSearchesByIp.set(ip, (activeSearchesByIp.get(ip) ?? 0) + 1);
  try {
    const result = await searchOriane(brief);
    res.json(SearchPreflightResponse.parse(result));
  } catch (error) {
    const status = error instanceof OrianeSearchError ? error.status : undefined;
    req.log.warn({ status, kind: error instanceof OrianeSearchError ? error.message : "Unexpected search error" }, "Oriane search failed");
    res.status(502).json({
      error: status ? `Oriane Live unavailable (HTTP ${status}).` : "Oriane Live unavailable.",
    });
  } finally {
    activeSearches -= 1;
    const remainingForIp = (activeSearchesByIp.get(ip) ?? 1) - 1;
    if (remainingForIp > 0) activeSearchesByIp.set(ip, remainingForIp);
    else activeSearchesByIp.delete(ip);
  }
});

export default router;