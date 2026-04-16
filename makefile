.PHONY: fresh-build build up start stop remove logs clean help

NODE_VERSION=$(shell dagger call -m ci/utils get-node-version)
PNPM_VERSION=$(shell dagger call -m ci/utils get-pnpm-version)

VARS := NODE_VERSION=$(NODE_VERSION) PNPM_VERSION=$(PNPM_VERSION)
BASE := $(VARS) docker-compose -f docker-compose.yml

fresh-build: 
	$(BASE) build --no-cache

build: 
	$(BASE) build

up:	
	$(BASE) up -d

start: 
	$(BASE) start

stop: 
	$(BASE) stop

down: 
	$(BASE) down

logs: 
	$(BASE) logs -f

clean: 
	$(BASE) down -v --remove-orphans

help:
	@echo "Comandos disponíveis:"
	@echo "  fresh-build     : Build completo sem cache"
	@echo "  build           : Build incremental com cache"
	@echo "  up              : Cria e inicia os containers"
	@echo "  start           : Inicia os containers"
	@echo "  stop            : Para os containers"
	@echo "  down            : Remove containers e redes"
	@echo "  logs            : Mostra logs em tempo real"
	@echo "  clean           : Limpa todos os recursos"
