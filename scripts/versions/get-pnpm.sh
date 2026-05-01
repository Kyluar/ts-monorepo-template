#!/usr/bin/env sh
set -e

if [ ! -f "package.json" ]; then
    echo "ERRO: package.json not found" >&2
    exit 1
fi

node -e "
    try {
        const j = JSON.parse(require('fs').readFileSync('package.json'));
        const v = j.packageManager || '';
        if (!v) throw new Error();
        console.log(v.includes('@') ? v.split('@')[1] : v);
    } catch (e) {
        process.exit(1);
    }
" || { echo "ERRO: pnpm version not found" >&2; exit 1; }