class RingoError(Exception):
    """Base error for Ringo backend."""


class OllamaConnectionError(RingoError):
    """Ollama server unreachable or timed out."""


class OllamaParseError(RingoError):
    """LLM returned invalid or unparseable JSON."""
