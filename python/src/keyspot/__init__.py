from .scanner import Scanner, Match
from .taint import TaintEngine
from .vault import BaseVaultAdapter, InMemoryVaultAdapter
from .security import PromptShield, AuditLogger
from .core import KeySpot

__all__ = [
    "Scanner", "Match",
    "TaintEngine",
    "BaseVaultAdapter", "InMemoryVaultAdapter",
    "PromptShield", "AuditLogger",
    "KeySpot",
]

import warnings
warnings.warn(
    "KeySpot Python SDK is experimental. "
    "Not full TypeScript parity until the golden-vector parity gate passes. "
    "Do not use in production.",
    UserWarning,
    stacklevel=2,
)
