# Router-R1: Teaching LLMs Multi-Round Routing and Aggregation via Reinforcement Learning

## Paper Details
- **arXiv**: 2506.09033
- **Published**: 2025-06-10
- **Key Finding**: RL-based multi-round LLM routing with "think" and "route" actions

## Key Innovation
1. **Multi-round routing** (not single-shot) - routes to multiple models and aggregates
2. **RL-trained router** using PPO or GRPO-style training
3. **Think-Route-Aggregate** loop - router uses its own reasoning to decide routing
4. **Rule-based reward**: format rewards + outcome rewards + cost reward
5. **Simple model descriptors** (pricing, latency, example performance) enable generalization

## Why This Matters for A3M
- A3M currently does single-shot parallel routing
- Router-R1's multi-round approach could improve accuracy on complex queries
- RL training could learn better routing policies than heuristic scoring

## Potential Extension for A3M
- Extend parallel ensemble to iterative refinement
- Add RL fine-tuning on routing decisions
- Implement cost-aware reward signal

## URL
https://arxiv.org/abs/2506.09033
