from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from datetime import datetime, timezone

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO(app, cors_allowed_origins="*")

USERS = {}
USERNAMES = {}


@app.get("/")
def index():
    return render_template("index.html")


@socketio.on("set_username")
def set_username(data):
    sid = request.sid
    username = (data or {}).get("username", "").strip() or f"user-{sid[:5]}"
    USERS[sid] = username
    USERNAMES[username] = sid
    now = datetime.now(timezone.utc).isoformat()
    emit("system", {"text": f"{username} a rejoint", "ts": now}, broadcast=True)
    emit(
        "presence",
        {"online": len(USERS), "users": list(USERNAMES.keys())},
        broadcast=True,
    )


@socketio.on("send_message")
def send_message(data):
    sid = request.sid
    username = USERS.get(sid)
    if not username:
        return
    text = (data or {}).get("text", "").strip()
    if not text:
        return

    now = datetime.now(timezone.utc).isoformat()

    if text.startswith("/w "):
        parts = text.split(" ", 2)
        if len(parts) < 3:
            emit(
                "system", {"text": "⚠️ Usage: /w <pseudo> <message>", "ts": now}, to=sid
            )
            return
        target, msg = parts[1], parts[2]
        target_sid = USERNAMES.get(target)
        if not target_sid:
            emit(
                "system",
                {"text": f"⚠️ Utilisateur {target} introuvable", "ts": now},
                to=sid,
            )
            return
        emit(
            "private", {"from": username, "to": target, "text": msg, "ts": now}, to=sid
        )
        emit(
            "private",
            {"from": username, "to": target, "text": msg, "ts": now},
            to=target_sid,
        )
    else:
        emit("message", {"user": username, "text": text, "ts": now}, broadcast=True)


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    username = USERS.pop(sid, None)
    if username:
        USERNAMES.pop(username, None)
        now = datetime.now(timezone.utc).isoformat()
        emit("system", {"text": f"{username} a quitté", "ts": now}, broadcast=True)
    emit(
        "presence",
        {"online": len(USERS), "users": list(USERNAMES.keys())},
        broadcast=True,
    )


if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=5000, debug=True)
