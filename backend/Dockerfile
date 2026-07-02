FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AVARENO_ENV=production \
    AVARENO_DB_PATH=/data/avareno.db \
    AVARENO_UPLOAD_ROOT=/data/uploads

WORKDIR /app

RUN addgroup --system avareno \
    && adduser --system --ingroup avareno avareno \
    && mkdir -p /data/uploads \
    && chown -R avareno:avareno /data /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app
RUN chown -R avareno:avareno /app

USER avareno
EXPOSE 4001

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-4001}"]
