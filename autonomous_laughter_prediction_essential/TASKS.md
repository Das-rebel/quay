# ChuckleNet Tasks - 2026-07-12

## Active Tasks

### 🎯 Primary: WavLM + Prosody Extraction
- [ ] Run Optimized Colab notebook (~3 hours)
  - Link: https://colab.research.google.com/github/Das-rebel/chuck-audio-notebooks/blob/main/Colab_WavLM_Optimized_Extraction.ipynb?authuser=1
  - Output: 555 videos, ~175K utterances
  - Checkpoint: Every 5 videos
- [ ] Download embeddings from Drive to local
  - Target: `/Users/Subho/data/chuckle-net/wavlm_prosody_opt/`

### 📊 Training (After Extraction)
- [ ] Train WavLM + Prosody fusion MLP on 555 videos
- [ ] Evaluate on comedian holdout:
  - BFIHCzw3itk
  - BAD4askmGgk  
  - 1Nb3_os4RSA
- [ ] Compare to baseline (F1=0.587 on 71 videos)

### 📝 Paper
- [ ] Submit EMNLP 2026 Industry Track
- [ ] Highlight: Audio generalizes 2x better than text

## Completed ✅
- [x] Identify video vs utterance-level extraction (2026-07-12)
- [x] Fix audio folder paths (search ALL subfolders)
- [x] Create optimized extraction notebook (batch=32, checkpoint=5)
- [x] Update VISION.md with current status
- [x] Save critical learnings to docs/

## Blocked 🔴
- Waiting for extraction to complete (~3 hours on Colab)

## Notes
- Extraction optimized: ~3 hours (was 8 hours)
- Binary .npy output (10x faster save)
- Auto-resume from checkpoint if disconnected
