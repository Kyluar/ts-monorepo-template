#!/usr/bin/env bash
set -e

if [ ! -f ".nvmrc" ]; then
    echo "ERRO: .nvmrc not found" >&2
    exit 1
fi

node -e "
    try { 
        const v = require('fs').readFileSync('.nvmrc', 'utf8').trim().replace(/^v/, '')
        if (!v) throw new Error();
        console.log(v)
    } catch (e) {
        process.exit(1);
    }
" || { echo "ERRO: node version not found" >&2; exit 1; }