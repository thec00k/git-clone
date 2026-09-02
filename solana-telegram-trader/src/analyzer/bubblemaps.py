"""Bubblemaps Data API client — same signals pump.fun embeds in its UI."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from src.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.bubblemaps.io"


@dataclass
class BubblemapsSnapshot:
    bubblemaps_score: float | None = None
    top10_adjusted_pct: float | None = None
    bundle_supply_pct: float | None = None
    fresh_wallet_pct: float | None = None
    nakamoto_coefficient: int | None = None
    largest_cluster_pct: float | None = None
    holder_count_top: int | None = None


async def fetch_bubblemaps_snapshot(mint: str) -> BubblemapsSnapshot | None:
    """
    Pull token metrics (+ optional clusters) for Solana mints.

    Requires BUBBLEMAPS_API_KEY from Bubblemaps Pro.
    Endpoints used (same data pump.fun visualizes via iframe):
      GET /v0/tokens/metrics/solana/{mint}
      GET /v0/tokens/map/solana/{mint}?return_clusters=true
    """
    if not settings.bubblemaps_api_key:
        return None

    headers = {"X-ApiKey": settings.bubblemaps_api_key}
    snapshot = BubblemapsSnapshot()

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            metrics_resp = await client.get(
                f"{BASE_URL}/v0/tokens/metrics/solana/{mint}",
                headers=headers,
            )
            if metrics_resp.status_code == 404:
                logger.info("Bubblemaps: no map yet for %s (too new or unsupported)", mint[:8])
                return None
            if metrics_resp.status_code != 200:
                logger.warning("Bubblemaps metrics HTTP %s for %s", metrics_resp.status_code, mint[:8])
                return None

            _apply_metrics(snapshot, metrics_resp.json())

            if settings.bubblemaps_fetch_clusters:
                map_resp = await client.get(
                    f"{BASE_URL}/v0/tokens/map/solana/{mint}",
                    headers=headers,
                    params={"return_clusters": "true", "return_nodes": "false", "return_relationships": "false"},
                )
                if map_resp.status_code == 200:
                    _apply_clusters(snapshot, map_resp.json())
    except httpx.HTTPError as exc:
        logger.warning("Bubblemaps request failed: %s", exc)
        return None

    return snapshot


def _apply_metrics(snapshot: BubblemapsSnapshot, payload: dict) -> None:
    scores = payload.get("scores") or {}
    supply = payload.get("supply_stats") or {}

    raw_score = scores.get("bubblemaps_score")
    if raw_score is not None:
        snapshot.bubblemaps_score = float(raw_score)

    nakamoto = scores.get("nakamoto_coefficient")
    if nakamoto is not None:
        snapshot.nakamoto_coefficient = int(nakamoto)

    # API returns shares in [0, 1]
    if supply.get("top_10_adjusted") is not None:
        snapshot.top10_adjusted_pct = float(supply["top_10_adjusted"]) * 100
    if supply.get("bundles") is not None:
        snapshot.bundle_supply_pct = float(supply["bundles"]) * 100
    if supply.get("fresh_wallets") is not None:
        snapshot.fresh_wallet_pct = float(supply["fresh_wallets"]) * 100


def _apply_clusters(snapshot: BubblemapsSnapshot, payload: dict) -> None:
    clusters = payload.get("clusters") or []
    if not clusters:
        return
    largest = max(clusters, key=lambda c: float(c.get("share") or 0))
    snapshot.largest_cluster_pct = float(largest.get("share") or 0) * 100
    snapshot.holder_count_top = sum(int(c.get("holder_count") or 0) for c in clusters)


def is_healthy_distribution(snapshot: BubblemapsSnapshot) -> bool:
    """
    Heuristic aligned with how traders read pump.fun Bubblemaps:
    high decentralization score, diluted top-10, low bundle share.
    """
    if snapshot.bubblemaps_score is None:
        return False
    if snapshot.bubblemaps_score < settings.bubblemaps_min_score:
        return False
    if snapshot.top10_adjusted_pct is not None and snapshot.top10_adjusted_pct > settings.bubblemaps_max_top10_pct:
        return False
    if snapshot.bundle_supply_pct is not None and snapshot.bundle_supply_pct > settings.bubblemaps_max_bundle_pct:
        return False
    return True
