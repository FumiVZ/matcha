all: init-db
	@echo "Starting production server..."
	node server.js

dev: init-db
	@echo "Starting development server..."
	nodemon server.js

init-db:
	@echo "Initializing database..."
	node scripts/initDB.js

clean-db:
	@echo "Cleaning database..."
	node scripts/cleanDB.js

clean: clean-db
	@echo "Cleaning project..."

re: clean init-db all

rdev: clean init-db dev

.PHONY: all dev init-db clean-db clean re rdev