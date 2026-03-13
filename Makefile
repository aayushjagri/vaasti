.PHONY: up down build shell migrate seed logs

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

shell:
	docker compose exec backend python manage.py shell

migrate:
	docker compose exec backend python manage.py migrate_schemas --shared
	docker compose exec backend python manage.py migrate_schemas

seed:
	docker compose exec backend python manage.py shell < scripts/seed.py

logs:
	docker compose logs -f backend celery

test:
	docker compose exec backend python manage.py test --parallel

frontend-shell:
	docker compose exec frontend sh

psql:
	docker compose exec db psql -U vasati vasati
