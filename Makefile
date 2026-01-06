DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

all: docker-db init-db
	@echo "Starting production server..."
	node server.js

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

re: clean all

rdev: clean dev

# Docker commands
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

docker-db:
	@echo "Starting only the database container..."
	$(DOCKER_COMPOSE) up -d db

docker-clean:
	@echo "Removing Docker containers and volumes..."
	$(DOCKER_COMPOSE) down -v

docker-restart: docker-down docker-up

.PHONY: all dev init-db clean-db clean re rdev docker-up docker-down docker-build docker-logs docker-db docker-clean docker-restart
