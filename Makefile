.PHONY: setup test clean bundle start stop restart size bundlesize

setup:
	yarn
	./node_modules/.bin/lerna bootstrap

lint:
	./node_modules/.bin/eslint .

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
	make restart
	./node_modules/.bin/lerna run prepublish
	node bundle.js
	./node_modules/.bin/ava --serial --fail-fast test/
	make bundlesize

clean:
	make stop
	rm -f prosody/prosody.err
	rm -f prosody/prosody.log
	rm -f prosody/prosody.pid
	./node_modules/.bin/lerna clean --yes
	rm -rf node_modules/
	rm -f packages/*/dist/*.js
	rm -f lerna-debug.log

start:
	./server/ctl.js start

stop:
	./server/ctl.js stop

restart:
	./server/ctl.js restart

bundlesize:
	./node_modules/.bin/bundlesize

bundle:
	node bundle.js

size:
	make bundle
	make bundlesize
