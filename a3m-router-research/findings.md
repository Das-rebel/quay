# A3M Router Research Findings

## Current State
- A3M Router claims 76.43 accuracy, $0.05/1K cost
- NOT on official RouterArena leaderboard (need to submit predictions)
- 47+ providers, parallel ensemble execution
- Weakness: Single-round routing (unlike Router-R1's multi-round)

## Key Insights from Literature

### 1. Router-R1 (P0 Priority)
**Multi-round RL routing** - most promising extension for A3M
- Think-Route-Aggregate loop: router reasons before routing
- Aggregates responses from multiple models iteratively
- RL-trained with cost + quality reward signal
- A3M's parallel ensemble could extend to this multi-round paradigm

### 2. Training-Free is More Robust
Study (2503.08704): Training-free routers are MORE robust to adversarial attacks
- Validates A3M's heuristic approach
- BUT: less accurate than learned approaches
- Opportunity: Add light learned component without losing robustness

### 3. MCTS for Routing: Open Gap
**No papers found applying MCTS to LLM routing specifically**
- MCTS used for: LLM reasoning, prompt optimization, game playing
- NOT for: model selection/routing decisions
- Opportunity: Apply MCTS-style exploration to router decisions

### 4. Cost-Aware Routing is Solved (Sort of)
CARROT, SeqRoute, cost-aware papers show:
- Cost-accuracy tradeoff is well-studied
- Simple heuristics (Chuzom) can route 87%+ to cheapest
- Opportunity: Combine heuristics with learned refinement

## Potential A3M Improvements

### H1: Multi-Round Router-R1 Style Extension
**Extend parallel ensemble to iterative refinement**
- Round 1: Route to best candidate(s)
- Round 2: Route to complementary model based on Round 1 response
- Aggregate: Combine responses with confidence weighting
- **Prediction**: +3-5% accuracy on complex queries

### H2: MCTS-Inspired Exploration
**Apply MCTS-style look-ahead to routing decisions**
- UCB1-based exploration vs exploitation in model selection
- Simulate "what if I route to model X?" outcomes
- **Prediction**: Better accuracy-cost tradeoff than current scoring

### H3: Light RL Fine-Tuning
**Fine-tune router on routing decisions**
- Use ReCal-style reward calibration
- Train on A3M's existing routing data
- **Prediction**: +2-3% accuracy with minimal compute

## Open Questions
1. Can MCTS-style routing beat RL-based routing?
2. Is multi-round worth the latency increase?
3. How to get A3M officially evaluated on RouterArena?

## Next Steps
1. Submit prediction files to RouterArena (Issue #138)
2. Implement H1: multi-round extension
3. Test H2: MCTS-inspired routing
