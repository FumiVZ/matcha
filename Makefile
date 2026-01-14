DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

all: docker-db init-db build-front
	@echo "Starting production server on http://localhost:3000 ..."
	node server.js

dev: docker-db init-db
	@echo "Starting development servers (Back & Front)..."
	@echo "Backend: http://localhost:3000"
	@echo "Frontend: http://localhost:5173"
	@npx concurrently -n "BACK,FRONT" -c "blue,magenta" \
		"npx nodemon server.js" \
		"cd front && npm run dev"

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

front:
	@echo "Starting frontend dev server on http://localhost:5173 ..."
	cd front && npm run dev

build-front:
	@echo "Building frontend for production..."
	cd front && npm run build
	@echo "Frontend built successfully in front/dist/"

install-front:
	@echo "Installing frontend dependencies..."
	cd front && npm install

.PHONY: all dev init-db clean-db clean re rdev docker-up docker-down docker-build docker-logs docker-db docker-clean docker-restart generate-db-password setup front build-front install-front

