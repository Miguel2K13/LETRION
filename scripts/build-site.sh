#!/bin/sh
# O app é um único HTML autocontido; o deploy só precisa dele como index.html.
set -eu
mkdir -p dist
cp LETRION_COM_LEXI_PRO_V19_BASE_OPENROUTER_BAIXA_COTA-1.html dist/index.html
