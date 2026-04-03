from typing import Any

import httpx

from app.core.config import settings


class LLMService:
    def __init__(self) -> None:
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL.rstrip("/")
        self.model = settings.OPENROUTER_MODEL

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def generate_coaching_response(
        self, prompt: str, system_prompt: str | None = None
    ) -> str:
        if not self.is_configured:
            return (
                "OpenRouter is not configured yet. I can still outline a safe "
                "fitness recommendation from your profile and uploaded knowledge base, "
                "but you should add `OPENROUTER_API_KEY` for full AI responses."
            )

        resolved_system_prompt = system_prompt or (
            "You are an evidence-based AI fitness coach. Give practical, "
            "safe guidance, avoid medical claims, and structure advice "
            "clearly with workout, nutrition, and recovery suggestions."
        )

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": resolved_system_prompt,
                },
                {"role": "user", "content": prompt},
            ],
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.OPENROUTER_APP_URL,
            "X-Title": settings.OPENROUTER_APP_NAME,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions", headers=headers, json=payload
                )
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status in (401, 403):
                    return (
                        "The AI provider rejected the request. Please verify the "
                        "`OPENROUTER_API_KEY` and try again."
                    )
                return (
                    "The AI provider returned an error while generating a response. "
                    "Please try again in a moment."
                )
            except httpx.RequestError:
                return (
                    "The AI provider is unavailable right now. Please try again "
                    "in a moment."
                )

        return (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "I could not generate a response.")
        )
