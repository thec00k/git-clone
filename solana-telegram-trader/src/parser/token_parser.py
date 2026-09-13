"""Extract Solana mint addresses and pump.fun links from Telegram text."""

from __future__ import annotations

import re

# Base58 Solana pubkey, 32-44 chars, no 0/O/I/l
SOL_MINT_RE = re.compile(r"\b[1-9A-HJ-NP-Za-km-z]{32,44}\b")
PUMP_FUN_RE = re.compile(r"pump\.fun(?:/coin)?/([1-9A-HJ-NP-Za-km-z]{32,44})", re.I)

# Common false positives to ignore
IGNORE = {
    "So11111111111111111111111111111111111111112",  # wSOL
    "11111111111111111111111111111111",
}


def extract_mints(text: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()

    for match in PUMP_FUN_RE.finditer(text):
        mint = match.group(1)
        if mint not in IGNORE and mint not in seen:
            seen.add(mint)
            found.append(mint)

    for match in SOL_MINT_RE.finditer(text):
        mint = match.group(0)
        if mint.endswith("pump") or mint not in IGNORE:
            if mint not in seen and len(mint) >= 32:
                seen.add(mint)
                found.append(mint)

    return found
