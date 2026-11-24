"""Generate text from a checkpoint produced by tiny_model.py."""
import argparse
from pathlib import Path
import torch
from tiny_model import TinyLM

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('checkpoint', type=Path)
p.add_argument('--prompt', default='Science')
p.add_argument('--bytes', type=int, default=200)
a = p.parse_args()
if a.bytes < 0 or not a.prompt:
    p.error('bytes must be non-negative and prompt must not be empty')
# Only load checkpoints you trust. weights_only avoids arbitrary pickle execution.
checkpoint = torch.load(a.checkpoint, map_location='cpu', weights_only=True)
model = TinyLM(context=checkpoint['context'])
model.load_state_dict(checkpoint['state_dict'])
model.eval()
sequence = list(a.prompt.encode('utf-8'))
with torch.no_grad():
    for _ in range(a.bytes):
        x = torch.tensor([sequence[-model.context:]], dtype=torch.long)
        probs = torch.softmax(model(x)[0, -1] / 0.8, dim=-1)
        sequence.append(torch.multinomial(probs, 1).item())
print(bytes(sequence).decode('utf-8', errors='replace'))
