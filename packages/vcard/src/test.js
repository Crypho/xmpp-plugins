'use strict'

const test = require('ava')
const setupVcard = require('.')
const {context} = require('@xmpp/test')
const _middleware = require('@xmpp/middleware')
const _iqCaller = require('@xmpp/iq/caller')
const xml = require('@xmpp/xml')

test.beforeEach(t => {
  t.context = context()
  t.context.middleware = _middleware(t.context)
  t.context.iqCaller = _iqCaller(t.context)
  t.context.plugin = setupVcard(t.context)
})

test('set', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context
      .catchOutgoingSet()
      .then(child =>
        t.deepEqual(
          child,
          xml('vCard', {xmlns: 'vcard-temp'}, [
            xml('FN', {}, 'Foo Bar'),
            xml('N', {}, [xml('FAMILY', {}, 'Bar'), xml('GIVEN', {}, 'Foo')]),
          ])
        )
      ),
    t.context.plugin
      .set({FN: 'Foo Bar', N: {FAMILY: 'Bar', GIVEN: 'Foo'}})
      .then(value => t.deepEqual(value, undefined)),
  ])
})

test('get', t => {
  t.context.scheduleIncomingResult(
    xml(
      'vCard',
      {xmlns: 'vcard-temp'},
      xml('FN', {}, 'Foo Bar'),
      xml('N', {}, xml('FAMILY', {}, 'Bar'), xml('GIVEN', {}, 'Foo'))
    )
  )

  return Promise.all([
    t.context
      .catchOutgoingGet()
      .then(child => t.deepEqual(child, xml('vCard', {xmlns: 'vcard-temp'}))),
    t.context.plugin
      .get()
      .then(vcard =>
        t.deepEqual(vcard, {FN: 'Foo Bar', N: {FAMILY: 'Bar', GIVEN: 'Foo'}})
      ),
  ])
})
