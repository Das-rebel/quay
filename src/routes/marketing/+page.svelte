<script lang="ts">
  // ─── Types ──────────────────────────────────────────────────────────────

  interface Gap {
    id: string;
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    confidence: number;
  }

  interface PositioningEntry {
    brand: string;
    x: number; // 0-100 price axis
    y: number; // 0-100 quality axis
  }

  interface CompetitorResult {
    brand: string;
    analyzedAt: string;
    summary: string;
    gaps: Gap[];
    positioning: PositioningEntry[];
    shareOfVoice: number;
    sentimentScore: number;
  }

  interface Creative {
    id: string;
    headline: string;
    body: string;
    cta: string;
    emotionalTrigger: string;
    confidence: number;
    platform: string;
  }

  interface CreativeResult {
    competitor: string;
    generatedAt: string;
    creatives: Creative[];
  }

  interface Campaign {
    id: string;
    name: string;
    objective: string;
    budget: number;
    platforms: string[];
    status: 'draft' | 'active' | 'paused' | 'completed';
    createdAt: string;
    summary: string;
  }

  interface CampaignResult {
    campaign: Campaign;
    allocations: Array<{ platform: string; budgetShare: number; expectedReach: number }>;
  }

  interface Signal {
    id: string;
    source: string;
    title: string;
    description: string;
    signalType: 'opportunity' | 'threat' | 'trend' | 'anomaly';
    confidence: number;
    timestamp: string;
  }

  interface SignalResult {
    signals: Signal[];
    totalFound: number;
    fetchedAt: string;
  }

  interface AttributionChannel {
    channel: string;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    roas: number;
  }

  interface PerformanceResult {
    campaignId: string;
    campaignName: string;
    totalSpend: number;
    totalRevenue: number;
    overallRoas: number;
    channels: AttributionChannel[];
    trend: Array<{ date: string; spend: number; revenue: number }>;
  }

  // ─── State ──────────────────────────────────────────────────────────────

  let activeTab: 'analyze' | 'creatives' | 'campaign' | 'signals' | 'performance' = $state('analyze');

  // Competitor analysis state
  let analyzeBrand = $state('');
  let analyzeDays = $state(7);
  let analyzePromise: Promise<CompetitorResult> | null = $state(null);
  let analyzeError = $state<string | null>(null);

  // Creative generator state
  let creativeCompetitor = $state('');
  let creativeCount = $state(6);
  let creativePromise: Promise<CreativeResult> | null = $state(null);
  let creativeError = $state<string | null>(null);

  // Campaign builder state
  let campaignName = $state('');
  let campaignObjective = $state('awareness');
  let campaignBudget = $state(5000);
  let campaignPlatforms: string[] = $state(['google', 'meta']);
  let campaignPromise: Promise<CampaignResult> | null = $state(null);
  let campaignError = $state<string | null>(null);

  // Signal feed state
  let signalQuery = $state('');
  let signalSources: string[] = $state(['reddit', 'news', 'social']);
  let signalPromise: Promise<SignalResult> | null = $state(null);
  let signalError = $state<string | null>(null);

  // Performance state
  let performanceCampaignId = $state('');
  let performancePromise: Promise<PerformanceResult> | null = $state(null);
  let performanceError = $state<string | null>(null);

  // ─── API helper ─────────────────────────────────────────────────────────

  const API_BASE = '/api/marketing';
  const AUTH_HEADER = 'Bearer quay-dev-key';

  async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_HEADER,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body || res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  function runAnalyze() {
    if (!analyzeBrand.trim()) {
      analyzeError = 'Please enter a brand name';
      return;
    }
    analyzeError = null;
    analyzePromise = apiCall<CompetitorResult>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ brand: analyzeBrand.trim(), days: analyzeDays }),
    });
  }

  function runCreatives() {
    if (!creativeCompetitor.trim()) {
      creativeError = 'Please enter a competitor name';
      return;
    }
    creativeError = null;
    creativePromise = apiCall<CreativeResult>('/creatives', {
      method: 'POST',
      body: JSON.stringify({ competitor: creativeCompetitor.trim(), count: creativeCount }),
    });
  }

  function runCampaign() {
    if (!campaignName.trim()) {
      campaignError = 'Please enter a campaign name';
      return;
    }
    if (campaignPlatforms.length === 0) {
      campaignError = 'Select at least one platform';
      return;
    }
    campaignError = null;
    campaignPromise = apiCall<CampaignResult>('/campaign', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        name: campaignName.trim(),
        objective: campaignObjective,
        budget: campaignBudget,
        platforms: campaignPlatforms,
      }),
    });
  }

  function runSignals() {
    signalError = null;
    signalPromise = apiCall<SignalResult>('/signals', {
      method: 'POST',
      body: JSON.stringify({ sources: signalSources, query: signalQuery.trim() }),
    });
  }

  function runPerformance() {
    performanceError = null;
    const qs = performanceCampaignId.trim() ? `?campaign_id=${encodeURIComponent(performanceCampaignId.trim())}` : '';
    performancePromise = apiCall<PerformanceResult>(`/performance${qs}`);
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────

  const tabs = [
    { id: 'analyze' as const, label: 'Competitor Analysis', icon: '🎯' },
    { id: 'creatives' as const, label: 'Creative Generator', icon: '🎨' },
    { id: 'campaign' as const, label: 'Campaign Builder', icon: '📈' },
    { id: 'signals' as const, label: 'Signal Feed', icon: '📡' },
    { id: 'performance' as const, label: 'Performance', icon: '📊' },
  ];

  function severityColor(sev: string): string {
    switch (sev) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  }

  function signalTypeColor(t: string): string {
    switch (t) {
      case 'opportunity': return '#22c55e';
      case 'threat': return '#ef4444';
      case 'trend': return '#3b82f6';
      case 'anomaly': return '#f59e0b';
      default: return '#64748b';
    }
  }

  function confidenceColor(c: number): string {
    if (c >= 0.8) return '#22c55e';
    if (c >= 0.5) return '#f59e0b';
    return '#ef4444';
  }

  function confidenceBar(c: number): string {
    return `width: ${Math.round(c * 100)}%; background: ${confidenceColor(c)};`;
  }

  function formatCurrency(v: number): string {
    return v < 1000 ? `$${v.toFixed(2)}` : `$${(v / 1000).toFixed(1)}K`;
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }

  function togglePlatform(p: string) {
    campaignPlatforms = campaignPlatforms.includes(p)
      ? campaignPlatforms.filter((x) => x !== p)
      : [...campaignPlatforms, p];
  }

  function toggleSource(s: string) {
    signalSources = signalSources.includes(s)
      ? signalSources.filter((x) => x !== s)
      : [...signalSources, s];
  }

  // Load signals and performance on first tab visit
  function switchTab(tab: typeof activeTab) {
    activeTab = tab;
    if (tab === 'signals' && !signalPromise) runSignals();
    if (tab === 'performance' && !performancePromise) runPerformance();
  }
</script>

<div class="marketing-page">
  <!-- Page header -->
  <header class="page-header">
    <div class="header-left">
      <h1>📊 Marketing Intelligence</h1>
      <span class="subtitle">Competitor analysis, creative generation, and campaign orchestration</span>
    </div>
  </header>

  <!-- Tab bar -->
  <div class="tab-bar">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => switchTab(tab.id)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </div>

  <!-- ─── Tab: Competitor Analysis ─── -->
  {#if activeTab === 'analyze'}
    <section class="panel">
      <div class="panel-card">
        <h2 class="section-title">🎯 Competitor Analysis</h2>
        <p class="section-desc">Analyze a brand's positioning, identify gaps, and map the competitive landscape.</p>

        <div class="form-row">
          <div class="field">
            <label for="analyze-brand">Brand Name</label>
            <input
              id="analyze-brand"
              type="text"
              bind:value={analyzeBrand}
              placeholder="e.g. Notion, Linear, Vercel"
              onkeydown={(e) => e.key === 'Enter' && runAnalyze()}
            />
          </div>
          <div class="field field-narrow">
            <label for="analyze-days">Lookback (days)</label>
            <input id="analyze-days" type="number" min="1" max="90" bind:value={analyzeDays} />
          </div>
          <button class="btn-primary" onclick={runAnalyze}>Analyze</button>
        </div>

        {#if analyzeError}
          <div class="alert alert-error">{analyzeError}</div>
        {/if}

        {#if analyzePromise}
          {#await analyzePromise}
            <div class="loading-grid">
              {#each Array(3) as _, i}
                <div class="skeleton-card" style="animation-delay: {i * 0.1}s">
                  <div class="skeleton-line w60"></div>
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line w80"></div>
                </div>
              {/each}
            </div>
          {:then result}
            <div class="result-section">
              <!-- Summary -->
              <div class="summary-bar">
                <div class="summary-item">
                  <span class="metric-label">Brand</span>
                  <span class="metric-value">{result.brand}</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Share of Voice</span>
                  <span class="metric-value">{result.shareOfVoice.toFixed(1)}%</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Sentiment</span>
                  <span
                    class="metric-value"
                    style="color: {result.sentimentScore >= 0 ? '#22c55e' : '#ef4444'}"
                  >
                    {result.sentimentScore >= 0 ? '+' : ''}{result.sentimentScore.toFixed(2)}
                  </span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Gaps Found</span>
                  <span class="metric-value">{result.gaps.length}</span>
                </div>
              </div>

              <!-- Summary text -->
              {#if result.summary}
                <div class="info-box">
                  <p>{result.summary}</p>
                </div>
              {/if}

              <!-- Gaps -->
              <h3 class="subsection-title">Identified Gaps</h3>
              {#if result.gaps.length === 0}
                <div class="empty-inline">No gaps detected in this period.</div>
              {:else}
                <div class="gap-grid">
                  {#each result.gaps as gap}
                    <div class="gap-card" style="border-left-color: {severityColor(gap.severity)}">
                      <div class="gap-header">
                        <span class="gap-title">{gap.title}</span>
                        <span class="badge" style="background: {severityColor(gap.severity)}22; color: {severityColor(gap.severity)}">
                          {gap.severity}
                        </span>
                      </div>
                      <p class="gap-desc">{gap.description}</p>
                      <div class="confidence-row">
                        <span class="confidence-label">Confidence</span>
                        <div class="confidence-track">
                          <div class="confidence-fill" style={confidenceBar(gap.confidence)}></div>
                        </div>
                        <span class="confidence-pct">{Math.round(gap.confidence * 100)}%</span>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Positioning map -->
              {#if result.positioning.length > 0}
                <h3 class="subsection-title">Positioning Map</h3>
                <div class="positioning-map">
                  <div class="axis-label axis-y-top">Premium</div>
                  <div class="axis-label axis-y-bottom">Budget</div>
                  <div class="axis-label axis-x-left">Niche</div>
                  <div class="axis-label axis-x-right">Mainstream</div>
                  {#each result.positioning as pos}
                    <div
                      class="position-dot"
                      style="left: {pos.x}%; bottom: {pos.y}%"
                      title={pos.brand}
                    >
                      <span class="position-label">{pos.brand}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {:catch err}
            <div class="alert alert-error">
              Failed to analyze: {err.message}
              <button class="btn-retry" onclick={runAnalyze}>Retry</button>
            </div>
          {/await}
        {/if}
      </div>
    </section>
  {/if}

  <!-- ─── Tab: Creative Generator ─── -->
  {#if activeTab === 'creatives'}
    <section class="panel">
      <div class="panel-card">
        <h2 class="section-title">🎨 Creative Generator</h2>
        <p class="section-desc">Generate ad copy variants targeting a competitor's blind spots.</p>

        <div class="form-row">
          <div class="field">
            <label for="creative-competitor">Competitor</label>
            <input
              id="creative-competitor"
              type="text"
              bind:value={creativeCompetitor}
              placeholder="e.g. Mailchimp, Salesforce"
              onkeydown={(e) => e.key === 'Enter' && runCreatives()}
            />
          </div>
          <div class="field field-narrow">
            <label for="creative-count">Count</label>
            <input id="creative-count" type="number" min="1" max="20" bind:value={creativeCount} />
          </div>
          <button class="btn-primary" onclick={runCreatives}>Generate</button>
        </div>

        {#if creativeError}
          <div class="alert alert-error">{creativeError}</div>
        {/if}

        {#if creativePromise}
          {#await creativePromise}
            <div class="creative-grid">
              {#each Array(creativeCount > 6 ? 6 : creativeCount) as _, i}
                <div class="skeleton-card" style="animation-delay: {i * 0.08}s">
                  <div class="skeleton-line w60"></div>
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line w80"></div>
                  <div class="skeleton-line w40"></div>
                </div>
              {/each}
            </div>
          {:then result}
            <div class="result-section">
              <div class="result-meta">
                Generated {result.creatives.length} variants for <strong>{result.competitor}</strong>
                <span class="result-time">· {relativeTime(result.generatedAt)}</span>
              </div>
              <div class="creative-grid">
                {#each result.creatives as creative}
                  <div class="creative-card">
                    <div class="creative-headline">{creative.headline}</div>
                    <p class="creative-body">{creative.body}</p>
                    <div class="creative-cta">
                      <span class="cta-text">{creative.cta}</span>
                    </div>
                    <div class="creative-footer">
                      <span class="tag tag-platform">{creative.platform}</span>
                      <span class="tag tag-trigger">🎯 {creative.emotionalTrigger}</span>
                    </div>
                    <div class="confidence-row">
                      <span class="confidence-label">Confidence</span>
                      <div class="confidence-track">
                        <div class="confidence-fill" style={confidenceBar(creative.confidence)}></div>
                      </div>
                      <span class="confidence-pct">{Math.round(creative.confidence * 100)}%</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {:catch err}
            <div class="alert alert-error">
              Failed to generate creatives: {err.message}
              <button class="btn-retry" onclick={runCreatives}>Retry</button>
            </div>
          {/await}
        {/if}
      </div>
    </section>
  {/if}

  <!-- ─── Tab: Campaign Builder ─── -->
  {#if activeTab === 'campaign'}
    <section class="panel">
      <div class="panel-card">
        <h2 class="section-title">📈 Campaign Builder</h2>
        <p class="section-desc">Define campaign parameters and get AI-optimized budget allocations.</p>

        <div class="form-grid">
          <div class="field">
            <label for="campaign-name">Campaign Name</label>
            <input
              id="campaign-name"
              type="text"
              bind:value={campaignName}
              placeholder="Q3 Product Launch"
            />
          </div>
          <div class="field">
            <label for="campaign-objective">Objective</label>
            <select id="campaign-objective" bind:value={campaignObjective}>
              <option value="awareness">Awareness</option>
              <option value="consideration">Consideration</option>
              <option value="conversion">Conversion</option>
              <option value="retention">Retention</option>
            </select>
          </div>
          <div class="field">
            <label for="campaign-budget">Budget ($)</label>
            <input id="campaign-budget" type="number" min="100" step="500" bind:value={campaignBudget} />
          </div>
        </div>

        <div class="field">
          <label>Platforms</label>
          <div class="chip-group">
            {#each ['google', 'meta', 'linkedin', 'tiktok', 'x', 'youtube'] as p}
              <button
                class="chip"
                class:selected={campaignPlatforms.includes(p)}
                onclick={() => togglePlatform(p)}
              >
                {p}
              </button>
            {/each}
          </div>
        </div>

        <button class="btn-primary" onclick={runCampaign}>Build Campaign</button>

        {#if campaignError}
          <div class="alert alert-error">{campaignError}</div>
        {/if}

        {#if campaignPromise}
          {#await campaignPromise}
            <div class="loading-block">
              <div class="spinner"></div>
              <span>Optimizing budget allocation across {campaignPlatforms.length} platforms...</span>
            </div>
          {:then result}
            <div class="result-section">
              <!-- Campaign summary -->
              <div class="summary-bar">
                <div class="summary-item">
                  <span class="metric-label">Campaign</span>
                  <span class="metric-value">{result.campaign.name}</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Objective</span>
                  <span class="metric-value">{result.campaign.objective}</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Budget</span>
                  <span class="metric-value">{formatCurrency(result.campaign.budget)}</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Status</span>
                  <span class="status-pill">{result.campaign.status}</span>
                </div>
              </div>

              {#if result.campaign.summary}
                <div class="info-box"><p>{result.campaign.summary}</p></div>
              {/if}

              <!-- Allocations -->
              <h3 class="subsection-title">Budget Allocations</h3>
              <div class="allocation-list">
                {#each result.allocations as alloc}
                  <div class="allocation-row">
                    <div class="alloc-platform">
                      <span class="alloc-icon">▸</span>
                      {alloc.platform}
                    </div>
                    <div class="alloc-bar-wrap">
                      <div class="alloc-bar" style="width: {alloc.budgetShare}%"></div>
                    </div>
                    <div class="alloc-share">{alloc.budgetShare.toFixed(0)}%</div>
                    <div class="alloc-reach">{alloc.expectedReach.toLocaleString()} reach</div>
                  </div>
                {/each}
              </div>
            </div>
          {:catch err}
            <div class="alert alert-error">
              Failed to build campaign: {err.message}
              <button class="btn-retry" onclick={runCampaign}>Retry</button>
            </div>
          {/await}
        {/if}
      </div>
    </section>
  {/if}

  <!-- ─── Tab: Signal Feed ─── -->
  {#if activeTab === 'signals'}
    <section class="panel">
      <div class="panel-card">
        <h2 class="section-title">📡 Signal Feed</h2>
        <p class="section-desc">Real-time market signals from across the web.</p>

        <div class="form-row">
          <div class="field flex-1">
            <label for="signal-query">Query (optional)</label>
            <input
              id="signal-query"
              type="text"
              bind:value={signalQuery}
              placeholder="e.g. AI coding tools, dev productivity"
              onkeydown={(e) => e.key === 'Enter' && runSignals()}
            />
          </div>
        </div>

        <div class="field">
          <label>Sources</label>
          <div class="chip-group">
            {#each ['reddit', 'news', 'social', 'reviews', 'forums'] as s}
              <button
                class="chip"
                class:selected={signalSources.includes(s)}
                onclick={() => toggleSource(s)}
              >
                {s}
              </button>
            {/each}
          </div>
        </div>

        <button class="btn-primary" onclick={runSignals}>Fetch Signals</button>

        {#if signalError}
          <div class="alert alert-error">{signalError}</div>
        {/if}

        {#if signalPromise}
          {#await signalPromise}
            <div class="signal-feed">
              {#each Array(4) as _, i}
                <div class="skeleton-card skeleton-wide" style="animation-delay: {i * 0.1}s">
                  <div class="skeleton-line w30"></div>
                  <div class="skeleton-line w60"></div>
                  <div class="skeleton-line"></div>
                </div>
              {/each}
            </div>
          {:then result}
            <div class="result-section">
              <div class="result-meta">
                {result.totalFound} signals found
                <span class="result-time">· fetched {relativeTime(result.fetchedAt)}</span>
              </div>
              <div class="signal-feed">
                {#each result.signals as sig}
                  <div class="signal-card">
                    <div class="signal-header">
                      <span
                        class="signal-type-dot"
                        style="background: {signalTypeColor(sig.signalType)}"
                      ></span>
                      <span class="signal-type-label" style="color: {signalTypeColor(sig.signalType)}">
                        {sig.signalType}
                      </span>
                      <span class="signal-source">{sig.source}</span>
                      <span class="signal-time">{relativeTime(sig.timestamp)}</span>
                    </div>
                    <div class="signal-title">{sig.title}</div>
                    <p class="signal-desc">{sig.description}</p>
                    <div class="confidence-row">
                      <span class="confidence-label">Confidence</span>
                      <div class="confidence-track">
                        <div class="confidence-fill" style={confidenceBar(sig.confidence)}></div>
                      </div>
                      <span class="confidence-pct">{Math.round(sig.confidence * 100)}%</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {:catch err}
            <div class="alert alert-error">
              Failed to fetch signals: {err.message}
              <button class="btn-retry" onclick={runSignals}>Retry</button>
            </div>
          {/await}
        {/if}
      </div>
    </section>
  {/if}

  <!-- ─── Tab: Performance ─── -->
  {#if activeTab === 'performance'}
    <section class="panel">
      <div class="panel-card">
        <h2 class="section-title">📊 Performance & Attribution</h2>
        <p class="section-desc">Multi-touch attribution across campaigns and channels.</p>

        <div class="form-row">
          <div class="field flex-1">
            <label for="perf-campaign">Campaign ID (optional — leave blank for latest)</label>
            <input
              id="perf-campaign"
              type="text"
              bind:value={performanceCampaignId}
              placeholder="campaign UUID"
              onkeydown={(e) => e.key === 'Enter' && runPerformance()}
            />
          </div>
          <button class="btn-primary" onclick={runPerformance}>Load Performance</button>
        </div>

        {#if performanceError}
          <div class="alert alert-error">{performanceError}</div>
        {/if}

        {#if performancePromise}
          {#await performancePromise}
            <div class="loading-block">
              <div class="spinner"></div>
              <span>Aggregating attribution data...</span>
            </div>
          {:then result}
            <div class="result-section">
              <!-- KPI row -->
              <div class="summary-bar">
                <div class="summary-item">
                  <span class="metric-label">Campaign</span>
                  <span class="metric-value">{result.campaignName}</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Total Spend</span>
                  <span class="metric-value">{formatCurrency(result.totalSpend)}</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">Total Revenue</span>
                  <span class="metric-value" style="color: #22c55e">{formatCurrency(result.totalRevenue)}</span>
                </div>
                <div class="summary-item">
                  <span class="metric-label">ROAS</span>
                  <span
                    class="metric-value"
                    style="color: {result.overallRoas >= 1 ? '#22c55e' : '#ef4444'}"
                  >
                    {result.overallRoas.toFixed(2)}x
                  </span>
                </div>
              </div>

              <!-- Trend chart -->
              {#if result.trend.length > 0}
                <h3 class="subsection-title">Spend vs Revenue Trend</h3>
                <div class="trend-chart">
                  {#each result.trend as point}
                    {@const maxVal = Math.max(...result.trend.flatMap((p) => [p.spend, p.revenue]), 1)}
                    <div class="trend-bars">
                      <div
                        class="bar bar-spend"
                        style="height: {(point.spend / maxVal) * 100}%"
                        title="Spend: {formatCurrency(point.spend)}"
                      ></div>
                      <div
                        class="bar bar-revenue"
                        style="height: {(point.revenue / maxVal) * 100}%"
                        title="Revenue: {formatCurrency(point.revenue)}"
                      ></div>
                    </div>
                  {/each}
                </div>
                <div class="legend">
                  <span class="legend-item"><span class="legend-dot spend"></span> Spend</span>
                  <span class="legend-item"><span class="legend-dot revenue"></span> Revenue</span>
                </div>
              {/if}

              <!-- Channel table -->
              <h3 class="subsection-title">Channel Attribution</h3>
              <div class="channel-table">
                <div class="channel-header-row">
                  <span>Channel</span>
                  <span>Clicks</span>
                  <span>Conversions</span>
                  <span>Cost</span>
                  <span>Revenue</span>
                  <span>ROAS</span>
                </div>
                {#each result.channels as ch}
                  <div class="channel-row">
                    <span class="channel-name">{ch.channel}</span>
                    <span>{ch.clicks.toLocaleString()}</span>
                    <span>{ch.conversions.toLocaleString()}</span>
                    <span>{formatCurrency(ch.cost)}</span>
                    <span style="color: #22c55e">{formatCurrency(ch.revenue)}</span>
                    <span
                      class="roas-cell"
                      style="color: {ch.roas >= 1 ? '#22c55e' : '#ef4444'}"
                    >
                      {ch.roas.toFixed(2)}x
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {:catch err}
            <div class="alert alert-error">
              Failed to load performance: {err.message}
              <button class="btn-retry" onclick={runPerformance}>Retry</button>
            </div>
          {/await}
        {/if}
      </div>
    </section>
  {/if}
</div>

<style>
  /* ─── Page layout ──────────────────────────────────────────────────────── */
  .marketing-page {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    color: #e2e8f0;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .header-left h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .subtitle {
    font-size: 0.8125rem;
    color: #64748b;
  }

  /* ─── Tabs ─────────────────────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid #1e293b;
    overflow-x: auto;
    padding-bottom: 1px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.625rem 0.875rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #64748b;
    cursor: pointer;
    font-size: 0.8125rem;
    font-family: inherit;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab:hover {
    color: #94a3b8;
  }

  .tab.active {
    color: #e2e8f0;
    border-bottom-color: #3b82f6;
  }

  .tab-icon {
    font-size: 0.875rem;
  }

  /* ─── Panels ───────────────────────────────────────────────────────────── */
  .panel {
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .panel-card {
    background: #1e1e2e;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
  }

  .section-desc {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0 0 1.25rem;
  }

  /* ─── Forms ────────────────────────────────────────────────────────────── */
  .form-row {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }

  .field.flex-1 {
    flex: 1 1 200px;
  }

  .field-narrow {
    max-width: 100px;
  }

  .field label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
  }

  .field input,
  .field select {
    background: #0f1419;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.5rem 0.625rem;
    color: #e2e8f0;
    font-size: 0.8125rem;
    font-family: inherit;
    transition: border-color 0.15s;
    outline: none;
  }

  .field input:focus,
  .field select:focus {
    border-color: #3b82f6;
  }

  .field input::placeholder {
    color: #475569;
  }

  /* ─── Buttons ──────────────────────────────────────────────────────────── */
  .btn-primary {
    padding: 0.5rem 1.125rem;
    background: #3b82f6;
    border: none;
    border-radius: 6px;
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
    height: 34px;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-primary:active {
    transform: scale(0.97);
  }

  .btn-retry {
    margin-left: 0.75rem;
    padding: 0.2rem 0.625rem;
    background: transparent;
    border: 1px solid #ef4444;
    border-radius: 4px;
    color: #ef4444;
    font-size: 0.75rem;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-retry:hover {
    background: #ef444422;
  }

  /* ─── Chips ────────────────────────────────────────────────────────────── */
  .chip-group {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .chip {
    padding: 0.3rem 0.625rem;
    background: #0f1419;
    border: 1px solid #1e293b;
    border-radius: 999px;
    color: #64748b;
    font-size: 0.75rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    text-transform: capitalize;
  }

  .chip:hover {
    border-color: #334155;
    color: #94a3b8;
  }

  .chip.selected {
    background: #3b82f622;
    border-color: #3b82f6;
    color: #93c5fd;
  }

  /* ─── Alerts ───────────────────────────────────────────────────────────── */
  .alert {
    padding: 0.625rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    margin: 0.75rem 0;
  }

  .alert-error {
    background: #ef444422;
    border: 1px solid #ef444444;
    color: #fca5a5;
  }

  /* ─── Loading / Skeletons ──────────────────────────────────────────────── */
  .loading-block {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    justify-content: center;
    color: #64748b;
    font-size: 0.8125rem;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #1e293b;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .skeleton-card {
    background: #1e293b;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #1e293b;
  }

  .skeleton-wide {
    width: 100%;
  }

  .skeleton-line {
    height: 10px;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    background: linear-gradient(90deg, #1e293b 25%, #2d3a4e 50%, #1e293b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  .skeleton-line:last-child {
    margin-bottom: 0;
  }

  .skeleton-line.w30 { width: 30%; }
  .skeleton-line.w40 { width: 40%; }
  .skeleton-line.w60 { width: 60%; }
  .skeleton-line.w80 { width: 80%; }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ─── Result sections ──────────────────────────────────────────────────── */
  .result-section {
    margin-top: 1.25rem;
  }

  .result-meta {
    font-size: 0.8125rem;
    color: #64748b;
    margin-bottom: 0.75rem;
  }

  .result-time {
    color: #475569;
  }

  .info-box {
    background: #3b82f60d;
    border: 1px solid #3b82f633;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin: 0.75rem 0;
  }

  .info-box p {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: #cbd5e1;
  }

  .subsection-title {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #94a3b8;
    margin: 1.25rem 0 0.75rem;
  }

  .empty-inline {
    font-size: 0.8125rem;
    color: #475569;
    padding: 1rem;
    text-align: center;
  }

  /* ─── Summary bar ──────────────────────────────────────────────────────── */
  .summary-bar {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    background: #0f1419;
    border: 1px solid #1e293b;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .metric-label {
    font-size: 0.625rem;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.04em;
  }

  .metric-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .status-pill {
    font-size: 0.6875rem;
    text-transform: uppercase;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    background: #3d3d4d;
    color: #94a3b8;
  }

  /* ─── Gap cards ────────────────────────────────────────────────────────── */
  .gap-grid,
  .loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }

  .gap-card {
    background: #0f1419;
    border: 1px solid #1e293b;
    border-left-width: 3px;
    border-radius: 8px;
    padding: 0.875rem;
  }

  .gap-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .gap-title {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .badge {
    font-size: 0.625rem;
    text-transform: uppercase;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
  }

  .gap-desc {
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.45;
    margin-bottom: 0.75rem;
  }

  /* ─── Confidence bar ───────────────────────────────────────────────────── */
  .confidence-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .confidence-label {
    font-size: 0.625rem;
    color: #475569;
    text-transform: uppercase;
    min-width: 52px;
  }

  .confidence-track {
    flex: 1;
    height: 4px;
    background: #1e293b;
    border-radius: 2px;
    overflow: hidden;
  }

  .confidence-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  .confidence-pct {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    font-weight: 600;
    min-width: 32px;
    text-align: right;
  }

  /* ─── Positioning map ──────────────────────────────────────────────────── */
  .positioning-map {
    position: relative;
    width: 100%;
    height: 320px;
    background: #0f1419;
    border: 1px solid #1e293b;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .axis-label {
    position: absolute;
    font-size: 0.625rem;
    color: #475569;
    text-transform: uppercase;
  }

  .axis-y-top { top: 0.5rem; left: 0.5rem; }
  .axis-y-bottom { bottom: 0.5rem; left: 0.5rem; }
  .axis-x-left { bottom: 0.5rem; left: 50%; transform: translateX(-50%); }
  .axis-x-right { top: 0.5rem; right: 0.5rem; }

  .position-dot {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #3b82f6;
    transform: translate(-50%, 50%);
    cursor: pointer;
    transition: transform 0.15s;
  }

  .position-dot:hover {
    transform: translate(-50%, 50%) scale(1.4);
  }

  .position-label {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.625rem;
    color: #94a3b8;
    white-space: nowrap;
    background: #1e1e2e;
    padding: 0.0625rem 0.3rem;
    border-radius: 3px;
    border: 1px solid #1e293b;
  }

  /* ─── Creative grid ────────────────────────────────────────────────────── */
  .creative-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.75rem;
  }

  .creative-card {
    background: #0f1419;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: border-color 0.15s;
  }

  .creative-card:hover {
    border-color: #334155;
  }

  .creative-headline {
    font-size: 0.9375rem;
    font-weight: 700;
    line-height: 1.3;
    color: #e2e8f0;
  }

  .creative-body {
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.5;
    flex: 1;
  }

  .creative-cta {
    padding: 0.375rem 0.625rem;
    background: #3b82f622;
    border-radius: 6px;
    display: inline-block;
    align-self: flex-start;
  }

  .cta-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: #93c5fd;
  }

  .creative-footer {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .tag {
    font-size: 0.625rem;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .tag-platform {
    background: #1e293b;
    color: #94a3b8;
  }

  .tag-trigger {
    background: #8b5cf622;
    color: #c4b5fd;
  }

  /* ─── Allocations ──────────────────────────────────────────────────────── */
  .allocation-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .allocation-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .alloc-platform {
    width: 100px;
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: capitalize;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .alloc-icon {
    color: #3b82f6;
  }

  .alloc-bar-wrap {
    flex: 1;
    height: 8px;
    background: #1e293b;
    border-radius: 4px;
    overflow: hidden;
  }

  .alloc-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #6366f1);
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  .alloc-share {
    width: 40px;
    text-align: right;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: #93c5fd;
  }

  .alloc-reach {
    width: 120px;
    text-align: right;
    font-size: 0.6875rem;
    color: #64748b;
  }

  /* ─── Signal feed ──────────────────────────────────────────────────────── */
  .signal-feed {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .signal-card {
    background: #0f1419;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 0.875rem;
  }

  .signal-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .signal-type-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .signal-type-label {
    font-size: 0.625rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  .signal-source {
    font-size: 0.6875rem;
    color: #64748b;
    text-transform: capitalize;
  }

  .signal-time {
    margin-left: auto;
    font-size: 0.6875rem;
    color: #475569;
  }

  .signal-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .signal-desc {
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.45;
    margin-bottom: 0.625rem;
  }

  /* ─── Trend chart ──────────────────────────────────────────────────────── */
  .trend-chart {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 140px;
    padding: 0.5rem;
    background: #0f1419;
    border: 1px solid #1e293b;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .trend-bars {
    flex: 1;
    display: flex;
    gap: 2px;
    align-items: flex-end;
    height: 100%;
  }

  .bar {
    flex: 1;
    min-width: 2px;
    border-radius: 2px 2px 0 0;
    transition: height 0.3s ease;
  }

  .bar-spend {
    background: #f59e0b;
  }

  .bar-revenue {
    background: #22c55e;
  }

  .legend {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.6875rem;
    color: #64748b;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  .legend-dot.spend { background: #f59e0b; }
  .legend-dot.revenue { background: #22c55e; }

  /* ─── Channel table ────────────────────────────────────────────────────── */
  .channel-table {
    border: 1px solid #1e293b;
    border-radius: 8px;
    overflow: hidden;
  }

  .channel-header-row,
  .channel-row {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr 1fr 0.8fr 0.8fr 0.8fr;
    padding: 0.625rem 0.875rem;
    align-items: center;
  }

  .channel-header-row {
    background: #0f1419;
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    border-bottom: 1px solid #1e293b;
  }

  .channel-row {
    font-size: 0.75rem;
    font-family: 'JetBrains Mono', monospace;
    border-bottom: 1px solid #1e293b;
  }

  .channel-row:last-child {
    border-bottom: none;
  }

  .channel-name {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    text-transform: capitalize;
  }

  .roas-cell {
    font-weight: 700;
  }

  /* ─── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .marketing-page {
      padding: 1rem;
    }

    .tab-label {
      display: none;
    }

    .tab {
      padding: 0.5rem 0.625rem;
    }

    .tab-icon {
      font-size: 1rem;
    }

    .form-row {
      flex-direction: column;
      align-items: stretch;
    }

    .form-row > .btn-primary {
      width: 100%;
    }

    .field-narrow {
      max-width: none;
    }

    .allocation-row {
      flex-wrap: wrap;
    }

    .alloc-reach {
      width: auto;
    }

    .channel-header-row,
    .channel-row {
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem;
    }
  }
</style>
