# ChuckleNet: Audio-First Laughter Prediction

**Multi-modal laughter prediction from standup comedy using WavLM + Prosody fusion.**

---

## 🎯 Current Status (2026-07-12)

**Active:** Extracting WavLM + Prosody (22-dim) embeddings for 555 videos (~175K utterances)

### Quick Links

| Resource | Link |
|----------|------|
| **Optimized Colab** (3 hrs) | [Colab Notebook](https://colab.research.google.com/github/Das-rebel/chuck-audio-notebooks/blob/main/Colab_WavLM_Optimized_Extraction.ipynb?authuser=1) |
| **Training Notebook** | [Colab Notebook](https://colab.research.google.com/github/Das-rebel/chuck-audio-notebooks/blob/main/Colab_WavLM_Prosody_Training_v2.ipynb?authuser=1) |
| **Extraction Summary** | [docs/EXTRACTION_SUMMARY_2026-07-12.md](docs/EXTRACTION_SUMMARY_2026-07-12.md) |
| **Optimization Plan** | [docs/OPTIMIZATION_PLAN_V3.md](docs/OPTIMIZATION_PLAN_V3.md) |
| **Vision** | [VISION.md](VISION.md) |

---

## 📊 Validated Results (71 Videos)

| Model | Held-Out F1 | Notes |
|-------|-------------|-------|
| XLM-R Text | 0.152 | Overfits (81% drop) |
| WavLM Audio | 0.280 | Audio generalizes |
| **Ensemble** | **0.587** | Best generalization |

**Key Finding:** Audio generalizes **2x better** than text on held-out comedians.

---

## 🔑 Critical Learnings

### DO ✅
- Use **utterance-level** embeddings (one per utterance segment)
- Search **ALL** audio folders on Drive (not just `chuckle_audio/`)
- Use **attention pooling** (not mean pooling)
- Use **22-dim prosody** (F0, energy, MFCC, jitter, shimmer)
- Use **class weights [1.0, 2.5]** (not high pos_weight)
- Use **streaming audio** (on-demand loading)

### DON'T ❌
- ❌ Video-level embeddings (645 NPY files = USELESS)
- ❌ Only `chuckle_audio/` (misses 670 files)
- ❌ High pos_weight (causes all-zeros collapse)
- ❌ Mean pooling (attention is better)
- ❌ 9-dim prosody (need 22-dim)

---

## 📁 Audio Locations (Google Drive)

```
chuckle_audio/                    71 files
chuckle_audio_all/audio/          71 files  
chuckle_audio_all/audio_all/     249 files
chuckle_audio_all/audio_final/   429 files
chuckle_audio_all/audio_new/     131 files
─────────────────────────────────────────
Total: 741 audio, 555 with labels
```

---

## 🚀 Next Steps

1. **Run extraction** (~3 hours on Colab T4 GPU)
2. **Download embeddings** to local
3. **Train on 555 videos** (~175K utterances)
4. **Evaluate on comedian holdout**
5. **Submit EMNLP 2026 paper**

---

## 📚 Documentation

| File | Description |
|------|-------------|
| [VISION.md](VISION.md) | Project vision + validated results |
| [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) | Active pipeline status |
| [docs/EXTRACTION_SUMMARY_2026-07-12.md](docs/EXTRACTION_SUMMARY_2026-07-12.md) | Critical learnings |
| [docs/OPTIMIZATION_PLAN_V3.md](docs/OPTIMIZATION_PLAN_V3.md) | Extraction optimizations |

---

## 📂 Project Structure

```
autonomous_laughter_prediction/
├── VISION.md                    # This file - project overview
├── README.md                    # Quick links + status
├── docs/
│   ├── CURRENT_STATUS.md        # Active pipeline
│   ├── EXTRACTION_SUMMARY_*.md  # Critical learnings
│   ├── OPTIMIZATION_PLAN_*.md   # Optimization details
│   └── *.md                    # Various papers + plans
├── research-state.yaml         # Hypothesis tracking
└── training/                   # Training scripts
    └── *.py
```

---

## 🔗 Related Repos

| Repo | Purpose |
|------|---------|
| Das-rebel/ChuckleNet | Main project |
| Das-rebel/chuck-audio-notebooks | Colab notebooks |
| Das-rebel/autonomous_laughter_prediction_essential | Essential data |
