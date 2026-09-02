"""Risk-based position sizing: $10–$20, averaging ~$15."""

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

    if metrics.top10_holder_pct is not None:
        if metrics.top10_holder_pct > 70:
            score += 20
            reasons.append(f"top10 concentration {metrics.top10_holder_pct:.0f}% (+20)")
        elif metrics.top10_holder_pct > 50:
            score += 10
            reasons.append(f"elevated top10 {metrics.top10_holder_pct:.0f}% (+10)")

    if metrics.bundled_launch is True:
        score += 22
        reasons.append("bundled launch detected (+22)")
    elif metrics.bundled_launch is None:
        score += 8
        reasons.append("bundle status unknown (+8)")

    if metrics.creator_rug_count > 0:
        rug_penalty = min(35, metrics.creator_rug_count * 15)
        score += rug_penalty
        reasons.append(f"creator linked to {metrics.creator_rug_count} rugged token(s) (+{rug_penalty})")

    if metrics.liquidity_usd is not None and metrics.liquidity_usd < 5_000:
        score += 15
        reasons.append(f"thin liquidity ${metrics.liquidity_usd:,.0f} (+15)")

    score = _clamp(score, 0, 100)

    # Invert risk to size: low risk → closer to max_buy, high risk → min_buy
    normalized = score / 100
    span = settings.max_buy_usd - settings.min_buy_usd
    buy_usd = settings.max_buy_usd - (normalized * span)
    buy_usd = round(_clamp(buy_usd, settings.min_buy_usd, settings.max_buy_usd), 2)

    skip = score > settings.max_risk_score
    if skip:
        reasons.append(f"SKIP: risk score {score:.0f} > max {settings.max_risk_score:.0f}")

    return RiskAssessment(mint=metrics.mint, score=score, buy_usd=buy_usd, reasons=reasons, skip=skip)
