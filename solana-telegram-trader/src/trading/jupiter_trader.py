"""Jupiter swap execution with paper-trading support."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from src.config import settings

logger = logging.getLogger(__name__)

JUPITER_QUOTE = "https://quote-api.jup.ag/v6/quote"
JUPITER_SWAP = "https://quote-api.jup.ag/v6/swap"
WSOL = "So11111111111111111111111111111111111111112"


@dataclass
class SwapResult:
    mint: str
    side: str  # buy | sell
    usd_notional: float
    token_amount: float
    price_usd: float
    signature: str | None
    paper: bool


class JupiterTrader:
    def __init__(self, sol_price_usd: float = 150.0):
        self.sol_price_usd = sol_price_usd

    async def buy_usd(self, mint: str, usd_amount: float) -> SwapResult:
        lamports = int((usd_amount / self.sol_price_usd) * 1_000_000_000)
        if settings.paper_trading:
            price = await self._estimate_price(mint)
            tokens = usd_amount / price if price > 0 else 0
            logger.info("PAPER BUY %s $%.2f (~%.4f tokens)", mint[:8], usd_amount, tokens)
            return SwapResult(mint, "buy", usd_amount, tokens, price, None, True)

        quote = await self._quote(WSOL, mint, lamports)
        out_amount = int(quote.get("outAmount", 0))
        decimals = quote.get("outputMintDecimals", 6)
        tokens = out_amount / (10**decimals)
        price = usd_amount / tokens if tokens else 0
        signature = await self._swap(quote)
        return SwapResult(mint, "buy", usd_amount, tokens, price, signature, False)

    async def sell_tokens(self, mint: str, token_amount: float, decimals: int = 6) -> SwapResult:
        raw = int(token_amount * (10**decimals))
        if settings.paper_trading:
            price = await self._estimate_price(mint)
            usd = token_amount * price
            logger.info("PAPER SELL %s %.4f tokens ($%.2f)", mint[:8], token_amount, usd)
            return SwapResult(mint, "sell", usd, token_amount, price, None, True)

        quote = await self._quote(mint, WSOL, raw)
        out_lamports = int(quote.get("outAmount", 0))
        usd = (out_lamports / 1_000_000_000) * self.sol_price_usd
        price = usd / token_amount if token_amount else 0
        signature = await self._swap(quote)
        return SwapResult(mint, "sell", usd, token_amount, price, signature, False)

    async def _quote(self, input_mint: str, output_mint: str, amount: int) -> dict:
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": "300",
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(JUPITER_QUOTE, params=params)
            resp.raise_for_status()
            return resp.json()

    async def _swap(self, quote: dict) -> str:
        if not settings.wallet_private_key:
            raise RuntimeError("WALLET_PRIVATE_KEY required for live trading")

        payload = {
            "quoteResponse": quote,
            "userPublicKey": "<wallet_pubkey_from_keypair>",
            "wrapAndUnwrapSol": True,
            "dynamicComputeUnitLimit": True,
            "prioritizationFeeLamports": "auto",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(JUPITER_SWAP, json=payload)
            resp.raise_for_status()
            # Production: deserialize, sign with solders keypair, broadcast
            data = resp.json()
            return data.get("swapTransaction", "unsigned")

    async def _estimate_price(self, mint: str) -> float:
        try:
            quote = await self._quote(WSOL, mint, 10_000_000)  # 0.01 SOL
            out = int(quote.get("outAmount", 0))
            if out <= 0:
                return 0.0001
            sol_in = 0.01
            tokens = out / 1_000_000
            return (sol_in * self.sol_price_usd) / tokens
        except Exception:
            return 0.0001
