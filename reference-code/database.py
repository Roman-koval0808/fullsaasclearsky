"""
ClearSky AI Decision System
Database Connection
===================
PostgreSQL connection pool using asyncpg.

The pool is initialized in main.py on app startup and shared
across all requests. Each request acquires a connection from
the pool and releases it when done.

Usage in routes:
    async with _pool.acquire() as db:
        row = await db.fetchrow("SELECT ...")

Usage in engine sections (called from runner):
    # Connection is passed in from the route handler
    async def process_raw_input(raw_payload, db, ...):
        await db.execute("INSERT INTO ...")
"""

from __future__ import annotations

import os
import logging

import asyncpg

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Return the active connection pool."""
    global _pool
    if _pool is None:
        raise RuntimeError(
            "Database pool not initialized. "
            "Pool is created in main.py lifespan on app startup."
        )
    return _pool


async def init_db() -> asyncpg.Pool:
    """
    Initialize the database connection pool.
    Called once on app startup from main.py lifespan.
    """
    global _pool
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Copy .env.example to .env and fill in your database URL."
        )
    _pool = await asyncpg.create_pool(
        database_url,
        min_size=2,
        max_size=10,
    )
    logger.info("Database pool initialized.")
    return _pool
