import os
import sqlite3
from time import monotonic
from threading import Condition, RLock
from flask import Flask, request, jsonify, abort, render_template
from datetime import datetime

DB_PATH = os.environ.get("LP_DB", "longpoll.db")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "secret")
POLL_TIMEOUT = 25

app = Flask(__name__)
_LOCK = RLock()
_CONDS = {}
_STATE = {}


def _conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    with _conn() as c:
        c.executescript(
            """
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS tasks(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS statuses(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          value TEXT NOT NULL,
          version INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(task_id) REFERENCES tasks(id)
        );
        """
        )
        cur = c.execute("SELECT COUNT(*) AS n FROM tasks")
        if cur.fetchone()["n"] == 0:
            c.execute("INSERT INTO tasks(name) VALUES (?)", ("Tâche démo",))
            task_id = c.execute("SELECT id FROM tasks LIMIT 1").fetchone()["id"]
            c.execute(
                "INSERT INTO statuses(task_id,value,version) VALUES (?,?,?)",
                (task_id, "En attente", 0),
            )
    _warm_cache()


def _warm_cache():
    with _conn() as c, _LOCK:
        rows = c.execute(
            """
          SELECT t.id, t.name,
                 (SELECT value FROM statuses s WHERE s.task_id=t.id ORDER BY version DESC LIMIT 1) AS value,
                 (SELECT version FROM statuses s WHERE s.task_id=t.id ORDER BY version DESC LIMIT 1) AS version,
                 (SELECT created_at FROM statuses s WHERE s.task_id=t.id ORDER BY version DESC LIMIT 1) AS updated_at
          FROM tasks t
        """
        ).fetchall()
        _STATE.clear()
        for r in rows:
            _STATE[r["id"]] = {
                "value": r["value"],
                "version": r["version"] or 0,
                "updated_at": r["updated_at"],
                "name": r["name"],
            }
            if r["id"] not in _CONDS:
                _CONDS[r["id"]] = Condition()


def _require_task(task_id: int):
    with _conn() as c:
        task = c.execute("SELECT id,name FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not task:
            abort(404, description="task not found")
        return task


def _auth():
    h = request.headers.get("Authorization", "")
    if not h.startswith("Bearer "):
        abort(401, description="missing bearer token")
    tok = h.split(" ", 1)[1].strip()
    if tok != ADMIN_TOKEN:
        abort(403, description="invalid token")


@app.after_request
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Expose-Headers"] = "Content-Type"
    return resp


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    pwd = data.get("password", "")
    if pwd == ADMIN_TOKEN:
        return jsonify({"token": ADMIN_TOKEN})
    abort(403, description="invalid credentials")


@app.route("/tasks", methods=["GET"])
def list_tasks():
    with _conn() as c:
        rows = c.execute("SELECT id,name,created_at FROM tasks ORDER BY id").fetchall()
        out = []
        for r in rows:
            st = _STATE.get(r["id"])
            out.append(
                {
                    "id": r["id"],
                    "name": r["name"],
                    "created_at": r["created_at"],
                    "status": st["value"] if st else None,
                    "version": st["version"] if st else 0,
                    "updated_at": st["updated_at"] if st else None,
                }
            )
        return jsonify(out)


@app.route("/tasks", methods=["POST"])
def create_task():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        abort(400, description="name required")
    with _conn() as c, _LOCK:
        c.execute("INSERT INTO tasks(name) VALUES (?)", (name,))
        task_id = c.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
        c.execute(
            "INSERT INTO statuses(task_id,value,version) VALUES (?,?,?)",
            (task_id, "En attente", 0),
        )
        _STATE[task_id] = {
            "value": "En attente",
            "version": 0,
            "updated_at": datetime.utcnow().isoformat(),
            "name": name,
        }
        _CONDS[task_id] = Condition()
        return jsonify({"id": task_id, "name": name}), 201


@app.route("/tasks/<int:task_id>/status", methods=["POST"])
def update_status(task_id: int):
    _auth()
    _require_task(task_id)
    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()
    if not new_status:
        abort(400, description="status required")
    with _conn() as c, _LOCK:
        cur = c.execute(
            "SELECT COALESCE(MAX(version),0) AS v FROM statuses WHERE task_id=?",
            (task_id,),
        ).fetchone()
        version = (cur["v"] or 0) + 1
        c.execute(
            "INSERT INTO statuses(task_id,value,version) VALUES (?,?,?)",
            (task_id, new_status, version),
        )
        updated_at = c.execute(
            "SELECT created_at FROM statuses WHERE task_id=? AND version=?",
            (task_id, version),
        ).fetchone()["created_at"]
        _STATE[task_id] = {
            "value": new_status,
            "version": version,
            "updated_at": updated_at,
            "name": _STATE[task_id]["name"],
        }
        with _CONDS[task_id]:
            _CONDS[task_id].notify_all()
        return jsonify(
            {
                "task_id": task_id,
                "value": new_status,
                "version": version,
                "updated_at": updated_at,
            }
        )


@app.route("/tasks/<int:task_id>/status", methods=["GET"])
def poll_status(task_id: int):
    _require_task(task_id)
    try:
        last_version = int(request.args.get("last_version", "-1"))
    except ValueError:
        abort(400, description="last_version must be int")
    deadline = monotonic() + POLL_TIMEOUT
    cond = _CONDS[task_id]
    with cond:
        if last_version < _STATE[task_id]["version"]:
            return jsonify(_STATE[task_id])
        while monotonic() < deadline and last_version >= _STATE[task_id]["version"]:
            remaining = deadline - monotonic()
            if remaining <= 0:
                break
            cond.wait(timeout=remaining)
        if last_version < _STATE[task_id]["version"]:
            return jsonify(_STATE[task_id])
    return ("", 204)


@app.route("/tasks/<int:task_id>/history", methods=["GET"])
def history(task_id: int):
    _require_task(task_id)
    try:
        limit = int(request.args.get("limit", "50"))
    except ValueError:
        abort(400, description="limit must be int")
    with _conn() as c:
        rows = c.execute(
            """
          SELECT value, version, created_at
          FROM statuses
          WHERE task_id=?
          ORDER BY version DESC
          LIMIT ?
        """,
            (task_id, limit),
        ).fetchall()
        return jsonify(
            [
                {
                    "value": r["value"],
                    "version": r["version"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ]
        )


@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(500)
def _errors(e):
    return jsonify({"error": getattr(e, "description", str(e))}), getattr(
        e, "code", 500
    )


if __name__ == "__main__":
    _init_db()
    app.run(host="127.0.0.1", port=5000)
