"""
Padel Knowledge Base — RAG engine.

In-memory vector store using TF-IDF + cosine similarity.
Loads all markdown documents, chunks by section (##), and provides
search and context-formatting for the Chat Coach LLM.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import ClassVar

DOCUMENTS_DIR = Path(__file__).resolve().parent / "documents"


@dataclass
class Chunk:
    """A single section-level chunk extracted from a markdown document."""

    id: str
    text: str
    source: str  # filename, e.g. "tecnica.md"
    topic: str  # e.g. "tecnicas", "tacticas", "reglas"
    metadata: dict = field(default_factory=dict)


class PadelKnowledgeBase:
    """Singleton RAG knowledge base for padel coaching.

    Builds an in-memory index using TF-IDF weighted term frequencies
    and cosine similarity for retrieval. No external dependencies
    beyond the Python standard library.
    """

    _instance: ClassVar[PadelKnowledgeBase | None] = None

    def __new__(cls, *args, **kwargs) -> PadelKnowledgeBase:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True

        self.chunks: list[Chunk] = []
        self._idf: dict[str, float] = {}  # term → inverse document frequency
        self._tfidf_vectors: list[Counter[str]] = []  # per-chunk term-frequency
        self._vocabulary: set[str] = set()

        self._load_documents()

    # ── Public API ───────────────────────────────────────────────────────────

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """Search the knowledge base and return the top-k relevant chunks.

        Parameters
        ----------
        query:
            Natural-language query from the user.
        top_k:
            Maximum number of results to return (default 5).

        Returns
        -------
        list[dict]
            Each entry: ``{text, source, topic, score}`` sorted by score descending.
        """
        if not self.chunks:
            return []

        query_terms = self._tokenize(query)
        query_vec = self._tfidf_transform_query(query_terms)

        scored: list[tuple[float, int]] = []
        for idx, doc_vec in enumerate(self._tfidf_vectors):
            score = self._cosine_similarity(query_vec, doc_vec)
            scored.append((score, idx))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_results = scored[:top_k]

        results: list[dict] = []
        for score, idx in top_results:
            if score > 0.0:
                chunk = self.chunks[idx]
                results.append({
                    "text": chunk.text,
                    "source": chunk.source,
                    "topic": chunk.topic,
                    "score": round(score, 4),
                })
        return results

    def get_context(self, query: str, top_k: int = 5) -> str:
        """Format search results as a context string for an LLM prompt.

        Parameters
        ----------
        query:
            User's query text.
        top_k:
            Number of chunks to include.

        Returns
        -------
        str
            Formatted context with section headers and sources.
        """
        results = self.search(query, top_k=top_k)
        if not results:
            return ""

        parts: list[str] = ["## Contexto de conocimiento (Pádel Coach RAG)\n"]
        for i, r in enumerate(results, 1):
            parts.append(
                f"### Fuente {i}: {r['source']} (tema: {r['topic']})\n"
                f"Relevancia: {r['score']:.2%}\n\n"
                f"{r['text']}\n"
            )
        parts.append("---\n")
        return "\n".join(parts)

    def get_all_chunks(self) -> list[Chunk]:
        """Return the full list of loaded chunks (useful for debugging / loader)."""
        return list(self.chunks)

    # ── Private: indexing ────────────────────────────────────────────────────

    def _load_documents(self) -> None:
        """Walk the documents directory, parse .md files, and build the index."""
        if not DOCUMENTS_DIR.is_dir():
            return

        topic_map = {
            "tecnica": "tecnicas",
            "tactica": "tacticas",
            "reglamento": "reglas",
            "entrenamiento": "entrenamiento",
            "material": "material",
        }

        for md_path in sorted(DOCUMENTS_DIR.glob("*.md")):
            stem = md_path.stem  # e.g. "tecnica"
            topic = topic_map.get(stem, stem)
            source = md_path.name
            sections = self._parse_sections(md_path)

            for sec_title, sec_body in sections:
                chunk_id = f"{stem}/{sec_title.lower().replace(' ', '-')}"
                text = f"# {sec_title}\n\n{sec_body.strip()}"
                self.chunks.append(
                    Chunk(
                        id=chunk_id,
                        text=text,
                        source=source,
                        topic=topic,
                    )
                )

        # Build vocabulary and IDF
        self._build_index()

    def _parse_sections(self, path: Path) -> list[tuple[str, str]]:
        """Parse a markdown file and return (section_title, body) pairs for each ## block."""
        text = path.read_text(encoding="utf-8")
        lines = text.split("\n")
        sections: list[tuple[str, str]] = []
        current_title = ""
        current_lines: list[str] = []

        for line in lines:
            if line.startswith("## "):
                if current_title and current_lines:
                    sections.append((current_title, "\n".join(current_lines).strip()))
                current_title = line.replace("## ", "").strip()
                current_lines = []
            elif line.startswith("# ") or line.startswith("### ") or line.startswith("#### "):
                current_lines.append(line)
            else:
                if current_title:
                    current_lines.append(line)

        if current_title and current_lines:
            sections.append((current_title, "\n".join(current_lines).strip()))

        return sections

    def _build_index(self) -> None:
        """Build TF-IDF vectors for all chunks."""
        if not self.chunks:
            return

        # Collect vocabulary
        doc_term_sets: list[set[str]] = []
        for chunk in self.chunks:
            terms = set(self._tokenize(chunk.text))
            doc_term_sets.append(terms)
            self._vocabulary.update(terms)

        N = len(self.chunks)

        # Compute IDF for each term
        for term in self._vocabulary:
            df = sum(1 for ts in doc_term_sets if term in ts)
            self._idf[term] = math.log((N - df + 0.5) / (df + 0.5) + 1.0) + 1.0

        # Compute TF-IDF vectors
        for chunk in self.chunks:
            tf = Counter(self._tokenize(chunk.text))
            vec: Counter[str] = Counter()
            for term, count in tf.items():
                if term in self._idf:
                    vec[term] = count * self._idf[term]
            self._tfidf_vectors.append(vec)

    # ── Private: tokenization ────────────────────────────────────────────────

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Lowercase, split on non-alphanumeric, remove short tokens."""
        tokens = re.findall(r"[a-záéíóúüñ]+", text.lower())
        return [t for t in tokens if len(t) > 2]

    # ── Private: similarity ──────────────────────────────────────────────────

    @staticmethod
    def _tfidf_transform_query(terms: list[str]) -> Counter[str]:
        """Compute TF-IDF-weighted counter for a query."""
        return Counter(terms)

    @staticmethod
    def _cosine_similarity(a: Counter[str], b: Counter[str]) -> float:
        """Cosine similarity between two term-frequency counters."""
        intersection = set(a) & set(b)
        numerator = sum(a[t] * b[t] for t in intersection)
        if numerator == 0:
            return 0.0
        denom_a = math.sqrt(sum(v * v for v in a.values()))
        denom_b = math.sqrt(sum(v * v for v in b.values()))
        if denom_a == 0.0 or denom_b == 0.0:
            return 0.0
        return numerator / (denom_a * denom_b)


# ── Singleton instance ────────────────────────────────────────────────────────

kb = PadelKnowledgeBase()
