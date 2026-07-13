# ChuckleNet: Multi-Modal Laughter Prediction — Project Vision

**Last Updated:** 2026-07-12
**Project:** `chuckleNet` (autonomous laughter prediction from standup comedy)
**Repository:** github.com/Das-rebel/ChuckleNet
**Current Status:** Extracting WavLM + Prosody (22-dim) for 555 videos (~175K utterances)

---

## 🎯 Core Mission

Build an **audio-first** laughter prediction system that generalizes across comedians using:
1. **WavLM** (frozen) + attention pooling → 768-dim audio embeddings
2. **Prosody** (22-dim) → F0, energy, duration, MFCC, jitter, shimmer
3. **Fusion MLP** (800→128→64→2) with class weights [1.0, 2.5]

---

## 📊 Validated Results (71 Videos, Held-Out Comedian Evaluation)

| Model | Held-Out F1 | Notes |
|-------|-------------|-------|
| XLM-R Text (random split) | 0.819 | **OVERFITS** |
| XLM-R Text (held-out) | 0.152 | 81% collapse |
| WavLM Audio | 0.280 | Audio generalizes |
| **WavLM + Prosody Ensemble** | **0.587** | Best generalization |
| WavLM + MLP (Kaggle) | 0.355 | Improved |

**Key Finding:** Audio generalizes **2x better** than text on held-out comedians.

---

## 🔑 Critical Learnings (2026-07-12)

### Video-Level vs Utterance-Level Embeddings
- ❌ **Video-level** (645 .npy files) = ONE embedding per VIDEO = **USELESS**
- ✅ **Utterance-level** = ONE embedding per UTTERANCE SEGMENT = **CORRECT**

### Audio Folder Paths (Google Drive)
```
chuckle_audio/                    # 71 files
chuckle_audio_all/audio/          # 71 files
chuckle_audio_all/audio_all/     # 249 files
chuckle_audio_all/audio_final/   # 429 files
chuckle_audio_all/audio_new/     # 131 files
─────────────────────────────────────────
Total: 741 audio, 555 with labels
```

### Working Pipeline (Matches Kaggle)
- WavLM FROZEN (feature extractor only)
- Attention pooling (NOT mean pooling)
- 22-dim prosody (NOT 9-dim)
- Class weights [1.0, 2.5] (NOT high pos_weight)
- Fusion MLP: concat(wavlm_emb(768) + prosody_proj(32)) → 800→128→64→2
- Streaming audio (on-demand loading)

---

## 📁 Data Assets

### Local
```
/Users/Subho/data/chuckle-net/
├── wavlm_embeddings/           # 660 files (71 utt-level + 589 video-level)
├── wavlm_all_npy/             # 645 NPY (VIDEO-level - WRONG)
├── wavlm_prosody_opt/         # In progress extraction (OPTIMIZED)
├── fusion_dataset/            # 15K utterances (text + prosody)
└── audio/                    # 71 local audio files
```

### Google Drive
```
chuckle_audio/                  # 71 files
chuckle_audio_all/             # 4 subfolders, 741 total
wavlm_prosody_opt/            # In progress
wavlm_prosody_utterance_v2/    # Extraction in progress
```

### Utterances
```
/Users/Subho/autonomous_laughter_prediction_essential/data/utterances/utterances_clean.jsonl
  - 239,164 total utterances
  - 2,905 positive (1.2%)
  - 626 unique videos
```

---

## 🚀 Extraction Pipeline (Active)

### Optimized Colab (~3 hours on T4 GPU)
```
https://colab.research.google.com/github/Das-rebel/chuck-audio-notebooks/blob/main/Colab_WavLM_Optimized_Extraction.ipynb?authuser=1
```

**Features extracted per utterance:**
| Feature | Dimension |
|---------|-----------|
| WavLM | 768-dim (attention pooled) |
| Prosody | 22-dim (F0, energy, duration, MFCC, jitter, shimmer) |
| Text | 200 chars |
| Label | 0/1 |

**Optimizations:**
- Batch size 32 (4x faster)
- Checkpoint every 5 videos
- Binary .npy output (10x faster I/O)

### Local GPU (Overnight, No Disconnect Risk)
```bash
bash /Users/Subho/extract_wavlm_local_gpu.sh
```

---

## 📋 Research Questions

### Primary (Answered)
1. **Q: Audio vs Text?** → Audio generalizes 2x better (F1=0.280 vs 0.152)
2. **Q: Utterance vs Word-level?** → Utterance-level for audio (proven)

### Pending (Next Steps)
3. **Q: Can WavLM fine-tuning improve?** → Need extraction first
4. **Q: Cross-lingual transfer?** → Hindi data insufficient (<1%)

---

## 📚 Key Documents

| Document | Description |
|----------|-------------|
| `docs/CURRENT_STATUS.md` | Active pipeline status |
| `docs/EXTRACTION_SUMMARY_2026-07-12.md` | Critical learnings (video vs utterance) |
| `docs/OPTIMIZATION_PLAN_V3.md` | Extraction optimizations |
| `research-state.yaml` | Research hypothesis tracking |
| `VISION.md` | This file |

---

## 🔗 GitHub Repos

| Repo | Purpose |
|------|---------|
| Das-rebel/ChuckleNet | Main project |
| Das-rebel/chuck-audio-notebooks | Colab notebooks |
| Das-rebel/autonomous_laughter_prediction_essential | Essential data + scripts |

---

## ✅ Next Steps (In Order)

1. **Run Colab extraction** (~3 hours on T4 GPU)
2. **Download embeddings** to local
3. **Train on 555 videos** (~175K utterances)
4. **Evaluate on comedian holdout** (BFIHCzw3itk, BAD4askmGgk, 1Nb3_os4RSA)
5. **Submit EMNLP 2026 paper** (audio-first laughter detection)

---

## ❌ What NOT to Do (Lessons Learned)

1. **Don't extract video-level embeddings** - they don't work for utterance prediction
2. **Don't search only `chuckle_audio/`** - miss the other 670 files
3. **Don't use high pos_weight** - causes collapse to all-zeros
4. **Don't use mean pooling** - attention pooling is better
5. **Don't use 9-dim prosody** - need full 22-dim
