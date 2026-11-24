"""A tiny byte-level Transformer trained from scratch; not a production tutor."""
import argparse
from pathlib import Path

import torch
from torch import nn
from torch.nn import functional as F


class TinyLM(nn.Module):
    def __init__(self, context=128, width=128, layers=2, heads=4):
        super().__init__()
        self.context = context
        self.token = nn.Embedding(256, width)
        self.position = nn.Embedding(context, width)
        block = nn.TransformerEncoderLayer(width, heads, width * 4, batch_first=True, dropout=0.1)
        self.transformer = nn.TransformerEncoder(block, layers, enable_nested_tensor=False)
        self.norm = nn.LayerNorm(width)
        self.output = nn.Linear(width, 256)

    def forward(self, x):
        length = x.shape[1]
        h = self.token(x) + self.position(torch.arange(length, device=x.device))
        mask = torch.triu(torch.ones(length, length, device=x.device, dtype=torch.bool), diagonal=1)
        return self.output(self.norm(self.transformer(h, mask=mask)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('text', type=Path, help='UTF-8 training text you have permission to use')
    parser.add_argument('--steps', type=int, default=500)
    parser.add_argument('--batch-size', type=int, default=8)
    parser.add_argument('--context', type=int, default=128)
    parser.add_argument('--out', type=Path, default=Path('tiny-model.pt'))
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    if args.steps < 1 or args.batch_size < 1 or args.context < 2:
        parser.error('steps and batch-size must be positive; context must be at least 2')
    raw = args.text.read_bytes()
    if len(raw) <= args.context + 1:
        parser.error('training text must contain more bytes than context + 1')
    torch.manual_seed(args.seed)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    data = torch.tensor(list(raw), dtype=torch.long)
    model = TinyLM(context=args.context).to(device)
    optim = torch.optim.AdamW(model.parameters(), lr=3e-4)
    print(f'Training on {device}; {len(raw)} bytes. Experimental only.', flush=True)
    model.train()
    for step in range(args.steps):
        starts = torch.randint(len(data) - args.context, (args.batch_size,))
        x = torch.stack([data[i:i + args.context] for i in starts]).to(device)
        y = torch.stack([data[i + 1:i + args.context + 1] for i in starts]).to(device)
        logits = model(x)
        loss = F.cross_entropy(logits.reshape(-1, 256), y.reshape(-1))
        optim.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optim.step()
        if step == 0 or (step + 1) % 100 == 0 or step + 1 == args.steps:
            print(f'step {step + 1}/{args.steps}: training loss {loss.item():.3f}', flush=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.save({'state_dict': model.state_dict(), 'context': args.context}, args.out)
    print(f'Saved {args.out}')


if __name__ == '__main__':
    main()
