FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Install cron
RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

# Copy crontab file
COPY crontab /etc/cron.d/weather-cron
RUN chmod 0644 /etc/cron.d/weather-cron && \
    crontab /etc/cron.d/weather-cron

# Create log file
RUN touch /var/log/cron.log

# Make app.py executable
RUN chmod +x app.py

# Expose port
EXPOSE 8080

# Start cron and Flask app
CMD cron && python app.py
