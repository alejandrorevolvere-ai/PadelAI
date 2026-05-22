"""
Knowledge document loader.

Parses all .md files in the documents/ directory, extracts sections,
and indexes them into the PadelKnowledgeBase singleton.

Can also be used standalone (``python -m backend.knowledge.loader``)
to verify document loading.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the backend package is importable when run as a script
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from knowledge.embeddings import PadelKnowledgeBase


def load_knowledge_base() -> PadelKnowledgeBase:
    """Load all documents into the singleton knowledge base.

    Returns
    -------
    PadelKnowledgeBase
        The singleton instance with all chunks indexed.
    """
    kb = PadelKnowledgeBase()
    chunks = kb.get_all_chunks()
    print(f"[loader] Loaded {len(chunks)} chunks from {len(set(c.source for c in chunks))} documents")
    return kb


def print_stats(kb: PadelKnowledgeBase) -> None:
    """Print loading statistics grouped by topic."""
    chunks = kb.get_all_chunks()

    by_topic: dict[str, list] = {}
    for c in chunks:
        by_topic.setdefault(c.topic, []).append(c)

    print("\n━━━ Knowledge Base Statistics ━━━")
    print(f"Total chunks: {len(chunks)}")
    print(f"Vocabulary size: ~{len(kb._vocabulary)} terms" if hasattr(kb, '_vocabulary') else "")
    print()
    for topic, items in sorted(by_topic.items()):
        print(f"  {topic}: {len(items)} secciones")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")


if __name__ == "__main__":
    kb = load_knowledge_base()
    print_stats(kb)

    # Interactive search demo
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        results = kb.search(query, top_k=3)
        print(f"Query: \"{query}\" → {len(results)} results\n")
        for r in results:
            print(f"  [{r['source']} / {r['topic']}] (score: {r['score']:.3f})")
            text_preview = r["text"][:150].replace("\n", " ")
            print(f"  {text_preview}...\n")
    else:
        # Demo: a few queries
        for q in ["bandeja profunda", "remate potencia", "reglas saque", "mejor pala para principiantes"]:
            results = kb.search(q, top_k=2)
            print(f"Query: \"{q}\" → {len(results)} results")
            for r in results:
                print(f"  [{r['source']}:{r['topic']}] score={r['score']:.3f}")
            print()
