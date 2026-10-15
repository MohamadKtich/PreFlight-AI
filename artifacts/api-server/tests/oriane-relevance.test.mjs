import assert from "node:assert/strict";
import { test } from "node:test";
import { searchOriane } from "../src/lib/oriane.ts";

async function withMockOriane(records, operation) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ORIANE_API_KEY;
  process.env.ORIANE_API_KEY = "regression-test-key";
  globalThis.fetch = async () => new Response(
    JSON.stringify({ data: { results: records } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ORIANE_API_KEY;
    else process.env.ORIANE_API_KEY = originalKey;
  }
}

const adidasBrief = {
  brand: "Adidas",
  market: "UAE",
  audience: "18–30 runners",
  goal: "Product Launch",
  concept: "A runner tests the new Adidas shoes during a night run in Dubai.",
};

test("Adidas running-shoe search rejects business/news and runner-only matches", async () => {
  const records = [
    {
      id: "phil-knight-business",
      platform: "YouTube",
      caption: "Phil Knight sold shoes from his car trunk and built a $100 billion empire.",
      transcript: "A business history of Nike and other companies.",
    },
    {
      id: "nike-index-news",
      platform: "YouTube",
      caption: "Nike Just Got Kicked Out Of S&P 100; stock is down.",
      transcript: "Market news about Nike shares, investors, and quarterly earnings.",
    },
    {
      id: "toy-runner",
      platform: "TikTok",
      caption: "The toy runner car is the funniest little racer.",
      transcript: "A toy car races around a track.",
    },
    {
      id: "adidas-running-shoe-test",
      platform: "TikTok",
      caption: "Testing Adidas running shoes on a night run.",
      transcript: "I tried these running shoes during a Dubai night run; here is how they feel.",
    },
    {
      id: "how-to-wear-running-shoes",
      platform: "YouTube",
      caption: "How to wear running shoes the right way.",
      transcript: "How to wear running shoes for daily outfits.",
    },
    {
      id: "runner-store-fitting",
      platform: "Instagram",
      caption: "Runners kept telling me to go get fitted.",
      transcript: "I walked into a store wearing a size 5.",
    },
  ];

  const result = await withMockOriane(records, () => searchOriane(adidasBrief));
  const byId = new Map(result.evidence.map((item) => [item.id, item]));
  assert.equal(byId.get("adidas-running-shoe-test")?.usedForScoring, true);
  assert.equal(byId.get("adidas-running-shoe-test")?.relevanceLevel, "high");
  assert.equal(byId.get("adidas-running-shoe-test")?.match.comparableOpening, true);
  assert.equal(byId.get("how-to-wear-running-shoes")?.match.comparableOpening, false);
  assert.equal(byId.get("runner-store-fitting")?.match.comparableOpening, false);
  for (const id of ["phil-knight-business", "nike-index-news", "toy-runner"]) {
    assert.equal(byId.get(id)?.relevanceLevel, "low", `${id} must be low relevance`);
    assert.equal(byId.get(id)?.usedForScoring, false, `${id} must not be scored`);
  }
});

test("CeraVe search requires skincare product context, not perfume or dermatologist alone", async () => {
  const records = [
    {
      id: "cerave-moisturizer",
      platform: "Instagram",
      caption: "CeraVe facial moisturizer for dry skin.",
      transcript: "A simple test of the CeraVe moisturizer and its texture.",
    },
    {
      id: "cerave-numbered-opening",
      platform: "TikTok",
      caption: "Three skincare mistakes that can leave skin feeling dry.",
      transcript: "CeraVe moisturizer is the product used in this skincare routine.",
    },
    {
      id: "cerave-perfume",
      platform: "YouTube",
      caption: "CeraVe perfume collection, skincare branding, and fragrance notes.",
      transcript: "A beauty creator compares perfume scents and fragrance.",
    },
    {
      id: "dermatologist-only",
      platform: "YouTube",
      caption: "A dermatologist explains common health myths.",
      transcript: "General health advice unrelated to cosmetic products.",
    },
  ];
  const brief = {
    brand: "CeraVe",
    market: "UAE",
    audience: "18–30 skincare consumers",
    goal: "Product Launch",
    concept: "A dermatologist opens with three skincare mistakes and introduces a moisturizer as the solution.",
  };

  const result = await withMockOriane(records, () => searchOriane(brief));
  const byId = new Map(result.evidence.map((item) => [item.id, item]));
  assert.equal(byId.get("cerave-moisturizer")?.usedForScoring, true);
  assert.equal(byId.get("cerave-moisturizer")?.match.comparableOpening, false);
  assert.equal(byId.get("cerave-numbered-opening")?.match.comparableOpening, true);
  assert.equal(byId.get("cerave-numbered-opening")?.match.openingPattern, "Numbered mistakes");
  assert.equal(byId.get("cerave-perfume")?.relevanceLevel, "low");
  assert.equal(byId.get("cerave-perfume")?.usedForScoring, false);
  assert.equal(byId.get("dermatologist-only")?.relevanceLevel, "low");
  assert.equal(byId.get("dermatologist-only")?.usedForScoring, false);
  assert.equal(result.trace.displayed, result.evidence.length);
  assert.equal(result.trace.retrieved, records.length);
  assert.equal(result.trace.used, result.evidence.filter((item) => item.usedForScoring).length);
  assert.equal(result.trace.excluded, 2);
});

test("trace distinguishes top-8 cap from low-relevance exclusions", async () => {
  const records = Array.from({ length: 10 }, (_, index) => ({
    id: `adidas-running-review-${index}`,
    platform: "TikTok",
    caption: `Adidas running shoe test ${index}: how these shoes feel on a night run.`,
    transcript: "I review Adidas running shoes during a Dubai training run.",
  }));
  const result = await withMockOriane(records, () => searchOriane(adidasBrief));
  assert.equal(result.trace.retrieved, 10);
  assert.equal(result.trace.used, 8);
  assert.equal(result.trace.capped, 2);
  assert.equal(result.trace.excluded, 0);
  assert.equal(result.trace.displayed, result.evidence.length);
  assert.equal(result.evidence.filter((item) => item.usedForScoring).length, 8);
  assert.ok(result.evidence.filter((item) => !item.usedForScoring)
    .every((item) => item.relevanceLevel !== "low"));
});