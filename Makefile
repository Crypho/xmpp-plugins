.PHONY: setup lint test test-ci clean

setup:
	yarn
	./node_modules/.bin/lerna bootstrap

lint:
	./node_modules/.bin/eslint .

build:
	yarn
	./node_modules/.bin/lerna bootstrap
	./node_modules/.bin/lerna run build

test:
	yarn
	./node_modules/.bin/lerna bootstrap
	./node_modules/.bin/ava
	make lint

test-ci:
	yarn
	./node_modules/.bin/lerna bootstrap
	./node_modules/.bin/ava
	make lint

clean:
	./node_modules/.bin/lerna clean --yes
	rm -rf node_modules/
	rm -f packages/*/dist
	rm -f lerna-debug.log
