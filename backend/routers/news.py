import json
from datetime import date
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user


router = APIRouter(prefix="/api/news", tags=["News"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_FILE = DATA_DIR / "news.json"


class NewsCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    date: str = Field(default_factory=lambda: date.today().isoformat(), max_length=20)
    category: str = Field(default="Campusleben", max_length=80)
    teaser: str = Field(min_length=1, max_length=600)
    body: str = Field(min_length=1)
    author: Optional[str] = Field(default="Campus-Portal Redaktion", max_length=80)


class NewsItem(NewsCreate):
    id: str
    score: int = 0
    comments: List[dict] = Field(default_factory=list)


def _seed_news() -> list[dict]:
    return [
        {
            "id": "campusfestival-2026-nachbericht",
            "title": "Bunte Lichter und laute Baesse: Das war das Campusfestival Mittweida 2026",
            "date": "2026-06-18",
            "category": "Campusleben / Events",
            "teaser": "Am 16. und 17. Juni 2026 verwandelte sich der Technikumplatz wieder in ein lebendiges Open-Air-Areal. Das von Studierenden der Fakultaet Medien organisierte Festival bot Live-Musik, Campus Cup und interaktive Angebote.",
            "body": "\n".join(
                [
                    "Am Dienstag und Mittwoch, dem 16. und 17. Juni, wurde es auf dem Technikumplatz laut. Medienmanagement-Studierende stellten das Event in enger Kooperation mit dem Studiengang Medientechnik auf die Beine.",
                    "Unter dem Motto \"Unsere Buehne ist eure Buehne\" war das Festival nicht nur fuer Studierende und Mitarbeitende der Hochschule, sondern auch fuer Buergerinnen und Buerger aus Mittweida und der Region geoeffnet.",
                    "An beiden Tagen lockten Live-Bands aus verschiedenen Genres, von Indie-Pop ueber Deutschrap bis Rock, die Besucherinnen und Besucher vor die Hauptbuehne. Zum Line-up gehoerten unter anderem Raptiloiden, Judi & Choco, Yeon, Power Plush, Annie Spectre und Remote Bondage.",
                    "Ein besonderer Hoehepunkt am ersten Festivaltag war der Campus Cup 2026. Kreative Studierende und Mitarbeitende der Hochschule Mittweida praesentierten ihre Talente live auf der grossen Buehne. Am Ende durfte das Publikum per Abstimmung entscheiden, wer den Titel \"Campus Champion\" mit nach Hause nehmen durfte.",
                    "In den Wochen vor dem Festival stimmten bereits Side-Events auf das Spektakel ein: Bei den Ausgaben des beliebten Musik-Quiz CF Music Clash im TV-Studio der Hochschule traten studentische Teams und internationale Gaeste gegeneinander an, um sich Freikarten zu erspielen.",
                    "Die Veranstalter zeigten sich mit dem Verlauf und der Resonanz der beiden Festivaltage zufrieden.",
                ]
            ),
            "author": "Campus-Portal Redaktion",
            "score": 42,
            "comments": [
                {
                    "author": "Redaktion",
                    "body": "Nachbericht zum Campusfestival 2026.",
                    "created_at": "2026-06-18",
                }
            ],
        }
    ]


def _load() -> list[dict]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        _save(_seed_news())
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save(news: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as file:
        json.dump(news, file, ensure_ascii=False, indent=2)
    tmp.replace(DATA_FILE)


def _sort_key(item: dict) -> tuple[str, int]:
    return (item.get("date", ""), int(item.get("score", 0)))


@router.get("/")
def list_news():
    return sorted(_load(), key=_sort_key, reverse=True)


@router.post("/")
def create_news(item: NewsCreate, user: str = Depends(get_current_user)):
    news = _load()
    new_item = NewsItem(
        id=f"{date.today().isoformat()}-{uuid4().hex[:8]}",
        title=item.title,
        date=item.date,
        category=item.category,
        teaser=item.teaser,
        body=item.body,
        author=item.author or user,
        score=1,
        comments=[],
    ).model_dump()
    news.append(new_item)
    _save(news)
    return new_item


@router.post("/{news_id}/vote")
def vote_news(news_id: str, direction: int = 1):
    if direction not in (-1, 1):
        raise HTTPException(status_code=400, detail="direction muss 1 oder -1 sein.")

    news = _load()
    for item in news:
        if item.get("id") == news_id:
            item["score"] = int(item.get("score", 0)) + direction
            _save(news)
            return item

    raise HTTPException(status_code=404, detail="News-Beitrag nicht gefunden.")
