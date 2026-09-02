"""Risk-based position sizing: $10–$20, averaging ~$15.

Includes Bubblemaps / pump.fun distribution signals when available.
"""

from __future__ import annotations

from src.config import settings
from src.models import RiskAssessment, TokenMetrics


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def score_token(metrics: TokenMetrics) -> RiskAssessment:
    """Higher score = riskier. Maps score to buy size inversely."""
    score = 0.0
    reasons: list[str] = []

    holders = metrics.holder_count
    if holders is None:
        score += 25
        reasons.append("holder count unknown (+25)")
    elif holders < 50:
        score += 40
        reasons.append(f"very low holders ({holders}) (+40)")
    elif holders < 150:
        score += 25
        reasons.append(f"low holders ({holders}) (+25)")
    elif holders < 400:
        score += 12
        reasons.append(f"moderate holders ({holders}) (+12)")
    else:
        score += 4
        reasons.append(f"healthy holders ({holders}) (+4)")

    # Prefer Bubblemaps adjusted top-10 (cluster-aware) over raw top-10
    top10 = metrics.top10_adjusted_pct if metrics.top10_adjusted_pct is not None else metrics.top10_holder_pct
    if top10 is not None:
        if top10 > 70:
            score += 20
            reasons.append(f"top10 concentration {top10:.0f}% (+20)")
        elif top10 > 50:
            score += 10
            reasons.append(f"elevated top10 {top10:.0f}% (+10)")
        elif top10 < 35:
            score = max(0, score - 5)
            reasons.append(f"dispersed top10 {top10:.0f}% (-5)")

    if metrics.bundled_launch is True:
        score += 22
        reasons.append("bundled launch detected (+22)")
    elif metrics.bundle_supply_pct is not None:
        if metrics.bundle_supply_pct > settings.bubblemaps_max_bundle_pct:
            score += 22
            reasons.append(f"high Bubblemaps bundle supply {metrics.bundle_supply_pct:.0f}% (+22)")
        elif metrics.bundle_supply_pct > 20:
            score += 12
            reasons.append(f"moderate bundle supply {metrics.bundle_supply_pct:.0f}% (+12)")
        else:
            reasons.append(f"low bundle supply {metrics.bundle_supply_pct:.0f}%")
    elif metrics.bundled_launch is None:
        score += 8
        reasons.append("bundle status unknown (+8)")

    if metrics.largest_cluster_pct is not None and metrics.largest_cluster_pct > 25:
        penalty = 10 if metrics.largest_cluster_pct < 40 else 18
        score += penalty
        reasons.append(f"large related-wallet cluster {metrics.largest_cluster_pct:.0f}% (+{penalty})")

    if metrics.fresh_wallet_pct is not None and metrics.fresh_wallet_pct > 45:
        score += 10
        reasons.append(f"high fresh-wallet supply {metrics.fresh_wallet_pct:.0f}% (+10)")

    if metrics.bubblemaps_score is not None:
        # Invert: Bubblemaps high = healthy → reduce our risk score
        if metrics.bubblemaps_score >= 70:
            score = max(0, score - 15)
            reasons.append(f"strong Bubblemaps score {metrics.bubblemaps_score:.0f} (-15)")
        elif metrics.bubblemaps_score >= settings.bubblemaps_min_score:
            score = max(0, score - 6)
            reasons.append(f"ok Bubblemaps score {metrics.bubblemaps_score:.0f} (-6)")
        else:
            score += 18
            reasons.append(f"weak Bubblemaps score {metrics.bubblemaps_score:.0f} (+18)")
    elif settings.bubblemaps_api_key and settings.bubblemaps_required:
        score += 30
        reasons.append("Bubblemaps map missing and required (+30)")

    if metrics.nakamoto_coefficient is not None and metrics.nakamoto_coefficient <= 3:
        score += 12
        reasons.append(f"low nakamoto coefficient {metrics.nakamoto_coefficient} (+12)")

    if metrics.creator_rug_count > 0:
        rug_penalty = min(35, metrics.creator_rug_count * 15)
        score += rug_penalty
        reasons.append(f"creator linked to {metrics.creator_rug_count} rugged token(s) (+{rug_penalty})")

    if metrics.liquidity_usd is not None and metrics.liquidity_usd < 5_000:
        score += 15
        reasons.append(f"thin liquidity ${metrics.liquidity_usd:,.0f} (+15)")

    score = _clamp(score, 0, 100)

    normalized = score / 100
    span = settings.max_buy_usd - settings.min_buy_usd
    buy_usd = settings.max_buy_usd - (normalized * span)
    buy_usd = round(_clamp(buy_usd, settings.min_buy_usd, settings.max_buy_usd), 2)

    skip = False
    if score > settings.max_risk_score:
        skip = True
        reasons.append(f"SKIP: risk score {score:.0f} > max {settings.max_risk_score:.0f}")

    if metrics.bubblemaps_score is not None and metrics.bubblemaps_score < settings.bubblemaps_min_score:
        if settings.bubblemaps_required or metrics.bubblemaps_score < 25:
            skip = True
            reasons.append(
                f"SKIP: Bubblemaps score {metrics.bubblemaps_score:.0f} < min {settings.bubblemaps_min_score:.0f}"
            )

    return RiskAssessment(mint=metrics.mint, score=score, buy_usd=buy_usd, reasons=reasons, skip=skip)
