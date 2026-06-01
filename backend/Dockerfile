FROM python:3.11-slim

WORKDIR /app

# Copy only backend requirements first
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory to /app/backend
COPY backend/ ./backend/

# Set Python path to parent directory
ENV PYTHONPATH=/app

# Expose port 8000
EXPOSE 8000

# Run the FastAPI app using the proper module path
CMD ["python", "-m", "uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]
