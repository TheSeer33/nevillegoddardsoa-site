# SkyReels V2 Security Audit

Upstream: https://github.com/SkyworkAI/SkyReels-V2
Pinned upstream commit reviewed: `9351d13152207cc04de780e055346b08ade0b851`

## Conclusion
No obvious malicious logic was found in the reviewed first-party inference entrypoint, model-download helper, repository tree, or package manifest. However, this is **not an absolute malware guarantee**. The safe operating policy below is mandatory before execution.

## Reviewed areas
- repository tree
- `generate_video.py`
- `requirements.txt`
- `skyreels_v2_infer/modules/__init__.py`
- code search for shell/process execution indicators
- model download behavior
- model checkpoint loading behavior

## Findings
### Positive
- Main inference entrypoint performs argument parsing, model setup, CUDA inference, and MP4 writing.
- No `os.system` or obvious subprocess shell execution was found in the repository search performed before adoption.
- Transformer weights are loaded from `.safetensors` where available.
- Official model identifiers point to the `Skywork` Hugging Face namespace.

### Material risk: checkpoint deserialization
The repository also loads `.pth` checkpoints for T5 / CLIP model components. PyTorch checkpoint formats can be unsafe when obtained from untrusted sources because pickle-based deserialization can execute code.

**Policy:** Never load community/random checkpoints. Only use official Skywork model repositories pinned to approved revisions. Record hashes/revisions before use.

### Material risk: dependency supply chain
`requirements.txt` pins some packages but leaves others ranged or unpinned. Any Python package install carries supply-chain risk.

**Policy:**
1. install in an isolated environment/container
2. pin resolved package versions to a lock file after first clean build
3. run dependency vulnerability scanning (`pip-audit` or equivalent)
4. never run as root if avoidable
5. no host secrets mounted into the render container
6. no SSH keys / cloud credentials in the render workspace
7. outbound network restricted to GitHub/Hugging Face only during dependency/model retrieval

### License
SkyReels uses the Skywork Community License rather than MIT/Apache. Commercial use is described as supported, subject to the linked license terms. Review those terms before commercial deployment.

## Approved model sources
- `Skywork/SkyReels-V2-T2V-14B-540P`
- `Skywork/SkyReels-V2-T2V-14B-720P`
- `Skywork/SkyReels-V2-I2V-1.3B-540P`
- `Skywork/SkyReels-V2-I2V-14B-540P`
- `Skywork/SkyReels-V2-I2V-14B-720P`
- official Skywork diffusion-forcing / video-extension checkpoints only

## Forbidden
- arbitrary `.pth`, `.pt`, `.ckpt`, pickle, or community model files
- `trust_remote_code=True` unless separately reviewed
- curl|bash installers
- root execution
- secret-filled `.env` files inside the model repo
- disabling TLS certificate checks
- running downloaded binaries from unknown releases

## Runtime gate
The renderer may run only after:
- upstream commit is pinned
- package lock is created
- dependency scan passes or findings are explicitly reviewed
- model source is official Skywork
- model revision/hash is recorded
- render workspace has no unrelated credentials
