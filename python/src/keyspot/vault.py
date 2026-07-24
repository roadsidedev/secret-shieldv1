import hashlib
import hmac
import secrets
import time
from typing import Optional, List, Dict


class VaultWriteOptions:
    def __init__(self, ttl: Optional[int] = None,
                 visible_to: Optional[List[str]] = None,
                 tags: Optional[Dict[str, str]] = None,
                 rotation_hook=None):
        self.ttl = ttl
        self.visible_to = visible_to
        self.tags = tags or {}
        self.rotation_hook = rotation_hook


class BaseVaultAdapter:
    def __init__(self, secret_key: Optional[str] = None):
        self._secret_key = secret_key or secrets.token_hex(32)

    async def write(self, secret: str, options: Optional[VaultWriteOptions] = None) -> str:
        raise NotImplementedError

    async def read(self, id: str, agent_id: Optional[str] = None) -> Optional[str]:
        raise NotImplementedError

    async def list(self) -> List[str]:
        raise NotImplementedError

    async def delete(self, id: str) -> bool:
        raise NotImplementedError

    def is_in_memory(self) -> bool:
        return False

    def generate_ref(self, id: str, secret: str = "", ttl: int = 3600000) -> str:
        expiry = int(time.time() * 1000) + ttl
        msg = f"{id}:{expiry}".encode("utf-8")
        sig = hmac.new(self._secret_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        return f"vault:v1:{id}:{sig}:{expiry}"

    def verify_ref(self, ref: str) -> bool:
        """Always verify HMAC with the vault master key. Never skip verification."""
        parts = ref.split(":")
        if len(parts) != 5 or parts[0] != "vault" or parts[1] != "v1":
            return False
        try:
            expiry = int(parts[4])
        except ValueError:
            return False
        if expiry < int(time.time() * 1000):
            return False
        msg = f"{parts[2]}:{expiry}".encode("utf-8")
        expected = hmac.new(self._secret_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        return hmac.compare_digest(parts[3], expected)


class InMemoryVaultAdapter(BaseVaultAdapter):
    def __init__(self, secret_key: Optional[str] = None):
        super().__init__(secret_key)
        self._store: Dict[str, dict] = {}

    def is_in_memory(self) -> bool:
        return True

    async def write(self, secret: str, options: Optional[VaultWriteOptions] = None) -> str:
        id = f"vault_{secrets.token_hex(8)}"
        self._store[id] = {
            "value": secret,
            "options": options,
            "created_at": int(time.time() * 1000),
        }
        return id

    async def read(self, id: str, agent_id: Optional[str] = None) -> Optional[str]:
        entry = self._store.get(id)
        if not entry:
            return None
        opts = entry.get("options")
        if opts and opts.ttl and entry["created_at"] + opts.ttl < int(time.time() * 1000):
            del self._store[id]
            return None
        # Fail-closed ACL
        if opts and opts.visible_to:
            if not agent_id or agent_id not in opts.visible_to:
                return None
        return entry["value"]

    async def list(self) -> List[str]:
        return list(self._store.keys())

    async def delete(self, id: str) -> bool:
        if id in self._store:
            del self._store[id]
            return True
        return False
