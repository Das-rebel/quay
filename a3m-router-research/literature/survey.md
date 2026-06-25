# LLM Routing Research Survey (2024-2026)

## Overview
This survey covers recent research on LLM routing, model selection, MCTS approaches, and RL-based methods for optimizing cost-accuracy tradeoffs in LLM inference. Research was conducted via arXiv searches.

## Total Papers Found: ~33 relevant papers

## Top 5 Most Promising Findings for A3M Router

### 1. ReCal: Reward Calibration for RL-based LLM Routing (2606.12479)
**Why Promising:** Directly addresses RL-based routing training - the core of A3M Router's approach. This paper tackles the fundamental problem that RL-trained routers suffer from reward model noise and distribution shift, leading to suboptimal routing decisions. Their calibration method could significantly improve A3M Router's training pipeline.

**Key Insight:** Reward calibration before training improves router policy quality.

### 2. MTRouter: Cost-Aware Multi-Turn LLM Routing with History-Model Joint Embeddings (2604.23530)
**Why Promising:** Multi-turn routing is critical for WhatsApp/Telegram bot scenarios. This ACL 2026 paper uses history-model joint embeddings to capture both conversation context and model capabilities. It's a peer-reviewed solution to a practical problem A3M Router faces daily.

**Key Insight:** Joint embeddings of conversation history and model capabilities enable better multi-turn routing decisions.

### 3. SeqRoute: Global Budget-Aware Sequential LLM Routing via Offline Reinforcement Learning (2605.25424)
**Why Promising:** Budget optimization across multiple turns is essential for cost control. This paper uses offline RL to learn routing policies that optimize long-term utility under budget constraints, which aligns perfectly with A3M Router's cost-aware design.

**Key Insight:** Offline RL enables budget-aware routing without expensive online interaction.

### 4. The Routing Plateau: Understanding and Breaking the Accuracy Limits of LLM Routers (2606.07587)
**Why Promising:** This paper investigates fundamental accuracy limits of LLM routers. Understanding why routers hit accuracy plateaus is essential for improving A3M Router beyond current SOTA methods.

**Key Insight:** There may be fundamental limits to routing accuracy that require architectural innovations to break.

### 5. CARROT: A Cost Aware Rate Optimal Router (2502.03261)
**Why Promising:** This is the most directly comparable work to A3M Router's goals. It uses a principled approach to balance quality vs. expense and has been updated with recent models like o3-mini. It provides a benchmark for A3M Router to compare against.

**Key Insight:** Cost-aware routing with rigorous theoretical foundations can achieve near-optimal quality-cost tradeoffs.

## Additional Notable Papers

### MCTS/Tree Search Approaches
- **"Revisiting Tree Search for LLMs" (2602.01935):** AlphaZero-style tree search for LLM reasoning enhancement
- **"SCULPT: Constraint-Guided Pruned MCTS" (2601.12355):** MCTS for mathematical reasoning with pruning
- **"Optimizing Prompt Sequences using MCTS" (2507.00310):** MCTS for prompt optimization

### Benchmark Papers
- **"LLMRank" (2510.01234):** Understanding LLM strengths for model routing
- **"Evaluating Small Language Models for Front-Door Routing" (2603.20895):** SLM routing benchmarks
- **"The Routing Plateau" (2606.07587):** Fundamental limits analysis

### Cost-Aware Routing
- **"UniScale" (2605.24930):** Joint model routing and test-time scaling (ICML 2026)
- **"RACER" (2602.19509):** Risk-aware calibrated efficient routing
- **"STREAM" (2606.13968):** Multi-tier inference middleware (local → HPC → cloud)
- **"Brick" (2606.13241):** Spatial capability routing using within-domain variance

### Multi-Turn/Sequential Routing
- **"From Myopic Selection to Long-Horizon Awareness" (2604.12385):** Sequential LLM routing for multi-turn dialogue
- **"SeqRoute" (2605.25424):** Budget-aware sequential routing via offline RL
- **"RelayLLM" (2601.01743):** Collaborative decoding for efficient reasoning

### RL-Based Approaches
- **"ReCal" (2606.12479):** Reward calibration for RL-based routing (TOP PRIORITY)
- **"LLM Routing with Dueling Feedback" (2510.00841):** Dueling feedback for sample-efficient training
- **"PROTEUS" (2601.19402):** SLA-aware routing via Lagrangian RL

### Novel Architectures
- **"CascadeDebate" (2604.02367):** Multi-agent deliberation for cost-aware cascades
- **"Pyramid MoA" (2602.01797):** Probabilistic framework for cost-optimized anytime inference
- **"Experts are all you need" (2511.15015):** Composable LLM inference framework

## Research Gaps & Opportunities

1. **No MCTS-based routing found:** Despite searching for "MCTS LLM model selection", no papers directly apply MCTS to the routing problem. Tree search is used for LLM reasoning (prompt optimization, math), not for model selection.

2. **Sqwish/AgentForge not found:** These RouterArena benchmarks were not found in arXiv. They may be from proprietary benchmarks or company technical reports.

3. **Limited benchmark comparison:** RouterBench and similar comprehensive benchmarks were not found in the search. Papers tend to use proprietary or small-scale evaluations.

4. **Offline RL underutilized:** Most routing approaches use online learning or supervised learning. Offline RL (SeqRoute) is an emerging area with potential.

## Recommendations for A3M Router

1. **Immediate:** Study ReCal's reward calibration method for improving router training
2. **Short-term:** Implement multi-turn routing based on MTRouter/SeqRoute insights
3. **Medium-term:** Explore offline RL approaches for budget-aware routing
4. **Long-term:** Investigate fundamental routing limits from "Routing Plateau" paper

## Search Queries Used
- "LLM routing", "MCTS LLM model selection", "RouteLLM router benchmark"
- "RouterArena LLM routing benchmark", "cost-aware LLM routing inference"
- "LLM model selection reinforcement learning", "routerbench LLM selection benchmark"
- "Sqwish AgentForge LLM router", "SPROUT router LLM cost"
- "sequential LLM routing multi-turn"

## Files in This Directory
Each paper has its own markdown file with details. See individual files for full metadata.
