"""
MCTS-Routing: Monte Carlo Tree Search for LLM Provider Selection

Core idea: Treat LLM routing as a sequential game where:
- State = query context + selected providers so far
- Actions = choose next provider from pool
- Reward = answer quality - λ*cost
- UCB1 for principled exploration/exploitation
- Rollouts simulate full response generation + quality scoring

Based on:
- UCT (Upper Confidence Bound for Trees) - Kocsis & Szepesvari 2006
- AlphaGo architecture - Silver et al. 2016
- DialRouter - arXiv:2604.12385 (MCTS for LLM routing)
"""

import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Callable
from enum import Enum
import numpy as np


class NodeType(Enum):
    ROOT = "root"
    PROVIDER = "provider"
    RESPONSE = "response"


@dataclass
class Provider:
    id: str
    name: str
    cost_per_1k: float
    quality_score: float  # 0-1 estimated quality
    latency_ms: float
    supports_multimodal: bool = False
    strengths: List[str] = field(default_factory=list)


@dataclass
class Query:
    text: str
    features: Dict[str, float] = field(default_factory=dict)
    # features: {code: 0-1, math: 0-1, creative: 0-1, ...}
    expected_answer_type: str = "general"


@dataclass
class MCTSNode:
    """A node in the MCTS tree."""
    node_type: NodeType
    provider: Optional[Provider] = None
    parent: Optional['MCTSNode'] = None
    children: List['MCTSNode'] = field(default_factory=list)
    visit_count: int = 0
    total_reward: float = 0.0
    depth: int = 0
    cumulative_cost: float = 0.0
    response_quality: float = 0.0  # estimated quality of response at this node
    
    def ucb1(self, exploration_constant: float = 1.414) -> float:
        """UCB1 formula for exploration vs exploitation."""
        if self.visit_count == 0:
            return float('inf')  # unexplored nodes have infinite UCB
        exploitation = self.total_reward / self.visit_count
        exploration = exploration_constant * math.sqrt(
            math.log(self.parent.visit_count) / self.visit_count
        )
        return exploitation + exploration
    
    def avg_reward(self) -> float:
        if self.visit_count == 0:
            return 0.0
        return self.total_reward / self.visit_count


@dataclass
class RolloutResult:
    provider_sequence: List[str]
    total_reward: float
    total_cost: float
    avg_quality: float
    final_quality: float


class QualityEstimator:
    """Estimates response quality for rollouts without calling actual APIs."""
    
    def estimate(self, provider: Provider, query: Query, depth: int = 0) -> float:
        """
        Estimate quality of provider's response to query.
        In production, this would call the actual API.
        For simulation, we use heuristic scoring.
        """
        base_quality = provider.quality_score
        
        # Boost for matching query features to provider strengths
        feature_boost = 0.0
        query_text_lower = query.text.lower()
        
        for strength in provider.strengths:
            if strength in query_text_lower:
                feature_boost += 0.05
        
        # Depth penalty: later rounds get slightly lower quality estimates
        # (simulating that we're less confident)
        depth_penalty = depth * 0.02
        
        # Multimodal boost
        if query.features.get('multimodal', 0) > 0.5 and provider.supports_multimodal:
            feature_boost += 0.1
        
        quality = base_quality + feature_boost - depth_penalty
        return max(0.0, min(1.0, quality))
    
    def estimate_cost(self, provider: Provider, query: Query) -> float:
        """Estimate cost for this provider answering this query."""
        # Rough estimate: ~100 tokens per query, cost per 1K tokens
        token_estimate = 100
        return (token_estimate / 1000) * provider.cost_per_1k


class MCTSRouter:
    """
    Monte Carlo Tree Search Router for LLM selection.
    
    Key differences from A3M's heuristic scoring:
    1. Builds an explicit tree of provider selections
    2. Uses UCB1 for principled exploration
    3. Rollouts estimate cumulative reward
    4. Policy distillation possible from visited paths
    """
    
    def __init__(
        self,
        providers: List[Provider],
        exploration_constant: float = 1.414,
        max_depth: int = 3,
        max_iterations: int = 100,
        cost_lambda: float = 0.01,  # cost penalty per token
        random_seed: int = 42
    ):
        self.providers = providers
        self.exploration_constant = exploration_constant
        self.max_depth = max_depth
        self.max_iterations = max_iterations
        self.cost_lambda = cost_lambda
        self.quality_estimator = QualityEstimator()
        random.seed(random_seed)
        np.random.seed(random_seed)
    
    def ucb_select(self, node: MCTSNode) -> MCTSNode:
        """Select child with highest UCB1 score."""
        if not node.children:
            return node
        return max(node.children, key=lambda c: c.ucb1(self.exploration_constant))
    
    def expand(self, node: MCTSNode, query: Query) -> None:
        """Expand node by adding all unvisited provider children."""
        visited_providers = {c.provider.id for c in node.children}
        
        for provider in self.providers:
            if provider.id in visited_providers:
                continue
            if node.depth >= self.max_depth:
                continue
            
            child = MCTSNode(
                node_type=NodeType.PROVIDER,
                provider=provider,
                parent=node,
                depth=node.depth + 1,
                cumulative_cost=node.cumulative_cost + 
                    self.quality_estimator.estimate_cost(provider, query)
            )
            node.children.append(child)
    
    def rollout(self, node: MCTSNode, query: Query) -> float:
        """
        Simulate a random rollout from this node.
        Returns cumulative reward (quality - lambda*cost).
        """
        current = node
        total_reward = 0.0
        total_cost = 0.0
        depth = node.depth
        
        while depth < self.max_depth:
            # Random provider selection for rollout
            available = [p for p in self.providers 
                        if not any(c.provider.id == p.id for c in current.children)]
            if not available:
                break
            
            provider = random.choice(available)
            quality = self.quality_estimator.estimate(provider, query, depth)
            cost = self.quality_estimator.estimate_cost(provider, query)
            
            # Reward = quality - lambda * cost
            reward = quality - self.cost_lambda * cost
            total_reward += reward
            total_cost += cost
            depth += 1
        
        return total_reward
    
    def backpropagate(self, node: MCTSNode, reward: float) -> None:
        """Update visit count and total reward up the tree."""
        current = node
        while current is not None:
            current.visit_count += 1
            current.total_reward += reward
            current = current.parent
    
    def search(self, query: Query) -> RolloutResult:
        """
        Run MCTS search for the given query.
        Returns the best provider sequence found.
        """
        # Create root node
        root = MCTSNode(
            node_type=NodeType.ROOT,
            depth=0
        )
        
        for iteration in range(self.max_iterations):
            # Selection: traverse tree choosing highest UCB1
            node = root
            while node.children:
                node = self.ucb_select(node)
            
            # Expansion: add unvisited providers
            self.expand(node, query)
            
            # Rollout: simulate from current node
            if node.children:
                # Pick a random child to rollout from
                rollout_node = random.choice(node.children)
            else:
                rollout_node = node
            
            reward = self.rollout(rollout_node, query)
            
            # Backpropagation: update statistics
            self.backpropagate(rollout_node, reward)
        
        # Extract best path: follow highest avg_reward children
        path = []
        current = root
        while current.children and current.depth < self.max_depth:
            best_child = max(current.children, key=lambda c: c.avg_reward())
            if best_child.provider:
                path.append(best_child.provider.id)
            current = best_child
        
        # Get final quality estimate
        final_quality = root.avg_reward()
        
        return RolloutResult(
            provider_sequence=path,
            total_reward=root.total_reward,
            total_cost=root.cumulative_cost,
            avg_quality=root.avg_reward(),
            final_quality=final_quality
        )
    
    def get_best_provider(self, query: Query) -> Provider:
        """Get the single best provider for this query."""
        result = self.search(query)
        if not result.provider_sequence:
            # Fallback to highest quality provider
            return max(self.providers, key=lambda p: p.quality_score)
        provider_id = result.provider_sequence[0]
        return next(p for p in self.providers if p.id == provider_id)


def extract_query_features(query_text: str) -> Dict[str, float]:
    """
    Extract features from query text.
    Matches A3M's feature extraction approach.
    """
    lower = query_text.lower()
    features = {}
    
    # Domain detection
    features['code'] = sum(1 for kw in ['code', 'function', 'class', 'debug', 'api', 'python', 'javascript'] if kw in lower) / 3
    features['math'] = sum(1 for kw in ['math', 'equation', 'calculate', 'solve', 'algebra', 'calculus'] if kw in lower) / 3
    features['creative'] = sum(1 for kw in ['write', 'story', 'creative', 'poem', 'song', 'narrative'] if kw in lower) / 3
    features['legal'] = sum(1 for kw in ['legal', 'law', 'contract', 'liability', 'court'] if kw in lower) / 3
    features['medical'] = sum(1 for kw in ['medical', 'clinical', 'diagnosis', 'treatment', 'drug'] if kw in lower) / 3
    features['finance'] = sum(1 for kw in ['financial', 'investment', 'portfolio', 'valuation'] if kw in lower) / 3
    features['multimodal'] = 0.0  # Would need image input detection
    
    return features


def create_sample_providers() -> List[Provider]:
    """Create sample providers for testing."""
    return [
        Provider(id="openai/gpt-4o", name="GPT-4o", cost_per_1k=2.5, quality_score=0.95, 
                 latency_ms=2000, strengths=["reasoning", "coding", "analysis"]),
        Provider(id="openai/gpt-4o-mini", name="GPT-4o-mini", cost_per_1k=0.15, quality_score=0.85,
                 latency_ms=500, strengths=["fast", "coding"]),
        Provider(id="anthropic/claude-3.5-sonnet", name="Claude-3.5-Sonnet", cost_per_1k=3.0, 
                 quality_score=0.96, latency_ms=2500, strengths=["reasoning", "creative", "analysis"]),
        Provider(id="google/gemini-1.5-pro", name="Gemini-1.5-Pro", cost_per_1k=1.25, 
                 quality_score=0.92, latency_ms=1500, strengths=["long-context", "multilingual"]),
        Provider(id="mistralai/mistral-large", name="Mistral-Large", cost_per_1k=2.0,
                 quality_score=0.90, latency_ms=1200, strengths=["reasoning", "coding"]),
        Provider(id="meta-llama/llama-3.1-70b", name="Llama-3.1-70B", cost_per_1k=0.18,
                 quality_score=0.82, latency_ms=3000, strengths=["free", "budget"]),
        Provider(id="qwen/qwen-2-72b", name="Qwen-2-72B", cost_per_1k=0.12,
                 quality_score=0.88, latency_ms=2500, strengths=["free", "reasoning"]),
        Provider(id="deepseek/deepseek-coder", name="DeepSeek-Coder", cost_per_1k=0.07,
                 quality_score=0.84, latency_ms=800, strengths=["code-aware", "fast", "budget"]),
    ]


def benchmark_mcts_vs_heuristic(
    queries: List[Query],
    providers: List[Provider],
    n_iterations: int = 100
) -> Dict[str, Any]:
    """
    Benchmark MCTS-Routing vs A3M's heuristic scoring.
    """
    mcts_router = MCTSRouter(
        providers=providers,
        max_iterations=n_iterations,
        max_depth=2,
        exploration_constant=1.414
    )
    
    results = {
        "mcts_provider_counts": {},
        "heuristic_provider_counts": {},
        "mcts_avg_cost": [],
        "heuristic_avg_cost": [],
        "mcts_avg_quality": [],
        "heuristic_avg_quality": [],
    }
    
    for query in queries:
        # MCTS selection
        mcts_result = mcts_router.search(query)
        best_provider = mcts_router.get_best_provider(query)
        
        results["mcts_provider_counts"][best_provider.id] = \
            results["mcts_provider_counts"].get(best_provider.id, 0) + 1
        results["mcts_avg_cost"].append(mcts_result.total_cost)
        results["mcts_avg_quality"].append(mcts_result.final_quality)
        
        # Heuristic selection (A3M-style)
        heuristic_best = max(providers, key=lambda p: p.quality_score / (p.cost_per_1k + 0.01))
        results["heuristic_provider_counts"][heuristic_best.id] = \
            results["heuristic_provider_counts"].get(heuristic_best.id, 0) + 1
        results["heuristic_avg_cost"].append(
            (100 / 1000) * heuristic_best.cost_per_1k
        )
        results["heuristic_avg_quality"].append(heuristic_best.quality_score)
    
    return results


if __name__ == "__main__":
    # Test MCTS-Routing
    providers = create_sample_providers()
    router = MCTSRouter(providers=providers, max_iterations=100, max_depth=2)
    
    test_queries = [
        Query(text="Write a Python function to sort a list", features=extract_query_features("Write a Python function to sort a list")),
        Query(text="Solve this calculus problem: integrate x^2 dx", features=extract_query_features("Solve this calculus problem")),
        Query(text="What is the capital of France?", features=extract_query_features("What is the capital of France?")),
        Query(text="Debug this code: for i in range(10) print(i)", features=extract_query_features("Debug this code")),
        Query(text="Write a short story about a robot", features=extract_query_features("Write a short story about a robot")),
    ]
    
    print("=== MCTS-Routing Test ===\n")
    for query in test_queries:
        result = router.search(query)
        best = router.get_best_provider(query)
        print(f"Query: {query.text[:50]}...")
        print(f"  Best provider: {best.name} ({best.id})")
        print(f"  Provider sequence: {result.provider_sequence}")
        print(f"  Avg quality: {result.avg_quality:.3f}")
        print(f"  Total cost: ${result.total_cost:.4f}")
        print()
    
    print("\n=== Benchmark: MCTS vs Heuristic ===")
    results = benchmark_mcts_vs_heuristic(test_queries * 10, providers)
    print(f"MCTS avg quality: {np.mean(results['mcts_avg_quality']):.3f}")
    print(f"Heuristic avg quality: {np.mean(results['heuristic_avg_quality']):.3f}")
    print(f"MCTS avg cost: ${np.mean(results['mcts_avg_cost']):.4f}")
    print(f"Heuristic avg cost: ${np.mean(results['heuristic_avg_cost']):.4f}")
    print(f"\nMCTS provider distribution: {results['mcts_provider_counts']}")
    print(f"Heuristic provider distribution: {results['heuristic_provider_counts']}")