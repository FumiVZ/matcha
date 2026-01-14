DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

all: generate-db-password generate-ssl
	@echo "Starting all services with HTTPS..."
	$(DOCKER_COMPOSE) up -d
	@echo "Waiting for database to be ready..."
	@until docker exec matcha_db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "Initializing database..."
	@docker exec matcha_app node scripts/initDB.js
	@echo ""
	@echo "  -> https://localhost:8443"
	@echo ""

dev: docker-db init-db
	@echo "Starting development server..."
	npx nodemon server.js

init-db:
	@echo "Waiting for database to be ready..."
	@until docker exec matcha_db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "Initializing database..."
	node scripts/initDB.js

clean-db: docker-db
	@echo "Waiting for database to be ready..."
	@until docker exec matcha_db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "Cleaning database..."
	node scripts/cleanDB.js

clean: clean-db
	@echo "Cleaning project..."
	@echo "Removing uploaded photos..."
	@rm -rf uploads/photos/*
	@echo "Photos deleted"

re: clean all

rdev: clean dev

docker-up:
	@echo "Starting Docker containers..."
	$(DOCKER_COMPOSE) up -d

docker-down:
	@echo "Stopping Docker containers..."
	$(DOCKER_COMPOSE) down

docker-build:
	@echo "Building Docker images..."
	$(DOCKER_COMPOSE) build

docker-logs:
	@echo "Showing Docker logs..."
	$(DOCKER_COMPOSE) logs -f

docker-db: generate-db-password
	@echo "Starting only the database container..."
	$(DOCKER_COMPOSE) up -d db

generate-db-password:
	@if [ ! -f .env ]; then touch .env; fi
	@if ! grep -q "^DB_PASSWORD=" .env 2>/dev/null; then \
		DB_PASS=$$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32); \
		echo "DB_PASSWORD=$$DB_PASS" >> .env; \
		echo "Generated new DB_PASSWORD in .env"; \
	fi

setup:
	@if [ ! -f .env ]; then touch .env; fi
	@if ! grep -q "^SESSION_SECRET=" .env 2>/dev/null; then \
		SESSION_SEC=$$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32); \
		echo "SESSION_SECRET=$$SESSION_SEC" >> .env; \
		echo "Generated new SESSION_SECRET in .env"; \
	else \
		echo "SESSION_SECRET already exists in .env"; \
	fi

docker-clean:
	@echo "Removing Docker containers and volumes..."
	$(DOCKER_COMPOSE) down -v
	@if [ -f .env ]; then \
		sed -i '/^DB_PASSWORD=/d' .env; \
		echo "Removed DB_PASSWORD from .env"; \
	fi

docker-restart: docker-down docker-up

generate-ssl:
	@echo "Generating SSL certificates..."
	@./ssl/generate-certs.sh

docker-https: generate-db-password generate-ssl
	@echo "Starting all services with HTTPS..."
	$(DOCKER_COMPOSE) up -d

docker-https-logs:
	@echo "Showing nginx logs..."
	docker logs -f matcha_nginx

.PHONY: all dev init-db clean-db clean re rdev docker-up docker-down docker-build docker-logs docker-db docker-clean docker-restart generate-db-password setup generate-ssl docker-https docker-https-logs
