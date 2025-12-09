"""
Oumi RL fine-tuning script (mocked wiring)

Goal: improve TypeScript Jest unit tests for given code snippets.

What to wire in later:
- Provide a JSONL dataset file with records: {"input_code": "...", "target_tests": "..."}
- Add your Oumi API credentials / endpoints.
- Replace the placeholder trainer/evaluator calls with real Oumi SDK usage.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple


# Minimal dataclass for a training example
@dataclass
class TrainExample:
    input_code: str
    target_tests: str


def load_dataset(jsonl_path: Path, limit: int | None = None) -> List[TrainExample]:
    """Load (input_code, target_tests) pairs from JSONL."""
    examples: List[TrainExample] = []
    with jsonl_path.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if limit and i >= limit:
                break
            record = json.loads(line)
            examples.append(
                TrainExample(
                    input_code=record["input_code"],
                    target_tests=record["target_tests"],
                )
            )
    return examples


def ensure_dataset_exists(jsonl_path: Path) -> None:
    """If the dataset is missing, create a tiny sample so the script runs."""
    if jsonl_path.exists():
        return
    jsonl_path.parent.mkdir(parents=True, exist_ok=True)
    samples = [
        {
          "input_code": "export function add(a: number, b: number) { return a + b; }",
          "target_tests": "import { add } from './add';\ndescribe('add', () => { it('adds numbers', () => { expect(add(2, 3)).toBe(5); }); });",
        },
        {
          "input_code": "export const isEven = (n: number) => n % 2 === 0;",
          "target_tests": "import { isEven } from './isEven';\ndescribe('isEven', () => { it('detects evens', () => { expect(isEven(4)).toBe(true); }); it('detects odds', () => { expect(isEven(5)).toBe(false); }); });",
        },
    ]
    with jsonl_path.open("w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    print(f"[info] Created sample dataset at {jsonl_path}")


def mock_oumi_trainer(config: dict, data: Iterable[TrainExample]) -> None:
    """
    Placeholder for Oumi RL trainer wiring.

    Replace this with something like:
    from oumi import Trainer, RewardModel, PolicyModel, Tokenizer
    trainer = Trainer(
        policy_model=PolicyModel.from_pretrained(config["base_model"]),
        reward_model=RewardModel.from_pretrained(config["reward_model"]),
        tokenizer=Tokenizer.from_pretrained(config["tokenizer"]),
        training_args=...,  # RL-specific args
    )
    trainer.train(data)
    trainer.save_pretrained(config["output_dir"])
    """
    print("=== Oumi RL trainer would start here ===")
    print(f"Config: {json.dumps(config, indent=2)}")
    print(f"Dataset size: {len(list(data))}")
    print("=== End of mock training ===")


def make_config(config_path: Path) -> dict:
    """Load the YAML config as a dict (kept small and readable)."""
    import yaml

    with config_path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def run_training(
    config_path: Path = Path("configs/test_gen_config.yaml"),
    dataset_path: Path = Path("data/test_gen_samples.jsonl"),
):
    """Entrypoint to run a short RL fine-tuning loop."""
    config = make_config(config_path)

    ensure_dataset_exists(dataset_path)
    # In practice, you might stream or shard the dataset; here we just load a small file.
    examples = load_dataset(dataset_path, limit=config.get("max_examples"))

    # Show a preview for quick sanity checks.
    if examples:
        print("Sample example:")
        print(examples[0])

    # Kick off (mock) RL training.
    mock_oumi_trainer(config, examples)


if __name__ == "__main__":
    run_training()

