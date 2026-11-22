#!/usr/bin/env bash
# Three copies of Bend at the same tag: .vendor/orig as released, .vendor/patched with
# patch/js-lib-own-defs.patch, .vendor/named with patch/named-exports.patch. Set BEND_SRC to a local clone to skip the download.
set -euo pipefail
cd "$(dirname "$0")"
TAG="${BEND_TAG:-v2.0.40}"
SRC="${BEND_SRC:-https://github.com/bendlang/bend.git}"
rm -rf .vendor && mkdir -p .vendor
for v in orig patched named; do
  git -c advice.detachedHead=false clone -q --branch "$TAG" "$SRC" ".vendor/$v"
done
git -C .vendor/patched apply "$PWD/patch/js-lib-own-defs.patch"
git -C .vendor/named apply "$PWD/patch/named-exports.patch"
echo "Bend $TAG in .vendor/{orig,patched,named}"
