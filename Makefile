docker-run:
	@cd ./infra && docker compose up -d

docker-stop:
	@cd infra && docker compose down
