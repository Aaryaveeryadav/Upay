"""Generate text from a checkpoint produced by tiny_model.py."""
from __future__ import annotations

import argparse
from pathlib import Path

from tiny_model import ByteBPETokenizer, build_tiny_lm


def top_k_top_p_filter(logits, top_k: int = 0, top_p: float = 1.0):
    import torch

    if top_k > 0:
        kth = torch.topk(logits, min(top_k, logits.size(-1))).values[-1]
        logits = torch.where(logits < kth, torch.full_like(logits, float("-inf")), logits)
    if 0.0 < top_p < 1.0:
        sorted_logits, sorted_idx = torch.sort(logits, descending=True)
        cum_probs = torch.cumsum(torch.softmax(sorted_logits, dim=-1), dim=-1)
        remove = cum_probs > top_p
        remove[1:] = remove[:-1].clone()
        remove[0] = False
        logits = logits.clone()
        logits[sorted_idx[remove]] = float("-inf")
    return logits


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("checkpoint", type=Path)
    p.add_argument("--prompt", default="Science is")
    p.add_argument("--tokens", "--bytes", dest="tokens", type=int, default=160)
    p.add_argument("--temperature", type=float, default=0.8)
    p.add_argument("--top-k", type=int, default=40)
    p.add_argument("--top-p", type=float, default=0.95)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    a = p.parse_args()

    if a.tokens < 0 or not a.prompt:
        p.error("tokens/bytes must be non-negative and prompt must not be empty")
    if a.temperature <= 0:
        p.error("temperature must be positive")

    import torch

    torch.manual_seed(a.seed)
    device = torch.device(
        ("cuda" if torch.cuda.is_available() else "cpu") if a.device == "auto" else a.device
    )

    # Only load checkpoints you trust. weights_only avoids arbitrary pickle execution.
    checkpoint = torch.load(a.checkpoint, map_location="cpu", weights_only=True)
    cfg = checkpoint.get("config") or {
        "context": checkpoint["context"],
        "width": 128,
        "layers": 2,
        "heads": 4,
        "vocab_size": 256,
        "dropout": 0.1,
        "merges": [],
    }
    tok = ByteBPETokenizer(cfg.get("merges") or [])
    model = build_tiny_lm(
        context=int(cfg["context"]),
        width=int(cfg["width"]),
        layers=int(cfg["layers"]),
        heads=int(cfg["heads"]),
        vocab_size=int(cfg["vocab_size"]),
        dropout=float(cfg.get("dropout", 0.1)),
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()

    sequence = tok.encode(a.prompt.encode("utf-8"))
    with torch.no_grad():
        for _ in range(a.tokens):
            x = torch.tensor([sequence[-model.context :]], dtype=torch.long, device=device)
            logits = model(x)[0, -1] / a.temperature
            filtered = top_k_top_p_filter(logits, top_k=a.top_k, top_p=a.top_p)
            probs = torch.softmax(filtered, dim=-1)
            sequence.append(int(torch.multinomial(probs, 1).item()))

    print(tok.decode(sequence))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
