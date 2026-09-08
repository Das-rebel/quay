# Quay+Marketic SOTA Plan vs. Helena
## Competitive Intelligence Report + Product Roadmap
### Version 2.0 — Agent Ensemble + Persistent Memory Architecture

---

## What We Now Know About Helena

### Product Teardown
- **Name:** Helena — "autonomous AI marketer" from EnrichLabs
- **Pricing:** $99/month (regular) | **$49 lifetime via AppSumo** ← KEY SIGNAL
- **Trial:** 3-day free trial
- **Positioning:** "AI marketing employee that works while you sleep"
- **Tech:** Likely GPT-4 class models, closed SaaS, no transparent reasoning

### Helena's Feature Set
| Capability | Status | Notes |
|------------|--------|-------|
| SEO content (1500-2000 word articles + images → CMS publish) | ✅ | WordPress, Webflow, Shopify |
| Social media (calendar, captions, visuals, publishing) | ✅ | Instagram, FB, LinkedIn, X/Twitter, TikTok |
| Email flows (Klaviyo/Mailchimp) | ✅ | Copy, templates, campaigns |
| Paid ads optimization (Meta/Google/TikTok) | ✅ | Daily budget reallocation |
| Daily briefing to inbox | ✅ | 8am performance summary |
| Brand voice learning | ⚠️ | Basic onboarding study, not persistent |
| Competitive intelligence | ❌ | No formal competitor research |
| Transparent decision audit trail | ❌ | Black box |
| Persistent memory across sessions | ❌ | Resets each session |
| Programmatic extensibility | ❌ | Locked SaaS |
| Pricing model | $99/mo or $49 lifetime | AppSumo deal signals growth-phase acquisition strategy |

### Helena's Real Weaknesses (Our Opportunities)
1. **Black box** — users trust but can't verify. Every decision should be logged with full reasoning.
2. **No persistent memory** — Helena forgets everything after each session. Your brand, your voice, your history — gone.
3. **No competitive intelligence** — she reacts to your data but never watches competitors.
4. **AppSumo deal at $49** — they're buying users, not profit. This means they're vulnerable if you ship faster.
5. **No ensemble reasoning** — single model, single perspective. No multi-model voting or confidence scoring.
6. **No transparent cost tracking** — users don't know what each decision costs.

---

## The SOTA Architecture We Need to Build

### Core Insight: "Marketing Employee with a Brain"

Helena is a **dumb agent** — she does tasks without memory or context. The real moat is building a **persistent marketing intelligence** that:
- **Remembers everything** about your brand across sessions (Letta-style persistent memory)
- **Watches competitors continuously** (autonomous scout loop)
- **Reasons with multiple perspectives** (ensemble multi-model reasoning)
- **Explains every decision** (full transparency audit trail)
- **Learns what works** (reinforcement from results)

### Architecture: 5-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Transparent Audit Trail                          │
│  Every decision logged: model used, cost, reasoning,       │
│  confidence score, outcome. Exportable.                      │
├─────────────────────────────────────────────────────────────┤
│  LAYER 4: Ensemble Reasoning Engine                          │
│  Multiple models vote on each decision. Confidence-weighted  │
│  scoring. Fast path for simple tasks, deep reasoning for     │
│  complex ones. Uses ox-alpha (1.05M ctx) for long-horizon.  │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: Composable Execution Engine                        │
│  MCP-based task execution: content → CMS, ads → API, email → │
│  Klaviyo. With human approval gates (configurable).         │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Autonomous Intelligence Loop                       │
│  Scout: competitors, signals, trends. Spy: positioning,     │
│  messaging, gaps. Think: strategy. Act: recommendations.     │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: Persistent Brand Memory                           │
│  Brand voice profile, preferences, history, performance     │
│  baseline. Remembers everything across sessions.             │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Persistent Brand Memory

### What It Is
A persistent memory layer that stores brand identity, voice, preferences, performance baselines, and learning — across ALL sessions. Unlike Helena who resets, this remembers forever.

### Architecture (Letta-Inspired)
```
marketic/
├── memory/                         # NEW
│   ├── brand_memory.py             # Core memory store (SQLite + embeddings)
│   ├── voice_profile.py            # Brand voice: tone, vocabulary, style
│   ├── performance_baseline.py     # Historical metrics for comparison
│   ├── preference_store.py         # User preferences, approval thresholds
│   ├── learning_log.py             # What worked, what didn't (reinforcement)
│   └── embedding_index.py          # Semantic search over brand knowledge
```

### Memory Types
| Memory Type | What It Stores | How It's Updated |
|-------------|----------------|------------------|
| **Brand Voice** | Tone, vocabulary, style, banned words | Analyzed from existing content |
| **Competitor Intel** | Known competitors, their positioning, messaging | Scout loop findings |
| **Performance Baseline** | Historical CTR, ROAS, traffic benchmarks | Daily analytics pull |
| **Preferences** | Approval thresholds, budget limits, brand guidelines | User input |
| **Learning Log** | What worked (high engagement), what failed | Post-campaign analysis |

### MCP Tools
- `remember_brand(brand_url)` → analyzes site → builds voice profile
- `get_brand_memory(query)` → semantic search over all brand knowledge
- `update_memory(event_type, data)` → appends to appropriate memory store
- `get_performance_baseline(channel)` → returns historical benchmarks

### Differentiation
Helena has NO persistent memory. Every session starts blank. We remember everything.

---

## Layer 2: Autonomous Intelligence Loop

### What It Is
A continuous scout-and-spy loop that watches competitors, detects signals (trends, threats, opportunities), and feeds strategic recommendations to the execution layer.

### This Is Where We Destroy Helena

Helena only reacts to YOUR data. She never:
- Watches what competitors publish
- Alerts you when a competitor launches a campaign
- Tracks competitor messaging shifts
- Identifies gaps in real-time

### Components
```
marketic/
├── intelligence/                   # NEW
│   ├── scout/
│   │   ├── competitor_watcher.py    # Track competitor content, ads, social
│   │   ├── trend_detector.py       # Detect industry trends before they peak
│   │   ├── signal_aggregator.py    # Reddit, HN, Twitter, news for brand/competitors
│   │   └── anomaly_detector.py     # Sudden traffic/spam/conversion anomalies
│   ├── spy/
│   │   ├── positioning_mapper.py   # Real-time competitive positioning
│   │   ├── messaging_analyzer.py    # Track competitor messaging themes
│   │   └── gap_identifier.py       # Find whitespace in positioning
│   └── strategist/
│       ├── strategy_recommender.py  # Generate strategic recommendations
│       └── opportunity_scorer.py    # Rank opportunities by impact/probability
```

### The Scout Pipeline (Continuous, Not On-Demand)
```
Every 6 hours:
  1. Scrape competitor websites (FireCrawl/Browser MCP)
  2. Pull their recent social posts (Agent Reach → Twitter, LinkedIn)
  3. Monitor their ad creative (Meta Ad Library API)
  4. Track industry news/trends (Reddit, HN, Exa search)
  5. Update positioning map with new data
  6. Alert if significant changes detected
  7. Generate strategic recommendations if gaps found
```

### MCP Tools
- `start_scout_loop()` → activates continuous competitor monitoring
- `get_positioning_update(competitors[])` → latest positioning map
- `get_strategic_alerts()` → top 3 opportunities/threats right now
- `analyze_competitor_messaging(brand)` → messaging themes + gaps

### Ensemble Voting for Intelligence
When analyzing competitors, run multiple models in parallel:
- `ox-alpha` (1.05M ctx, FREE) → long-horizon reasoning on strategy
- `qwen/qwen3.7-max` → fast pattern recognition on content
- `google/gemini-3.6-flash` → multimodal analysis of visuals

Confidence-weighted consensus → highest confidence wins.

---

## Layer 3: Composable Execution Engine

### What It Is
Task execution across content, ads, email, social — with configurable human approval gates. The key: everything goes through MCP so any agent (Quay, Claude Code, Letta) can call it.

### Execution Modes (User-Configurable Per Capability)
| Mode | Behavior | Human Required? |
|------|----------|-----------------|
| **Manual** | Generate → user reviews → user approves → execute | Yes, every step |
| **Advisory** | Generate → auto-deliver to user → wait for approval | Yes, for execution |
| **Autopilot** | Generate → execute → report | No |

### Modules
```
marketic/
├── execution/                      # NEW (or enhanced)
│   ├── content/
│   │   ├── seo_writer.py           # 1500-2000 word articles
│   │   ├── image_generator.py      # DALL-E/Flux/SDX integration
│   │   └── cms_publisher.py        # WordPress, Webflow, Shopify
│   ├── ads/
│   │   ├── meta_ads.py             # Meta Marketing API
│   │   ├── google_ads.py          # Google Ads API
│   │   └── budget_router.py        # ROAS-based allocation
│   ├── email/
│   │   ├── klaviyo_flows.py       # Klaviyo API
│   │   ├── mailchimp_campaigns.py # Mailchimp API
│   │   └── campaign_dispatcher.py  # Execute approved campaigns
│   └── social/
│       ├── scheduler.py            # Optimal posting times
│       └── platform_publisher.py   # IG, FB, LinkedIn, X, TikTok
```

### MCP Tools (Enhanced)
- `generate_seo_article(keyword, brand_memory_id)` → full article with images
- `publish_to_cms(article_id, platform)` → auto-publish or draft for review
- `optimize_ad_budget(channel)` → recommended reallocation based on yesterday's ROAS
- `execute_budget_reallocation(changes)` → apply with approval gate
- `build_email_campaign(objective, audience)` → full campaign with flows
- `schedule_social_content(calendar)` → content calendar + auto-publish

---

## Layer 4: Ensemble Reasoning Engine

### What It Is
Every significant decision runs through multi-model ensemble voting. Simple tasks use 1 model. Complex tasks use 3-5 models in parallel.

### Model Tiering (Already Built Into Marketic)
| Task Complexity | Models Used | Cost/Task |
|-----------------|-------------|-----------|
| Ad copy variant | 1 cheap (qwen2.5:3b local) | ~$0.0001 |
| Social post | 1 mid (minimax-m2.7) | ~$0.001 |
| Competitor analysis | 3 parallel (ox-alpha + qwen-max + gemini-flash) | ~$0.02 |
| Campaign strategy | 5 models + confidence voting | ~$0.05 |
| Brand voice analysis | 2 parallel (glm-5.1 + ox-alpha) | ~$0.01 |

### Confidence Scoring
```
ensemble_vote(models[], task, context) → {
  decisions: ModelDecision[],
  confidence: 0.0-1.0,
  consensus: bool,
  winning_model: string,
  reasoning_chain: string[]
}
```

### ox-alpha Integration
**Critical:** `stealth/ox-alpha` (1.05M context, FREE on OpenRouter) enables long-horizon agentic reasoning that Helena simply cannot do:
- Analyzing 6 months of competitor content at once
- Reasoning about brand strategy across millions of data points
- Sustained agentic work without context truncation

---

## Layer 5: Transparent Audit Trail

### What It Is
Every single action Helena takes — and every action WE take — is logged with full transparency.

### Audit Log Schema
```json
{
  "timestamp": "2026-08-22T08:00:00Z",
  "action": "publish_seo_article",
  "model_used": "ox-alpha",
  "model_cost": 0.003,
  "input_tokens": 2847,
  "output_tokens": 1847,
  "reasoning_chain": [
    "Keyword 'fintech D2C growth' has difficulty 34, volume 12k/mo",
    "Competitor X published similar article 3 weeks ago → now ranking #2",
    "Article covers 8 subtopics, target 1850 words",
    "Image prompt: 'modern fintech dashboard with growth chart'"
  ],
  "confidence": 0.87,
  "human_approved": true,
  "outcome": {
    "published": true,
    "url": "https://example.com/fintech-d2c-growth",
    "time_taken_ms": 4200
  }
}
```

### Differentiation
Helena: "Your campaign was paused."
Quay: "Campaign paused because ROAS dropped below 1.5x threshold for 3 consecutive days. Decision made by ox-alpha at confidence 0.91. Alternative considered: reduce budget by 30% instead. Human approved at 08:00am."

---

## Implementation Roadmap

### Phase 1: Brand Memory + Simple Ensemble (Week 1-2)
**Goal:** First "wow" moment — persistent brand voice that Helena can't match.

- [ ] Build `marketic/memory/` module (brand_memory.py, voice_profile.py)
- [ ] `learn_brand_voice(url)` → extracts tone, vocabulary, banned words → stores in SQLite
- [ ] `adapt_content_voice(content, brand_id)` → rewrites to match brand
- [ ] Add ox-alpha to Marketic's model pool for long-context analysis
- [ ] First ensemble: voice analysis runs 2 models in parallel

**Demo:** "Analyze my brand → generate a tweet that sounds exactly like us."

### Phase 2: Scout Loop + Positioning Map (Week 3-4)
**Goal:** Autonomous competitor watching that Helena doesn't have.

- [ ] Build `marketic/intelligence/scout/` (competitor_watcher.py, trend_detector.py)
- [ ] Integrate Agent Reach for Twitter/Reddit monitoring
- [ ] Build positioning_mapper.py → x/y map with brand gaps
- [ ] MCP tools: `watch_competitor(brand)`, `get_positioning_map()`, `get_trend_alerts()`

**Demo:** "Show me a real-time positioning map of all fintech D2C competitors."

### Phase 3: CMS Publishing + SEO Writer (Week 5-7)
**Goal:** Match Helena's SEO content capability + add transparency.

- [ ] Build `marketic/execution/content/seo_writer.py`
- [ ] Integrate WordPress REST API + Shopify Storefront API
- [ ] Add `publish_seo_article(keyword, brand_id, cms_target)`
- [ ] Full audit trail for every article (keyword research, model, cost, reasoning)

**Demo:** "Write and publish a 1,800-word SEO article about 'D2C fintech growth strategies' to my WordPress site."

### Phase 4: Daily Briefing Engine (Week 7-8)
**Goal:** Helena's "8am inbox" experience, but with full transparency.

- [ ] Build `marketic/briefing/` (report_collector.py, insight_generator.py, email_dispatcher.py)
- [ ] Pull Google Analytics, Meta Ads, Shopify data → summarize
- [ ] Generate plain-English briefing with recommendations
- [ ] Email via Klaviyo/SendGrid

**Demo:** Every morning, a briefing that says: "Yesterday: +12% traffic. Your competitor launched X. Recommended action: Y."

### Phase 5: Ad Optimizer (Week 9-12)
**Goal:** Match Helena's daily ad optimization, exceed on transparency.

- [ ] Build `marketic/execution/ads/` (meta_ads.py, google_ads.py, budget_router.py)
- [ ] MCP tools: `sync_ad_campaigns()`, `optimize_ad_budget()`, `execute_reallocation(changes)`
- [ ] Human approval gate before any budget > $100 changes
- [ ] Full reasoning chain for every optimization decision

### Phase 6: Full Autopilot Mode (Week 13-16)
**Goal:** Flip the switch — autonomous operation with confidence thresholds.

- [ ] Add `mode: "autopilot"` flag per capability
- [ ] Confidence threshold: above X → auto-execute; below X → flag human
- [ ] Letta-style persistent memory that survives restarts
- [ ] Self-improvement: learning_log feedback loop

---

## Key Differentiators vs. Helena (The SOTA Moat)

| Dimension | Helena | Our SOTA System |
|-----------|--------|-----------------|
| **Memory** | None — resets each session | Persistent brand memory across ALL sessions |
| **Competitor Intel** | None | Continuous autonomous scout loop |
| **Reasoning** | Single model | Ensemble multi-model voting |
| **Transparency** | Black box | Full audit trail + reasoning chain |
| **Cost Visibility** | Hidden | Every decision shows model + cost |
| **Context Window** | Limited | ox-alpha: 1.05M tokens FREE |
| **Extensibility** | None — locked SaaS | MCP composable — any agent can use |
| **Learning** | None | Reinforcement from outcomes |
| **Pricing** | $99/mo or $49 AppSumo | Free (open-source) + your LLM costs |

---

## Product Positioning: The Anti-Helena

> **"Helena is a black box. We're the marketing OS that never forgets, never hides, and never stops watching."**

**Tagline:** *"The AI Marketing Employee with a Perfect Memory"*

**Core pitch:**
- Helena sounds like a miracle until something goes wrong — you have no idea why she paused your campaign or what she decided.
- Quay+Marketic is the **transparent alternative**: every decision logged, every cost tracked, every reasoning chain visible.
- Plus: persistent brand memory (Helena forgets everything), autonomous competitor watching (Helena only looks at you), and an ensemble of models (Helena uses one).

**Target users:**
1. Developers/agencies who want programmatic control
2. Sophisticated marketing teams who need audit trails for clients
3. Growth teams who want competitor intelligence built-in

---

## Technical Dependencies to Acquire/Build

| Dependency | Purpose | Source |
|-----------|---------|--------|
| FireCrawl/Browser MCP | Web scraping for competitor intel | ~/omniclaw/skills/browser/sota-browser/ |
| Agent Reach | Social monitoring (Twitter, Reddit, LinkedIn) | ~/.pi/agent/skills/agent-reach/ |
| Letta (optional) | Agent memory architecture reference | github.com/letta-ai/letta |
| OpenCode Go | ox-alpha (1.05M ctx, FREE) for long-horizon reasoning | openrouter.ai |
| n8n (optional) | Workflow orchestration for non-technical users | n8n.io |
| SQLite + embeddings | Persistent memory store | local |

---

## Immediate Actions (This Week)

1. **Add `stealth/ox-alpha` to Marketic** — it was just added to OpenRouter. Start using it for all long-context competitor analysis.
2. **Build the brand memory layer** — voice profile + preference store. This is the fastest differentiator.
3. **Write `learn_brand_voice` MCP tool** — 3-day implementation. Demo: analyze a URL → generate content in that voice.
4. **Add first ensemble pair** — voice analysis: 2 models (glm-5.1 + ox-alpha) → confidence-weighted vote.
5. **Ship the Scout Loop** — continuous Twitter/Reddit monitoring for competitor signals. This is what Helena completely lacks.

---

*End of SOTA Competitive Plan v2.0*
