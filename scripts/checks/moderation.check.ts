// Run: NODE_OPTIONS=--conditions=react-server npx tsx scripts/checks/moderation.check.ts
// Proves the AI output parser only accepts the documented shape and never
// lets a flagged or reason-less decision through.
import assert from "node:assert/strict";
import { parseModerationOutput } from "../../lib/moderation";

const approve = parseModerationOutput('{"decision":"approve","reasons":[],"flags":[]}');
assert.deepEqual(approve, { decision: "approve", reasons: [], flags: [] });

// Prose around the JSON is tolerated.
assert.equal(parseModerationOutput('Sure! {"decision":"reject","reasons":["Partisan."],"flags":["political"]} ok')?.decision, "reject");

// Approve + flag is downgraded to human review.
assert.equal(parseModerationOutput('{"decision":"approve","reasons":[],"flags":["political"]}')?.decision, "review");

// Reject without a reason is downgraded to human review.
assert.equal(parseModerationOutput('{"decision":"reject","reasons":[],"flags":["off_topic"]}')?.decision, "review");

// Unknown decisions, broken JSON and missing JSON are rejected outright.
assert.equal(parseModerationOutput('{"decision":"publish"}'), null);
assert.equal(parseModerationOutput("{not json"), null);
assert.equal(parseModerationOutput("I approve this article."), null);

// Unknown flags are dropped; reasons are capped.
const capped = parseModerationOutput(
  JSON.stringify({ decision: "reject", reasons: ["a", "b", "c", "d", "e", 7], flags: ["political", "made_up"] })
);
assert.deepEqual(capped?.flags, ["political"]);
assert.equal(capped?.reasons.length, 4);

console.log("moderation parser: all checks passed");
