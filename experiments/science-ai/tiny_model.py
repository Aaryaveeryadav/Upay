"""Tiny causal Transformer (byte-level or pure-Python BPE) trained from scratch; learning experiment only."""
from __future__ import annotations

import argparse
import inspect
import math
import time
from collections import Counter
from pathlib import Path
from typing import Any


class ByteBPETokenizer:
    """Minimal byte-level or learned-BPE tokenizer serializable as plain integer triples."""

    def __init__(self, merges: list[list[int]] | None = None):
        self.merges: list[list[int]] = [list(m) for m in (merges or [])]
        self.pair_to_id: dict[tuple[int, int], int] = {(a, b): nid for a, b, nid in self.merges}
        self.vocab: dict[int, bytes] = {i: bytes([i]) for i in range(256)}
        for a, b, nid in self.merges:
            self.vocab[nid] = self.vocab[a] + self.vocab[b]

    @property
    def vocab_size(self) -> int:
        return 256 + len(self.merges)

    @classmethod
    def train(cls, raw: bytes, vocab_size: int = 1024, max_sample_bytes: int = 1_000_000) -> "ByteBPETokenizer":
        if vocab_size <= 256:
            return cls([])
        sample = raw[:max_sample_bytes]
        ids = list(sample)
        merges: list[list[int]] = []
        num_merges = vocab_size - 256
        for step in range(num_merges):
            if len(ids) < 2:
                break
            pairs = Counter(zip(ids, ids[1:]))
            best_pair, count = pairs.most_common(1)[0]
            if count < 2:
                break
            new_id = 256 + step
            merges.append([best_pair[0], best_pair[1], new_id])
            # Replace occurrences of best_pair in one linear pass.
            merged: list[int] = []
            i = 0
            n = len(ids)
            a, b = best_pair
            while i < n:
                if i + 1 < n and ids[i] == a and ids[i + 1] == b:
                    merged.append(new_id)
                    i += 2
                else:
                    merged.append(ids[i])
                    i += 1
            ids = merged
        return cls(merges)

    def encode(self, raw: bytes) -> list[int]:
        ids = list(raw)
        if not self.merges:
            return ids
        for a, b, new_id in self.merges:
            if len(ids) < 2:
                break
            merged: list[int] = []
            i = 0
            n = len(ids)
            while i < n:
                if i + 1 < n and ids[i] == a and ids[i + 1] == b:
                    merged.append(new_id)
                    i += 2
                else:
                    merged.append(ids[i])
                    i += 1
            ids = merged
        return ids

    def decode(self, ids: list[int]) -> str:
        raw = b"".join(self.vocab.get(int(i), b"") for i in ids)
        return raw.decode("utf-8", errors="replace")


def build_tiny_lm(**kwargs: Any):
    import torch
    from torch import nn

    class TinyLM(nn.Module):
        def __init__(
            self,
            context: int = 256,
            width: int = 192,
            layers: int = 4,
            heads: int = 4,
            vocab_size: int = 256,
            dropout: float = 0.1,
        ):
            super().__init__()
            self.context = context
            self.width = width
            self.layers = layers
            self.heads = heads
            self.vocab_size = vocab_size
            self.dropout = dropout
            self.token = nn.Embedding(vocab_size, width)
            self.position = nn.Embedding(context, width)
            self.drop = nn.Dropout(dropout)
            block = nn.TransformerEncoderLayer(
                d_model=width,
                nhead=heads,
                dim_feedforward=width * 4,
                dropout=dropout,
                activation="gelu",
                batch_first=True,
                norm_first=True,
            )
            self.transformer = nn.TransformerEncoder(block, layers, enable_nested_tensor=False)
            self.norm = nn.LayerNorm(width)
            self.output = nn.Linear(width, vocab_size, bias=False)
            self.output.weight = self.token.weight
            self._supports_is_causal = "is_causal" in inspect.signature(self.transformer.forward).parameters

        def forward(self, x):
            length = x.shape[1]
            pos = torch.arange(length, device=x.device)
            h = self.drop(self.token(x) + self.position(pos))
            mask = torch.triu(torch.ones(length, length, device=x.device, dtype=torch.bool), diagonal=1)
            if self._supports_is_causal:
                out = self.transformer(h, mask=mask, is_causal=True)
            else:
                out = self.transformer(h, mask=mask)
            return self.output(self.norm(out))

    return TinyLM(**kwargs)


def _eval_split(model, split_tensor, *, batch_size: int, context: int, device, n_batches: int = 20) -> float:
    import torch
    from torch.nn import functional as F

    model.eval()
    losses = []
    max_start = len(split_tensor) - context - 1
    if max_start <= 0:
        return float("nan")
    with torch.no_grad():
        for _ in range(n_batches):
            starts = torch.randint(0, max_start, (batch_size,))
            x = torch.stack([split_tensor[i : i + context] for i in starts]).to(device=device, dtype=torch.long)
            y = torch.stack([split_tensor[i + 1 : i + context + 1] for i in starts]).to(device=device, dtype=torch.long)
            logits = model(x)
            loss = F.cross_entropy(logits.reshape(-1, logits.shape[-1]), y.reshape(-1))
            losses.append(float(loss.item()))
    model.train()
    return sum(losses) / len(losses) if losses else float("nan")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("text", type=Path, help="UTF-8 training text you have permission to use")
    parser.add_argument("--steps", type=int, default=800)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--grad-accum", type=int, default=1)
    parser.add_argument("--context", type=int, default=256)
    parser.add_argument("--width", type=int, default=192)
    parser.add_argument("--layers", type=int, default=4)
    parser.add_argument("--heads", type=int, default=4)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--lr", type=float, default=4e-4)
    parser.add_argument("--warmup-steps", type=int, default=80)
    parser.add_argument("--val-split", type=float, default=0.1)
    parser.add_argument("--eval-every", type=int, default=100)
    parser.add_argument("--tokenizer", choices=("byte", "bpe"), default="bpe")
    parser.add_argument("--vocab-size", type=int, default=1024, help="Total vocab size when --tokenizer bpe")
    parser.add_argument("--amp", action="store_true", help="Enable fp16 mixed precision on CUDA (recommended for 4 GB VRAM)")
    parser.add_argument("--out", type=Path, default=Path("tiny-model.pt"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.steps < 1 or args.batch_size < 1 or args.grad_accum < 1 or args.context < 2:
        parser.error("steps, batch-size, and grad-accum must be positive; context must be at least 2")
    if args.width % args.heads != 0:
        parser.error("--width must be divisible by --heads")

    import torch
    from torch.nn import functional as F

    raw = args.text.read_bytes()
    if args.tokenizer == "bpe":
        t0 = time.time()
        tok = ByteBPETokenizer.train(raw, vocab_size=args.vocab_size)
        encoded = tok.encode(raw)
        print(
            f"Trained BPE vocab={tok.vocab_size} ({len(raw)} bytes -> {len(encoded)} tokens, "
            f"{len(raw) / max(1, len(encoded)):.2f} bytes/tok) in {time.time() - t0:.2f}s",
            flush=True,
        )
    else:
        tok = ByteBPETokenizer([])
        encoded = list(raw)

    if len(encoded) <= args.context + 2:
        parser.error("encoded training text must contain more tokens than context + 2")

    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    dtype_storage = torch.uint8 if tok.vocab_size <= 256 else torch.int32
    data_all = torch.tensor(encoded, dtype=dtype_storage)
    val_len = int(len(data_all) * args.val_split) if 0.0 < args.val_split < 0.5 else 0
    if val_len > args.context + 2 and (len(data_all) - val_len) > args.context + 2:
        train_data = data_all[:-val_len]
        val_data = data_all[-val_len:]
    else:
        train_data = data_all
        val_data = None

    model = build_tiny_lm(
        context=args.context,
        width=args.width,
        layers=args.layers,
        heads=args.heads,
        vocab_size=tok.vocab_size,
        dropout=args.dropout,
    ).to(device)

    n_params = sum(p.numel() for p in model.parameters())
    optim = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)

    def lr_lambda(step: int) -> float:
        if args.warmup_steps > 0 and step < args.warmup_steps:
            return float(step + 1) / float(args.warmup_steps)
        progress = (step - args.warmup_steps) / max(1, args.steps - args.warmup_steps)
        return 0.1 + 0.9 * 0.5 * (1.0 + math.cos(math.pi * min(1.0, progress)))

    scheduler = torch.optim.lr_scheduler.LambdaLR(optim, lr_lambda)
    use_amp = bool(args.amp and device.type == "cuda")
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp) if hasattr(torch, "amp") else None

    tokens_per_byte = len(encoded) / max(1, len(raw))
    print(
        f"Training on {device} | params={n_params:,} | train_tokens={len(train_data):,} | "
        f"val_tokens={len(val_data) if val_data is not None else 0:,} | amp={use_amp}. Experimental only.",
        flush=True,
    )

    best_val = float("inf")
    best_state: dict[str, Any] | None = None
    max_start = len(train_data) - args.context - 1

    model.train()
    for step in range(args.steps):
        optim.zero_grad(set_to_none=True)
        total_loss = 0.0
        for _ in range(args.grad_accum):
            starts = torch.randint(0, max_start, (args.batch_size,))
            x = torch.stack([train_data[i : i + args.context] for i in starts]).to(device=device, dtype=torch.long)
            y = torch.stack([train_data[i + 1 : i + args.context + 1] for i in starts]).to(device=device, dtype=torch.long)
            if use_amp:
                with torch.amp.autocast("cuda", dtype=torch.float16):
                    logits = model(x)
                    loss = F.cross_entropy(logits.reshape(-1, tok.vocab_size), y.reshape(-1)) / args.grad_accum
                assert scaler is not None
                scaler.scale(loss).backward()
            else:
                logits = model(x)
                loss = F.cross_entropy(logits.reshape(-1, tok.vocab_size), y.reshape(-1)) / args.grad_accum
                loss.backward()
            total_loss += float(loss.item())

        if use_amp and scaler is not None:
            scaler.unscale_(optim)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optim)
            scaler.update()
        else:
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optim.step()
        scheduler.step()

        is_eval_step = step == 0 or (step + 1) % args.eval_every == 0 or step + 1 == args.steps
        if is_eval_step:
            bpb_train = total_loss * tokens_per_byte / math.log(2.0)
            msg = f"step {step + 1}/{args.steps}: train_loss={total_loss:.3f} (bpb={bpb_train:.2f})"
            if val_data is not None:
                val_loss = _eval_split(model, val_data, batch_size=args.batch_size, context=args.context, device=device)
                bpb_val = val_loss * tokens_per_byte / math.log(2.0)
                msg += f" | val_loss={val_loss:.3f} (bpb={bpb_val:.2f})"
                if val_loss < best_val:
                    best_val = val_loss
                    best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            print(msg, flush=True)

    final_state = best_state if best_state is not None else {k: v.detach().cpu() for k, v in model.state_dict().items()}
    checkpoint = {
        "state_dict": final_state,
        "context": args.context,  # backward compatibility field
        "config": {
            "context": args.context,
            "width": args.width,
            "layers": args.layers,
            "heads": args.heads,
            "vocab_size": tok.vocab_size,
            "dropout": args.dropout,
            "tokenizer": args.tokenizer,
            "merges": tok.merges,
            "best_val_loss": best_val if best_state is not None else None,
        },
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, args.out)
    print(f"Saved {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
