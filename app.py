from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    Response,
)
import os
import json
import random
import uuid
import time

app = Flask(__name__)
app.secret_key = os.urandom(24)

answers = {}
show_answers = False
lock_answers = False
current_turn = -1
player_turn = None


@app.route("/", methods=["GET", "POST"])
def index():
    # Generate a unique client_id if not already present in session
    session.setdefault("client_id", str(uuid.uuid4()))
    client_id = session["client_id"]
    if client_id not in answers:
        answers[client_id] = {
            "name": None,
            "answer": None,
            "score": 0,
            "active": True,
            "turn": 0,
        }

    if request.method == "POST":
        global lock_answers
        if lock_answers:
            return redirect(url_for("index"))
        name = request.form.get("name")  # Get the name from the form
        answer = request.form.get("answer")
        if answer:
            answers[client_id]["answer"] = answer
        if name:
            answers[client_id]["name"] = name
            answers[client_id]["turn"] = (
                max(i["turn"] for i in answers.values() if i["name"]) + 1
            )

        return redirect(url_for("index"))
    return render_template(
        "index.html",
        current_answer=answers[client_id]["answer"],
        current_name=answers[client_id]["name"],
    )


@app.route("/game")
def game():
    players_ = [i for i in answers.values() if i["name"]]
    ordered_players = sorted(players_, key=lambda p: (-p["active"], -p["score"]))
    answers_ = [i for i in answers.values() if i["answer"] and i["name"]]
    ordered_answers = sorted(answers_, key=lambda a: (-a["active"], a["answer"]))
    return render_template(
        "manage.html",
        answers=ordered_answers,
        players=ordered_players,
        total_players=len(players_),
        total_answers=len(answers_),
        show_answers=show_answers,
        lock_answers=lock_answers,
        player_turn=player_turn,
    )


@app.route("/edit_players", methods=["GET", "POST"])
def edit_players():
    players = [player for player in answers.values() if player["name"]]
    if request.method == "POST":
        for player in players:
            new_name = request.form.get(f"new_{player['name']}")
            new_turn = request.form.get(f"new_turn_{player['name']}")
            player["name"] = new_name
            player["turn"] = int(new_turn)
        return redirect(url_for("edit_players"))
    return render_template("edit_players.html", players=players)


@app.route("/delete_player", methods=["POST"])
def delete_player():
    player_name = request.args.get("player_name")
    for player in answers.values():
        if player["name"] == player_name:
            player["name"] = None
            player["answer"] = None
    # Redirect to the page where the form is located, or to any other appropriate page
    return redirect(url_for("edit_players"))


@app.route("/clear")
def clear():
    for player in answers.values():
        player["active"] = True
        player["answer"] = None
    global lock_answers
    lock_answers = False
    global show_answers
    show_answers = False
    return redirect(url_for("game"))


@app.route("/toggle_lock")
def toggle_lock():
    global lock_answers
    lock_answers = not lock_answers
    global show_answers
    show_answers = lock_answers

    return redirect(url_for("game"))


@app.route("/next")
def next():
    global current_turn
    player_order = sorted(
        [i for i in answers.values() if i["name"]], key=lambda p: p["turn"]
    )
    if not any([i["active"] for i in player_order]):
        return redirect(url_for("game"))
    current_turn += 1
    if current_turn >= len(player_order):
        current_turn = 0
    while not player_order[current_turn]["active"]:
        current_turn += 1
        if current_turn >= len(player_order):
            current_turn = 0
    global player_turn
    player_turn = player_order[current_turn]["name"]
    return redirect(url_for("game"))


@app.route("/increase_score", methods=["POST"])
def increase_score():
    player_name = request.args.get("player_name")
    for player in answers.values():
        if player["name"] == player_name:
            player["score"] += 1
            break
    return redirect(url_for("game"))


@app.route("/decrease_score", methods=["POST"])
def decrease_score():
    player_name = request.args.get("player_name")
    for player in answers.values():
        if player["name"] == player_name:
            player["score"] -= 1
            break
    return redirect(url_for("game"))


@app.route("/toggle_active", methods=["POST"])
def toggle_active():
    player_name = request.args.get("player_name")
    for player in answers.values():
        if player["name"] == player_name:
            player["active"] = not player["active"]
            point = not player["active"]
    if point:
        for player in answers.values():
            if player["name"] == player_turn:
                player["score"] += 1
    return redirect(url_for("game"))


@app.route("/toggle_answer", methods=["POST"])
def toggle_answer():
    answer_name = request.args.get("answer_name")
    for answer in answers.values():
        if answer["answer"] == answer_name:
            answer["active"] = not answer["active"]
            point = not answer["active"]
    if point:
        for player in answers.values():
            if player["name"] == player_turn:
                player["score"] += 1
    return redirect(url_for("game"))


@app.route("/total_answers_stream")
def total_answers_stream():
    def stream():
        while True:
            players = [i for i in answers.values() if i["name"]]
            total_answers = len(
                [i for i in answers.values() if i["answer"] and i["name"]]
            )

            data = {
                "total_players": len(players),
                "total_answers": total_answers,
                # "all_players": players,
            }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(1)

    return Response(stream(), mimetype="text/event-stream")


@app.route("/session_answers_stream")
def session_answers_stream():
    session.setdefault("client_id", str(uuid.uuid4()))
    client_id = session["client_id"]

    def stream():
        if client_id not in answers:
            return
        while True:
            data = answers[client_id]["answer"]
            yield f"data: {data}\n\n"
            time.sleep(1)

    return Response(stream(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=False)
