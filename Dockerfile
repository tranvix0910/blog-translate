FROM python:3.15.0a2-alpine3.22

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

CMD ["python", "app.py"]

