.PHONY: fresh-build build up start stop remove logs clean help check-vars

NODE_VERSION=$(shell sh ./scripts/versions/get-node.sh)
PNPM_VERSION=$(shell sh ./scripts/versions/get-pnpm.sh)

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

check-vars:
	@echo "--- Verificação de Env Vars ---"
	@echo "Node Version: $(NODE_VERSION)"
	@echo "PNPM Version: $(PNPM_VERSION)"
	@if [ -z "$(NODE_VERSION)" ]; then echo "ERRO: NODE_VERSION está vazia!"; exit 1; fi
	@if [ -z "$(PNPM_VERSION)" ]; then echo "ERRO: PNPM_VERSION está vazia!"; exit 1; fi
	@echo "-------------------------------"

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
	@echo "  check-vars      : Verifica a disponibilidade das env vars"
