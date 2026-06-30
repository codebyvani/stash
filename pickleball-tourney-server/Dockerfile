FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY server.py .

# Mount a volume here in your deploy config (Fly: [[mounts]] destination = "/data")
ENV DB_PATH=/data/tournament.db
ENV PORT=8080
EXPOSE 8080

CMD ["gunicorn", "server:app", "--bind", "0.0.0.0:8080", "--workers", "2"]
