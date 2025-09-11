from flask import Flask, Response, render_template, request
import json
import time
import random
import finnhub
import os
from dotenv import load_dotenv

load_dotenv()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

finnhub_client = finnhub.Client(api_key=FINNHUB_API_KEY)

app = Flask(__name__)

stock_prices = {
    "AAPL": 170.00,
    "GOOG": 1500.00,
    "MSFT": 250.00,
    "AMZN": 130.00,
    "PXI": 7800.00,
}


def generate_stock_update():
    """Generates a random change of a stock price."""
    symbol = random.choice(list(stock_prices.keys()))
    current_price = stock_prices[symbol]

    change_percent = random.uniform(-0.5, 0.5) / 100
    new_price = round(current_price * (1 + change_percent), 2)

    stock_prices[symbol] = new_price

    change_percent = round(change_percent * 100, 3)

    return {
        "symbol": symbol,
        "price": new_price,
        "change": round(new_price - current_price, 2),
        "change_percent": change_percent,
    }


def generate_market_update():
    """Queries finnhub api to get last hour news."""
    market_news = finnhub_client.general_news("general", min_id=60)

    return market_news


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/market_updates")
def stream_market_data():
    def event_stream(last_id):
        update_id = last_id
        while True:
            update_id += 1
            stock_data = generate_stock_update()
            yield f"id: {update_id}\ndata: {json.dumps(stock_data)}\n\n"

            time.sleep(2)

    last_id = request.headers.get("Last-Event-ID")
    try:
        last_id = int(last_id) if last_id else 0
    except ValueError:
        last_id = 0

    return Response(
        event_stream(last_id),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/market_news")
def stream_market_news():
    def event_stream(last_id):
        update_id = last_id
        while True:
            update_id += 1
            news_list = generate_market_update()
            for news in news_list[:3]:
                yield f"id: {update_id}\ndata: {json.dumps(news)}\n\n"
                time.sleep(5)

    last_id = request.headers.get("Last-Event-ID")
    try:
        last_id = int(last_id) if last_id else 0
    except ValueError:
        last_id = 0

    return Response(
        event_stream(last_id),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
