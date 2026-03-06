.PHONY: up down logs restart seed build

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

build:
	docker compose build

seed:
	docker compose exec backend python -c "import database; database.get_user_by_email('seed@trigger.com')"
