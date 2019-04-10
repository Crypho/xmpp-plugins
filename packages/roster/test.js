'use strict'

const test = require('ava')
const setupRoster = require('.')
const {context} = require('@xmpp/test')
const xml = require('@xmpp/xml')
const JID = require('@xmpp/jid')
const _middleware = require('@xmpp/middleware')
const _iqCallee = require('@xmpp/iq/callee')
const _iqCaller = require('@xmpp/iq/caller')
const {promise} = require('@xmpp/events')

function fakeIncomingSet(context, child, attrs = {}) {
  attrs.type = 'set'
  return context.fakeIncomingIq(xml('iq', attrs, child)).then(stanza => {
    const [child] = stanza.children
    if (child) {
      child.parent = null
    }

    return child
  })
}

test.beforeEach(t => {
  t.context = context()
  t.context.middleware = _middleware(t.context)
  t.context.iqCaller = _iqCaller(t.context)
  t.context.iqCallee = _iqCallee(t.context)
  t.context.plugin = setupRoster(t.context)
})

test('get', t => {
  t.context.scheduleIncomingResult(
    <query xmlns="jabber:iq:roster" ver="ver1">
      <item jid="foo@foobar.com" ask="subscribe" name="Foo" subscription="both">
        <group>Friends</group>
        <group>Buddies</group>
      </item>
      <item
        jid="bar@foobar.com"
        approved="true"
        name="Bar"
        subscription="from"
      />
    </query>
  )

  return Promise.all([
    t.context
      .catchOutgoingGet()
      .then(child => t.deepEqual(child, <query xmlns="jabber:iq:roster" />)),

    t.context.plugin.get().then(val =>
      t.deepEqual(val, {
        items: [
          {
            jid: new JID('foo@foobar.com'),
            name: 'Foo',
            subscription: 'both',
            approved: false,
            ask: true,
            groups: ['Friends', 'Buddies'],
          },
          {
            jid: new JID('bar@foobar.com'),
            name: 'Bar',
            subscription: 'from',
            approved: true,
            ask: false,
            groups: [],
          },
        ],
        version: 'ver1',
      })
    ),
  ])
})

test('get empty roster', t => {
  t.context.scheduleIncomingResult(<query xmlns="jabber:iq:roster" />)

  return t.context.plugin
    .get()
    .then(val => t.deepEqual(val, {items: [], version: undefined}))
})

test('get with ver, no changes', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context
      .catchOutgoingGet()
      .then(child =>
        t.deepEqual(child, <query xmlns="jabber:iq:roster" ver="ver6" />)
      ),
    t.context.plugin.get('ver6').then(val => t.deepEqual(val, null)),
  ])
})

test('get with ver, new roster', t => {
  t.context.scheduleIncomingResult(
    <query xmlns="jabber:iq:roster" ver="ver7">
      <item jid="foo@bar" />
    </query>
  )

  return Promise.all([
    t.context
      .catchOutgoingGet()
      .then(child =>
        t.deepEqual(child, <query xmlns="jabber:iq:roster" ver="ver6" />)
      ),
    t.context.plugin.get('ver6').then(val =>
      t.deepEqual(val, {
        items: [
          {
            jid: new JID('foo@bar'),
            groups: [],
            ask: false,
            subscription: 'none',
            approved: false,
            name: '',
          },
        ],
        version: 'ver7',
      })
    ),
  ])
})

test('set with string', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <query xmlns="jabber:iq:roster">
          <item jid="foo@bar" />
        </query>
      )
    ),
    t.context.plugin.set('foo@bar').then(val => t.deepEqual(val, undefined)),
  ])
})

test('set with jid', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <query xmlns="jabber:iq:roster">
          <item jid="foo@bar" />
        </query>
      )
    ),
    t.context.plugin
      .set(new JID('foo@bar'))
      .then(val => t.deepEqual(val, undefined)),
  ])
})

test('set with object', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <query xmlns="jabber:iq:roster">
          <item jid="foo@bar" name="foobar">
            <group>a</group>
            <group>b</group>
          </item>
        </query>
      )
    ),
    t.context.plugin
      .set({jid: 'foo@bar', groups: ['a', 'b'], name: 'foobar'})
      .then(val => t.deepEqual(val, undefined)),
  ])
})

test('remove', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <query xmlns="jabber:iq:roster">
          <item jid="foo@bar" subscription="remove" />
        </query>
      )
    ),
    t.context.plugin.remove('foo@bar').then(val => t.deepEqual(val, undefined)),
  ])
})

test.serial('push remove', t => {
  // Test if the remove event is fired correctly
  const p = promise(t.context.plugin, 'remove').then(({jid, version}) => {
    t.deepEqual(jid, new JID('foo@bar'))
    t.is(version, 'v1')
    return null
  })

  // Trigger incoming push
  fakeIncomingSet(
    t.context,
    <query xmlns="jabber:iq:roster" ver="v1">
      <item jid="foo@bar" subscription="remove" />
    </query>
  )

  return p
})

test.serial('push set', t => {
  const p = promise(t.context.plugin, 'set').then(({item, version}) => {
    t.deepEqual(item, {
      jid: new JID('foo@bar'),
      name: '',
      ask: false,
      approved: false,
      subscription: 'none',
      groups: [],
    })
    t.is(version, undefined)
    return null
  })

  fakeIncomingSet(
    t.context,
    <query xmlns="jabber:iq:roster">
      <item jid="foo@bar" subscription="none" />
    </query>
  )
  return p
})
