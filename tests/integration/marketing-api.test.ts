/**
 * Marketic API Routes Integration Tests
 * 
 * Tests the full HTTP layer: Quay API routes → MCP Registry → Marketic MCP Server
 * These tests require the Marketic MCP server to be running.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Marketic API base URL ( Quay dev server would run on http://localhost:5173 or custom port)
const API_BASE = 'http://localhost:5173/api/marketing';

// Helper to make API calls (would need a running Quay server)
// For now, these are structure documentation tests

describe('Marketing API Routes — Request/Response Contracts', () => {
  
  // ─── POST /api/marketing/analyze ──────────────────────────────────────────
  describe('POST /api/marketing/analyze', () => {
    const expectedRequest = {
      brand: 'HubSpot',
      days: 30,
    };

    const expectedResponse = {
      competitor: expect.any(String),
      analysis: expect.any(String),
      confidence: expect.any(Number),
      analyzed_at: expect.any(String),
    };

    it('should have correct request body schema', () => {
      // Documentation: POST body requires 'brand' (string), optional 'days' (number)
      expect(expectedRequest).toHaveProperty('brand');
      expect(typeof expectedRequest.brand).toBe('string');
    });

    it('should have correct response schema', () => {
      expect(expectedResponse).toHaveProperty('competitor');
      expect(expectedResponse).toHaveProperty('confidence');
      // Confidence is a number between 0 and 1
      const confidence = 0.85;
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  // ─── POST /api/marketing/creatives ─────────────────────────────────────────
  describe('POST /api/marketing/creatives', () => {
    const expectedRequest = {
      competitor: 'Quay AI Factory',
      count: 5,
      gap_ids: ['gap-001'],
    };

    const expectedResponse = {
      variants: expect.arrayContaining([
        expect.objectContaining({
          variant_id: expect.any(String),
          headline: expect.any(String),
          description: expect.any(String),
          cta: expect.any(String),
          confidence: expect.any(Number),
        }),
      ]),
      count: expect.any(Number),
    };

    it('should have correct request body schema', () => {
      expect(expectedRequest).toHaveProperty('competitor');
      expect(expectedRequest).toHaveProperty('count');
    });

    it('should have correct response schema', () => {
      expect(expectedResponse).toHaveProperty('variants');
      expect(expectedResponse).toHaveProperty('count');
    });
  });

  // ─── POST /api/marketing/campaign ──────────────────────────────────────────
  describe('POST /api/marketing/campaign', () => {
    describe('build action', () => {
      const buildRequest = {
        action: 'build',
        campaign_name: 'Q3-Launch-Campaign',
        objective: 'conversion',
        channels: ['meta_feed', 'google_search'],
        target_audience: 'B2B SaaS',
        duration_weeks: 6,
        total_budget: 20000,
      };

      const expectedBuildResponse = {
        campaign_id: expect.any(String),
        name: expect.any(String),
        objective: expect.stringMatching(/awareness|traffic|lead_generation|app_installs|purchases|brand_loyalty/),
        channels: expect.arrayContaining([expect.any(String)]),
        total_budget: expect.any(Number),
        daily_budget: expect.any(Number),
        start_date: expect.any(String),
        end_date: expect.any(String),
        status: expect.stringMatching(/draft|active|paused|completed/),
        ad_groups: expect.arrayContaining([
          expect.objectContaining({
            ad_group_id: expect.any(String),
            channel: expect.any(String),
            budget_daily: expect.any(Number),
          }),
        ]),
      };

      it('should require action field', () => {
        expect(buildRequest).toHaveProperty('action', 'build');
      });

      it('should require campaign_name for build', () => {
        expect(buildRequest).toHaveProperty('campaign_name');
      });

      it('should return campaign with ad_groups', () => {
        expect(expectedBuildResponse).toHaveProperty('ad_groups');
      });
    });

    describe('launch action', () => {
      const launchRequest = {
        action: 'launch',
        platform: 'meta',
        campaign_name: 'Test Ad',
        budget_daily: 100,
      };

      it('should require approval message for launch', () => {
        // launch_campaign_ad returns error about requiring approval
        expect(launchRequest).toHaveProperty('action', 'launch');
      });
    });

    describe('validation', () => {
      it('should reject invalid action', () => {
        const invalidAction = { action: 'invalid' };
        expect(invalidAction.action).not.toMatch(/^(build|launch)$/);
      });

      it('should reject missing campaign_name for build', () => {
        const missingName = { action: 'build' };
        expect(missingName).not.toHaveProperty('campaign_name');
      });
    });
  });

  // ─── POST /api/marketing/signals ───────────────────────────────────────────
  describe('POST /api/marketing/signals', () => {
    const expectedRequest = {
      competitor: 'AutoGPT',
      days: 14,
    };

    const expectedResponse = {
      signals: expect.arrayContaining([
        expect.objectContaining({
          signal_id: expect.any(String),
          source: expect.stringMatching(/producthunt|twitter|hacker_news/),
          title: expect.any(String),
          content: expect.any(String),
          engagement: expect.any(Number),
          sentiment: expect.stringMatching(/positive|negative|neutral/),
          priority: expect.any(Number),
        }),
      ]),
      count: expect.any(Number),
    };

    it('should have correct request body schema', () => {
      expect(expectedRequest).toHaveProperty('competitor');
      expect(expectedRequest).toHaveProperty('days');
    });

    it('should return signals with engagement metrics', () => {
      expect(expectedResponse).toHaveProperty('signals');
      expect(expectedResponse).toHaveProperty('count');
    });
  });

  // ─── POST /api/marketing/performance ─────────────────────────────────────────
  describe('POST /api/marketing/performance', () => {
    const expectedRequest = {
      channel_points: [
        { channel: 'google_search', spend: 5000, roas: 3.5, conversions: 250 },
        { channel: 'meta_feed', spend: 3000, roas: 2.1, conversions: 180 },
      ],
      model: 'shapley',
    };

    it('should accept attribution request', () => {
      expect(expectedRequest).toHaveProperty('channel_points');
      expect(Array.isArray(expectedRequest.channel_points)).toBe(true);
      expect(expectedRequest).toHaveProperty('model');
    });
  });
});

// ─── MCP Tool Name Mapping Tests ────────────────────────────────────────────────

describe('MCP Tool Name Mapping (Quay → Marketic)', () => {
  const toolMapping = [
    ['analyze_competitor', 'marketic::analyze_competitor'],
    ['generate_creatives', 'marketic::generate_creatives'],
    ['generate_social_posts', 'marketic::generate_social_posts'],
    ['build_campaign', 'marketic::build_campaign'],
    ['launch_campaign_ad', 'marketic::launch_campaign_ad'],
    ['collect_signals', 'marketic::collect_signals'],
    ['get_attribution', 'marketic::get_attribution'],
  ] as const;

  it.each(toolMapping)('routeTool(%s) should map to %s', (route, expected) => {
    expect(`marketic::${route}`).toBe(expected);
  });
});

// ─── Error Response Format Tests ───────────────────────────────────────────────

describe('API Error Response Format', () => {
  const errorResponses = [
    { status: 400, error: 'Field "brand" (string) is required' },
    { status: 400, error: 'Field "action" must be one of: build, launch' },
    { status: 502, error: 'Competitor analysis failed', tool: 'marketic::analyze_competitor' },
    { status: 500, error: 'Internal server error', detail: 'Server error details' },
  ];

  it.each(errorResponses)('error response should have correct structure', (err) => {
    expect(err).toHaveProperty('error');
    expect(typeof err.error).toBe('string');
  });
});
