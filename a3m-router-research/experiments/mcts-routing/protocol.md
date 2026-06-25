# MCTS-Routing Experiment Protocol

## Hypothesis
MCTS-based provider selection achieves better accuracy-cost tradeoff than A3M's heuristic scoring by:
1. Building an explicit tree of provider selections
2. Using UCB1 for principled exploration-exploitation
3. Discovering non-obvious provider combinations for complex queries

## Prediction
- MCTS with 100 iterations achieves +2-5% accuracy improvement over heuristic scoring
- Cost stays ≤ $0.10/1K (competitive with leaders)
- Multi-round routing discovers better provider combinations for complex queries

## Method
1. Implement MCTS-Router with UCB1 selection
2. Compare against A3M heuristic baseline on benchmark queries
3. Vary: max_depth (1-3), n_iterations (50-200), exploration_constant (1.0-2.0)
4. Measure: accuracy, cost/1K, provider diversity

## Evaluation
- Primary metric: accuracy (quality of selected provider)
- Secondary: cost per query, provider diversity
- Baseline: A3M heuristic scoring (quality_score / (cost_per_1k + 0.01))

## Risks
- MCTS adds latency (mitigate: early stopping at 95% confidence)
- Quality estimation is heuristic (mitigate: use actual API calls in production)
- May not beat well-tuned heuristics on simple queries (expected: MCTS wins on complex)

## Timeline
- Week 1: UCB1 baseline
- Week 2: Full MCTS with rollouts
- Week 3: Real API integration
- Week 4: Benchmark evaluation