FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-spa \
    && rm -rf /var/lib/apt/lists/*
COPY servidor.py /opt/ocr/servidor.py
USER 10001:10001
CMD ["python", "/opt/ocr/servidor.py"]
