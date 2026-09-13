"""Telegram group listener using Telethon user session."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from telethon import TelegramClient, events

from src.config import settings
from src.models import TokenSignal
from src.parser.token_parser import extract_mints

logger = logging.getLogger(__name__)

SignalHandler = Callable[[TokenSignal], Awaitable[None]]


class TelegramGroupListener:
    def __init__(self, on_signal: SignalHandler):
        self.on_signal = on_signal
        self.client = TelegramClient(
            settings.telegram_session_name,
            settings.telegram_api_id,
            settings.telegram_api_hash,
        )

    async def start(self) -> None:
        groups = settings.group_list()
        if not groups:
            raise RuntimeError("TELEGRAM_GROUP_IDS is empty")

        await self.client.start()
        logger.info("Telegram session started; watching %d groups", len(groups))

        @self.client.on(events.NewMessage(chats=groups))
        async def handler(event: events.NewMessage.Event) -> None:
            text = event.message.message or ""
            chat = await event.get_chat()
            chat_label = getattr(chat, "username", None) or str(event.chat_id)
            for mint in extract_mints(text):
                signal = TokenSignal(
                    mint=mint,
                    source_chat=str(chat_label),
                    source_message_id=event.message.id,
                    raw_text=text[:500],
                )
                await self.on_signal(signal)

        await self.client.run_until_disconnected()
