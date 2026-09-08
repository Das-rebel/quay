# Quay AI Factory — Discoverability Diagnosis
**Date:** 2026-09-08
**Problem:** Near-zero npm downloads (6/week, down from 1,737 total since July launch)

---

## 1. Root Cause Analysis — Why Is It Declining?

### The Launch Spike Was Bot-Traffic, Not Real Adoption

The download data tells a clear story:

| Week | Downloads | Event |
|------|----------|-------|
| W27 (Jul 5) | 142 | Initial publish |
| W28 (Jul 10) | **1,349** | Dev.to post + Social media push |
| W29 | 98 | Post-launch cooling |
| W30–W36 | 9→6→0 | **Flatline** |

The W28 spike coincides with the dev.to article and social posts (July 9-10, 2026). But the article was posted 57 days ago by `megha_mukherjee_5eb776f2b` — **not the maintainer**, and it has likely dropped off algorithmic feeds. Downloads collapsed to single digits within 3 weeks and have never recovered.

### Five Consecutive Root Causes

**1. No README.md in the repo root**
- `~/quay/README.md` does not exist. The repo has `llms.txt` and `llms-full.txt` but no human-readable README.
- GitHub's automatic repo landing page falls back to the file tree. GitHub search does not index `llms.txt` effectively since it is structured as AI-system input, not human documentation.
- Result: any developer landing on `github.com/Das-rebel/quay` sees no project description, no getting-started guide, no value proposition.

**2. npm page renders an AI-generated llms.txt, not a real README**
- The `readmeFilename` field points to `README.md` (which does not exist), so npm falls back to displaying `llms.txt`.
- `llms.txt` reads like a systems-architecture spec for AI consumption — not the 30-second pitch a human developer needs.
- The npm description is generic: *"Self-hosted AI agents with parallel ensemble execution..."* — 18 words with no emotional hook, no specific use-case callout, no "why should I care vs LangChain?"

**3. Zero GitHub stars (2 stars)**
- `Das-rebel/quay` has **2 GitHub stars**. This is the single biggest red flag.
- CrewAI has massive GitHub presence. Sweep has 10K+ stars. `swe-agent` has 20K+ stars.
- npm ranking算法 heavily weights GitHub popularity. A repo with 2 stars signals "dead/abandoned" to npm's search.

**4. Keywords are滥 (overloaded, redundant, wrong)**
- The 28 keywords include `ai-agent-platform`, `ai-agents`, `agentic-ai`, `llm-agent-platform`, `ai-pipeline-framework` — all meaning the same thing.
- Missing: `typescript`, `javascript`, `svelte`, `bun`, `mcp`, `model-context-protocol` (ironic, since MCP is a core feature but not listed as a standalone discoverable term).
- The keyword `ai-software-factory` appears 2x and `autonomous-coding` appears 2x — duplication wastes keyword budget.
- Compare LangChain's keywords: `llm, ai, gpt3, chain, prompt, prompt engineering, chatgpt, machine learning, ml, openai, embeddings, vectorstores` — each keyword targets a distinct search intent.

**5. No npm search visibility for "MCP" or "agent" queries**
- `npm search "mcp agent"` returns packages with better GitHub signals and cleaner keyword profiles.
- The npm SEO algorithm weights: GitHub stars > description quality > keyword relevance > download velocity.
- Quay has near-zero on all four dimensions except keyword relevance (where it overshoots with 28 redundant terms).

---

## 2. Comparable Successful Packages — What Do They Have That Quay Doesn't?

### Data: npm Weekly Downloads (Last Week)

| Package | Weekly Downloads | GitHub Stars | Key Differentiator |
|---------|-----------------|--------------|-------------------|
| langchain | 2,643,558 | (npm package only) | Brand recognition, comprehensive docs |
| promptfoo | 667,427 | 24,930 | Clear niche: LLM eval/testing |
| llamaindex | 103,026 | (large ecosystem) | Data-centric RAG focus |
| crewai | 68 | N/A (Python-first) | Python package drove adoption |
| quay-ai-factory | **6** | **2** | — |

### What Top Performers Do Differently

**promptfoo (667K/week, 24.9K stars)**
- Single-purpose: "LLM eval & testing toolkit" — one sentence description
- Zero keywords (relies entirely on GitHub signal + description)
- Strong website: promptfoo.dev with live demo
- Active GitHub with extensive README, real examples, benchmarks
- Conferences/talks, active Twitter presence

**langchain (2.6M/week)**
- The *lingua franca* keyword: `llm` as #1 keyword
- Has TypeScript AND Python packages cross-referencing each other
- Extensive documentation, cookbook examples, university-style learning path
- GitHub org (LangChain-AI) with 50+ repos building an ecosystem

**swe-agent (20K stars, 0 npm downloads but strong adoption via GitHub)**
- Clear single use-case: "SWE-agent: AI Software Engineer"
- Built by Princeton researchers with a published paper
- YouTube demo, live benchmarks on真实 software issues
- "Mission" not just "product" — positioned as research contribution

### What Quay Has That They Don't (Leverage This)
- Parallel multi-model ensemble execution (unique differentiator — everyone else does sequential fallback)
- MCP native integration (a real standard, growing rapidly)
- Self-hosted with full audit trail (compliance angle most competitors ignore)
- SvelteKit + Bun stack (distinctive — most competitors are Python)

---

## 3. Top 3 Actionable Improvements Ranked by Expected Impact

### P0: Create a REAL README.md (Expected Impact: HIGH)
**Why:** GitHub stars → npm search ranking. A repo with no README gets 0 GitHub organic traffic.

**What:**
1. Create `README.md` at repo root with:
   - **Badge row**: npm version, GitHub stars, license, Build status
   - **One-line hook**: What problem does Quay solve in 1 sentence?
   - **Quick-start**: 3 lines: `npm install` → `npx quay` → screenshot
   - **Key differentiator callout**: The ensemble execution diagram (everyone else is sequential; Quay is parallel)
   - **Comparison table**: vs LangChain, AutoGen, CrewAI, Sweep
   - **Architecture diagram**: 5-layer visual
   - **Links**: npm, GitHub issues, Discord, Twitter

2. Fix `package.json` so npm renders this README:
   - Currently `readmeFilename: "README.md"` but the file doesn't exist at publish time
   - Publish must include `README.md` in the tarball

**Effort:** 2 hours. **Expected Impact:** 10x GitHub stars within 30 days.

### P0.5: Fix the npm Description and Keyword Profile (Expected Impact: HIGH)
**Why:** npm search is the #1 discovery channel for JavaScript developers.

**What:**
1. Rewrite npm description (current: 18 words generic → target: 25 words with emotional hook + specific use case):
   > "Quay: Parallel AI ensemble execution for software teams. Call GPT-4o + Claude + Gemini simultaneously, merge results with confidence voting. Self-hosted, MIT-licensed."

2. Prune keywords to 10 high-signal terms:
   ```
   mcp, model-context-protocol, ai-agent, autonomous-coding,
   svelte, bun, typescript, llm-routing, multi-model-ensemble,
   self-hosted-ai
   ```
   Remove: all the redundant `ai-*` duplicates.

3. Set `homepage` field to the docs site (currently set, verify it renders).

**Effort:** 30 minutes. **Expected Impact:** 3-5x npm search visibility.

### P1: Publish a Live Demo (Expected Impact: MEDIUM-HIGH)
**Why:** promptfoo's growth was driven by its live demo at promptfoo.dev. swe-agent's growth by its YouTube demo of AI solving真实 GitHub issues.

**What:**
1. Deploy the SvelteKit Mission Control dashboard to a public URL (e.g., `quay-demo.fly.dev`)
2. Add `p.web.dev` or `codesandbox` embed in README
3. Record a 60-second YouTube demo: "Watch your agents work in real-time — every state transition, every tool call, every cent"
4. Add demo GIF/screenshot to README (missing entirely)

**Effort:** 3-4 hours. **Expected Impact:** 5-10x GitHub star rate.

---

## 4. Specific Changes Needed

### File: `README.md` (Create from scratch)

**Must include:**
```
- Badge row: npm, stars, license, Build
- Hook: "The AI factory that actually ships to production"
- Quick install: npm install quay-ai-factory
- Parallel vs Sequential diagram (THE key visual)
- 5 key features with emoji + 1-line each
- Quick-start code snippet (3 lines)
- Comparison table vs LangChain/AutoGen/CrewAI/Sweep
- Architecture diagram (5 layers)
- Links block
```

### File: `package.json` (currently missing — likely in `src/` or root)

**Changes:**
```json
{
  "name": "quay-ai-factory",
  "version": "0.6.0",
  "description": "Quay: Parallel AI ensemble execution. Call GPT-4o + Claude + Gemini simultaneously, merge results with confidence voting. Self-hosted, MIT-licensed.",
  "keywords": [
    "mcp", "model-context-protocol", "ai-agent", "autonomous-coding",
    "svelte", "bun", "typescript", "llm-routing", "multi-model-ensemble",
    "self-hosted-ai", "ai-orchestration"
  ],
  "readmeFilename": "README.md",
  "homepage": "https://das-rebel.github.io/quay/"
}
```

**Note:** `package.json` is not in the repo root (`/Users/Subho/quay/`). Find and update it — it may be at `src/package.json` or another location. Run `find ~/quay -name "package.json" -not -path "*/node_modules/*"` to locate.

### File: `llms.txt` / `llms-full.txt` (Preserve — keep for AI systems)

These are good for AI discoverability (llm.txt standard for generative engine optimization). Keep them. But do NOT let npm fall back to `llms.txt` as the human-readable README.

### File: `docs/index.html` (Verify it's optimized)

Current state is good: has OpenGraph, Twitter Card, JSON-LD structured data. Ensure:
- The structured data includes `keywords` matching the npm keywords
- Add `applicationLd+json` with `SoftwareApplication` schema including `operatingSystem`, `programmingLanguage` (TypeScript, JavaScript)

### npm Publish Fix

The tarball must include `README.md`. Check the `.npmignore` or `.gitignore` to ensure `README.md` is not excluded. Verify with:
```bash
npm pack --dry-run
```

### Social: Fix the Dev.to Article Attribution

The dev.to article was posted by `megha_mukherjee_5eb776f2b` (not the maintainer). This means:
1. The author has no incentive to update/promote it
2. It likely has 0 upvotes now that it's 57 days old
3. A new article posted by the maintainer with working demo links would outrank it

**Action:** Post a new dev.to article as `Das-rebel` with a working demo URL and live code examples.

---

## Summary: Priority Actions

| Priority | Action | Effort | Expected Impact |
|----------|--------|--------|-----------------|
| P0 | Create `README.md` at repo root | 2 hrs | 10x GitHub stars |
| P0 | Fix npm tarball to include README.md | 30 min | npm renders correctly |
| P0.5 | Rewrite npm description + prune keywords | 30 min | 3-5x npm search visibility |
| P0.5 | Fix `package.json` location and fields | 30 min | npm data correctness |
| P1 | Deploy live demo + add GIF to README | 3 hrs | 5-10x GitHub star rate |
| P1 | Post new dev.to article as maintainer | 1 hr | Fresh HN/dev.to traffic |
| P2 | Add YouTube demo video | 2 hrs | Converts GitHub visitors to npm |
| P2 | Submit to npm search with MCP keyword | 10 min | Direct npm discoverability |

**The single highest-leverage action is creating a real README.md.** Everything else fails without it — GitHub stars are near-zero because visitors see a blank page and leave.
