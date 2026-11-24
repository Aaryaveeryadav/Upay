"""QLoRA (4-bit LoRA) fine-tuning script for a Class 10 Science tutor on 4 GB VRAM (RTX 3050).

Builds instruction-tuning examples from an indexed `science-index.json` (or JSONL)
and fine-tunes a small pretrained instruct model (default: Qwen/Qwen2.5-1.5B-Instruct)
using PEFT + 4-bit NF4 quantization.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def build_sft_jsonl(index_path: Path, out_jsonl: Path, *, max_chars: int = 1400) -> int:
    """Convert `science-index.json` chunks into chat-style SFT JSONL records."""
    raw = json.loads(index_path.read_text(encoding="utf-8"))
    chunks = raw.get("chunks", raw) if isinstance(raw, dict) else raw
    seen: set[str] = set()
    records: list[dict[str, Any]] = []

    for c in chunks:
        txt = " ".join(str(c.get("text", "")).split())
        if len(txt) < 40 or txt in seen:
            continue
        seen.add(txt)
        ch = c.get("chapter")
        ch_title = c.get("chapter_title") or (f"Chapter {ch}" if ch else "CBSE Class 10 Science")
        sec = c.get("section") or "General"
        doc_type = c.get("doc_type", "textbook")

        if doc_type in ("pyq", "marking_scheme"):
            user_msg = f"Provide CBSE Class 10 Science board exam practice/reference material from {sec}."
        else:
            user_msg = f"Explain the CBSE Class 10 Science concept from {ch_title} ({sec})."

        records.append(
            {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a CBSE Class 10 Science study assistant. Give accurate, concise NCERT-aligned explanations.",
                    },
                    {"role": "user", "content": user_msg},
                    {"role": "assistant", "content": txt[:max_chars]},
                ]
            }
        )

    out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with out_jsonl.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return len(records)


def train_qlora(
    dataset_jsonl: Path,
    *,
    base_model: str = "Qwen/Qwen2.5-1.5B-Instruct",
    out_dir: Path = Path("lora-science-adapter"),
    epochs: int = 2,
    batch_size: int = 1,
    grad_accum: int = 8,
    lr: float = 2e-4,
    max_seq_len: int = 512,
    lora_r: int = 16,
    lora_alpha: int = 32,
) -> None:
    import torch
    from datasets import load_dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        DataCollatorForLanguageModeling,
        Trainer,
        TrainingArguments,
    )

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(base_model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=bnb_config,
        device_map="auto",
    )
    model = prepare_model_for_kbit_training(model)

    lora_cfg = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora_cfg)
    model.print_trainable_parameters()

    ds = load_dataset("json", data_files=str(dataset_jsonl), split="train")

    def _tokenize(example: dict[str, Any]) -> dict[str, Any]:
        text = tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return tokenizer(text, truncation=True, max_length=max_seq_len)

    tok_ds = ds.map(_tokenize, remove_columns=ds.column_names)

    args = TrainingArguments(
        output_dir=str(out_dir),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=grad_accum,
        learning_rate=lr,
        fp16=torch.cuda.is_available(),
        logging_steps=10,
        save_strategy="epoch",
        optim="paged_adamw_8bit",
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tok_ds,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )
    trainer.train()
    model.save_pretrained(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    print(f"Saved LoRA adapter + tokenizer to {out_dir}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_prep = sub.add_parser("prepare", help="Convert science-index.json into SFT JSONL")
    p_prep.add_argument("--index", type=Path, required=True)
    p_prep.add_argument("--out", type=Path, default=Path("science-sft.jsonl"))

    p_tr = sub.add_parser("train", help="Run 4-bit QLoRA fine-tuning on SFT JSONL")
    p_tr.add_argument("--data", type=Path, required=True)
    p_tr.add_argument("--base-model", default="Qwen/Qwen2.5-1.5B-Instruct")
    p_tr.add_argument("--out", type=Path, default=Path("lora-science-adapter"))
    p_tr.add_argument("--epochs", type=int, default=2)
    p_tr.add_argument("--batch-size", type=int, default=1)
    p_tr.add_argument("--grad-accum", type=int, default=8)
    p_tr.add_argument("--lr", type=float, default=2e-4)
    p_tr.add_argument("--max-seq-len", type=int, default=512)

    args = parser.parse_args()
    if args.command == "prepare":
        count = build_sft_jsonl(args.index, args.out)
        print(f"Wrote {count} SFT examples to {args.out}")
        return 0
    if args.command == "train":
        train_qlora(
            args.data,
            base_model=args.base_model,
            out_dir=args.out,
            epochs=args.epochs,
            batch_size=args.batch_size,
            grad_accum=args.grad_accum,
            lr=args.lr,
            max_seq_len=args.max_seq_len,
        )
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
