# Safe SkyReels Production Runbook

## Goal
Use the official SkyReels V2 open-source code as the video-generation engine for repeatable long-form and short-form Neville Goddard SOA production.

## Security-first install
Run in a disposable GPU workspace/container. Do not run as root.

```bash
set -euo pipefail
mkdir -p ~/skyreels-safe && cd ~/skyreels-safe
git clone https://github.com/SkyworkAI/SkyReels-V2.git
cd SkyReels-V2
git checkout 9351d13152207cc04de780e055346b08ade0b851
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install pip-audit
python -m pip install -r requirements.txt
python -m pip freeze > requirements.lock.txt
pip-audit || true
```

Review every vulnerability before rendering. Do not blindly ignore high/critical findings.

## Model policy
Only download official `Skywork/*` SkyReels model repos. Pin model revision where the environment supports it. Never supply random `.pth/.pt/.ckpt` files.

## First smoke test
```bash
python generate_video.py \
  --model_id Skywork/SkyReels-V2-T2V-14B-720P \
  --resolution 720P \
  --num_frames 97 \
  --fps 24 \
  --prompt "Cinematic ocean sunrise, calm forward camera movement, realistic natural light, premium 35mm film aesthetic"
```

Verify the produced MP4 with `ffprobe` and visually inspect it before batch generation.

## Long-form factory
1. Read a production's `research-brief.md`.
2. Lock script.
3. Read `skyreels-render-plan.md`.
4. Generate 5–10 second clips from the approved prompt library.
5. Reject malformed output automatically using frame checks, then visually review finalists.
6. Generate narration with an approved zero-cost/local voice engine; never imitate Neville's voice.
7. Assemble clips/narration/music/captions in FFmpeg or Remotion.
8. Export 1080p master.
9. Derive 3–5 vertical Shorts from the strongest sections.
10. Generate 3 thumbnail candidates using local/free tooling.
11. Run QA and only then mark completed.

## Unlimited-production meaning
“Unlimited” means the pipeline has no per-video paid API dependency. It does **not** mean compute is free or instantaneous. SkyReels is GPU-intensive, especially its 14B models. Throughput is bounded by available GPU VRAM and render time.

## Output evidence
Do not call a production complete unless:
- final MP4 exists
- `ffprobe` passes
- audio exists
- duration is within target
- captions exist
- visual QA passes
- file path is recorded

## Current flagship production
`productions/2026-09-17-already-done/`

Required final outputs:
- `deliverables/already-done-11min-master.mp4`
- `deliverables/already-done-short-01.mp4`
- `deliverables/already-done-short-02.mp4`
- `deliverables/already-done-short-03.mp4`
- `deliverables/thumbnail-a.png`
- `deliverables/thumbnail-b.png`
- `deliverables/thumbnail-c.png`
- `deliverables/captions.srt`
- `deliverables/render-report.json`
