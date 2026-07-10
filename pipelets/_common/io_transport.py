"""Shared stdin/stdout and RabbitMQ I/O for pipelet Jobs.

Env contract (injected by the platform orchestrator):

  IO_MODE       stdio | queue   (default: queue)
  INPUT_QUEUE   stage input queue name
  OUTPUT_QUEUE  next stage input (empty on last stage)
  AMQP_URL      amqp://user:pass@host:port/
  SOURCE_TRIGGER  once = sources skip waiting for a kickoff message
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from config_merge import log, read_stdin_json, write_stdout_json

IO_STDIO = "stdio"
IO_QUEUE = "queue"
DEFAULT_IO_MODE = IO_QUEUE


def resolve_io_mode() -> str:
    raw = (os.environ.get("IO_MODE") or DEFAULT_IO_MODE).strip().lower()
    if raw in (IO_STDIO, IO_QUEUE):
        return raw
    return DEFAULT_IO_MODE


def is_stdio() -> bool:
    return resolve_io_mode() == IO_STDIO


def is_queue() -> bool:
    return resolve_io_mode() == IO_QUEUE


def _amqp_url() -> str:
    url = (os.environ.get("AMQP_URL") or "").strip()
    if not url:
        raise SystemExit("AMQP_URL is required when IO_MODE=queue")
    return url


def _input_queue() -> str:
    name = (os.environ.get("INPUT_QUEUE") or "").strip()
    if not name:
        raise SystemExit("INPUT_QUEUE is required when IO_MODE=queue")
    return name


def _output_queue() -> str | None:
    name = (os.environ.get("OUTPUT_QUEUE") or "").strip()
    return name or None


def _connect():
    try:
        import pika  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(
            "pika is required for IO_MODE=queue; install pika in the pipelet image"
        ) from exc
    params = pika.URLParameters(_amqp_url())
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    return pika, connection, channel


def _consume_one(timeout_seconds: float = 60.0) -> dict[str, Any]:
    pika, connection, channel = _connect()
    queue = _input_queue()
    # Topology is declared by the platform (with DLX). Passive assert only.
    channel.queue_declare(queue=queue, durable=True, passive=True)
    log(f"queue consume waiting queue={queue} timeout={timeout_seconds}s")
    try:
        for method, _properties, body in channel.consume(
            queue, inactivity_timeout=timeout_seconds
        ):
            if method is None:
                raise SystemExit(
                    f"Timed out waiting for message on INPUT_QUEUE={queue}"
                )
            channel.basic_ack(method.delivery_tag)
            channel.cancel()
            raw = body.decode("utf-8") if isinstance(body, (bytes, bytearray)) else str(body)
            if not raw.strip():
                return {}
            value = json.loads(raw, strict=False)
            if not isinstance(value, dict):
                raise SystemExit("queue message must be a JSON object")
            return value
    finally:
        try:
            connection.close()
        except Exception:  # pragma: no cover
            pass
    raise SystemExit(f"No message received on INPUT_QUEUE={queue}")


def _publish(payload: dict[str, Any]) -> None:
    queue = _output_queue()
    if not queue:
        log("queue publish skipped (no OUTPUT_QUEUE — last stage)")
        return
    _pika, connection, channel = _connect()
    try:
        # Do not redeclare — platform queues include x-dead-letter-exchange.
        channel.queue_declare(queue=queue, durable=True, passive=True)
        body = json.dumps(payload).encode("utf-8")
        channel.basic_publish(
            exchange="",
            routing_key=queue,
            body=body,
            properties=_pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
            ),
        )
        log(f"queue published bytes={len(body)} queue={queue}")
    finally:
        try:
            connection.close()
        except Exception:  # pragma: no cover
            pass


def read_message(*, source: bool = False) -> dict[str, Any]:
    """Read one JSON message from stdin (stdio) or INPUT_QUEUE (queue).

    Sources in queue mode wait for a kickoff unless SOURCE_TRIGGER=once.
    Sources in stdio mode return {} without reading stdin.
    """
    if is_stdio():
        if source:
            return {}
        return read_stdin_json()

    if source and (os.environ.get("SOURCE_TRIGGER") or "").strip().lower() == "once":
        log("SOURCE_TRIGGER=once — skipping kickoff consume")
        return {}

    return _consume_one()


def write_message(payload: dict[str, Any]) -> None:
    """Write one JSON message to stdout (stdio) or OUTPUT_QUEUE (queue)."""
    if is_stdio():
        write_stdout_json(payload)
        return
    _publish(payload)
