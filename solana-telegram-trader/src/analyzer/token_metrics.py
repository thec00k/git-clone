"""Fetch on-chain / API metrics for risk scoring."""

from __future__ import annotations

import httpx

from src.config import settings
from src.models import TokenMetrics


async def fetch_token_metrics(mint: str) -> TokenMetrics:
    """
    Best-effort enrichment. Returns partial metrics when APIs are unavailable.
    Plug in Helius DAS / Birdeye / your indexer for production.
    """
    metrics = TokenMetrics(mint=mint)

    if settings.birdeye_api_key:
        metrics = await _birdeye_enrich(metrics)

    if settings.helius_api_key:
        metrics = await _helius_holder_count(metrics)

    return metrics


async def _birdeye_enrich(metrics: TokenMetrics) -> TokenMetrics:
    url = f"https://public-api.birdeye.so/defi/token_overview?address={metrics.mint}"
    headers = {"X-API-KEY": settings.birdeye_api_key, "x-chain": "solana"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return metrics
            data = resp.json().get("data") or {}
            metrics.holder_count = data.get("holder")
            metrics.liquidity_usd = data.get("liquidity")
            if data.get("creator"):
                metrics.creator_wallet = data["creator"]
    except httpx.HTTPError:
        pass
    return metrics


async def _helius_holder_count(metrics: TokenMetrics) -> TokenMetrics:
    if metrics.holder_count is not None:
        return metrics
    url = f"https://mainnet.helius-rpc.com/?api-key={settings.helius_api_key}"
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTokenAccounts",
        "params": {"mint": metrics.mint, "limit": 1000},
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                return metrics
            result = resp.json().get("result") or {}
            total = result.get("total")
            if total is not None:
                metrics.holder_count = int(total)
    except httpx.HTTPError:
        pass
    return metrics


def apply_creator_rug_heuristic(metrics: TokenMetrics, rugged_mints_by_creator: dict[str, set[str]]) -> TokenMetrics:
    """Mark creator rug history when creator wallet is known."""
    if not metrics.creator_wallet:
        return metrics
    rugs = rugged_mints_by_creator.get(metrics.creator_wallet, set())
    metrics.creator_rug_count = len(rugs)
    metrics.creator_token_count = len(rugs)  # extend with full launch history in prod
    return metrics


def detect_bundled_launch(first_buyers_same_slot: int, threshold: int = 4) -> bool:
    """True when many buys land same slot as create — typical bundle/snipe pattern."""
    return first_buyers_same_slot >= threshold
