'use strict'

const test = require('ava')
const setupPubsub = require('.')
const {mockClient} = require('@xmpp/test')
const _middleware = require('@xmpp/middleware')
const _iqCaller = require('@xmpp/iq/caller')
const {promise} = require('@xmpp/events')

const SERVICE = 'pubsub.foo'

test.beforeEach(t => {
  t.context = mockClient()
  t.context.middleware = _middleware(t.context)
  t.context.iqCaller = _iqCaller(t.context)
  t.context.plugin = setupPubsub(t.context)
})

test('createNode', t => {
  t.context.scheduleIncomingResult(
    <pubsub xmlns="http://jabber.org/protocol/pubsub">
      <create node="foo" />
    </pubsub>
  )

  const promises = []

  promises.push(
    t.context.catchOutgoingSet().then(child => {
      return t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub">
          <create node="foo" />
        </pubsub>
      )
    })
  )
  promises.push(
    t.context.plugin.createNode(SERVICE, 'foo').then(val => t.is(val, 'foo'))
  )
  return Promise.all(promises)
})

test('createNode with config options', t => {
  t.context.scheduleIncomingResult(
    <pubsub xmlns="http://jabber.org/protocol/pubsub">
      <create node="foo" />
    </pubsub>
  )

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub">
          <create node="foo" />
          <configure>
            <x xmlns="jabber:x:data" type="submit">
              <field var="FORM_TYPE" type="hidden">
                <value>http://jabber.org/protocol/pubsub#node_config</value>
              </field>
              <field var="pubsub#access_model">
                <value>whitelist</value>
              </field>
              <field var="pubsub#max_items">
                <value>100</value>
              </field>
            </x>
          </configure>
        </pubsub>
      )
    ),
    t.context.plugin
      .createNode(SERVICE, 'foo', {
        'pubsub#access_model': 'whitelist',
        'pubsub#max_items': 100,
      })
      .then(val => t.is(val, 'foo')),
  ])
})

test('deleteNode', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">
          <delete node="foo" />
        </pubsub>
      )
    ),
    t.context.plugin
      .deleteNode(SERVICE, 'foo')
      .then(val => t.is(val, undefined)),
  ])
})

test('publish', t => {
  t.context.scheduleIncomingResult(
    <pubsub xmlns="http://jabber.org/protocol/pubsub">
      <publish node="foo">
        <item id="foobar" />
      </publish>
    </pubsub>
  )

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub">
          <publish node="foo">
            <item>
              <entry>
                <title>FooBar</title>
              </entry>
            </item>
          </publish>
        </pubsub>
      )
    ),
    t.context.plugin
      .publish(
        SERVICE,
        'foo',
        <item>
          <entry>
            <title>FooBar</title>
          </entry>
        </item>
      )
      .then(itemId => t.is(itemId, 'foobar')),
  ])
})

test('get', t => {
  t.context.scheduleIncomingResult(
    <pubsub xmlns="http://jabber.org/protocol/pubsub">
      <items node="foo">
        <item id="fooitem">
          <entry>Foo</entry>
        </item>
      </items>
    </pubsub>
  )
  return Promise.all([
    t.context.catchOutgoingGet().then(child =>
      t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub">
          <items node="foo">
            <item id="fooitem" />
          </items>
        </pubsub>
      )
    ),
    t.context.plugin.get(SERVICE, 'foo', 'fooitem').then(item => {
      item.parent = null
      return t.deepEqual(
        item,
        <item id="fooitem">
          <entry>Foo</entry>
        </item>
      )
    }),
  ])
})

test('items', t => {
  t.context.scheduleIncomingResult(
    <pubsub xmlns="http://jabber.org/protocol/pubsub">
      <items node="foo">
        <item id="fooitem">
          <entry>Foo</entry>
        </item>
        <item id="baritem">
          <entry>Bar</entry>
        </item>
      </items>
    </pubsub>
  )

  return Promise.all([
    t.context.catchOutgoingGet().then(child =>
      t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub">
          <items node="foo" />
        </pubsub>
      )
    ),
    t.context.plugin.items(SERVICE, 'foo').then(({items, rsm}) => {
      items.forEach(i => {
        i.parent = null
      })
      t.deepEqual(
        items[0],
        <item id="fooitem">
          <entry>Foo</entry>
        </item>
      )
      t.deepEqual(
        items[1],
        <item id="baritem">
          <entry>Bar</entry>
        </item>
      )
      return t.is(rsm, undefined)
    }),
  ])
})

test('items with RSM', t => {
  t.context.scheduleIncomingResult(
    <pubsub xmlns="http://jabber.org/protocol/pubsub">
      <items node="foo">
        <item id="fooitem">
          <entry>Foo</entry>
        </item>
        <item id="baritem">
          <entry>Bar</entry>
        </item>
      </items>
      <set xmlns="http://jabber.org/protocol/rsm">
        <first>first@time</first>
        <last>last@time</last>
        <count>2</count>
      </set>
    </pubsub>
  )

  return Promise.all([
    t.context.catchOutgoingGet().then(child =>
      t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub">
          <items node="foo" />
          <set xmlns="http://jabber.org/protocol/rsm">
            <first>first@time</first>
            <max>2</max>
          </set>
        </pubsub>
      )
    ),
    t.context.plugin
      .items(SERVICE, 'foo', {first: 'first@time', max: 2})
      .then(({items, rsm}) => {
        items.forEach(i => {
          i.parent = null
        })
        t.deepEqual(
          items[0],
          <item id="fooitem">
            <entry>Foo</entry>
          </item>
        )
        t.deepEqual(
          items[1],
          <item id="baritem">
            <entry>Bar</entry>
          </item>
        )
        return t.deepEqual(rsm, {
          first: 'first@time',
          last: 'last@time',
          count: 2,
        })
      }),
  ])
})

test('delete item', t => {
  t.context.scheduleIncomingResult()

  return Promise.all([
    t.context.catchOutgoingSet().then(child =>
      t.deepEqual(
        child,
        <pubsub xmlns="http://jabber.org/protocol/pubsub">
          <retract node="foo" notify="true">
            <item id="foobar" />
          </retract>
        </pubsub>
      )
    ),
    t.context.plugin.retract(SERVICE, 'foo', 'foobar'),
  ])
})

test('item-published event', t => {
  t.context.fakeIncoming(
    <message from={SERVICE}>
      <event xmlns="http://jabber.org/protocol/pubsub#event">
        <items node="foo">
          <item id="fooitem">
            <entry>Foo Bar</entry>
          </item>
        </items>
      </event>
    </message>
  )

  return Promise.all([
    promise(t.context.plugin, 'item-published:pubsub.foo').then(ev => {
      ev.entry.parent = null
      return t.deepEqual(ev, {
        node: 'foo',
        id: 'fooitem',
        entry: <entry>Foo Bar</entry>,
      })
    }),
    promise(t.context.plugin, 'item-published:pubsub.foo:foo').then(ev => {
      ev.entry.parent = null
      return t.deepEqual(ev, {
        id: 'fooitem',
        entry: <entry>Foo Bar</entry>,
      })
    }),
  ])
})

test('last-item-published event', t => {
  t.context.fakeIncoming(
    <message from={SERVICE}>
      <event xmlns="http://jabber.org/protocol/pubsub#event">
        <items node="foo">
          <item id="fooitem">
            <entry>Foo Bar</entry>
          </item>
        </items>
      </event>
      <delay xmlns="urn:xmpp:delay" stamp="2003-12-13T23:58:37Z" />
    </message>
  )

  return Promise.all([
    promise(t.context.plugin, 'last-item-published:pubsub.foo').then(ev => {
      ev.entry.parent = null
      return t.deepEqual(ev, {
        node: 'foo',
        id: 'fooitem',
        stamp: '2003-12-13T23:58:37Z',
        entry: <entry>Foo Bar</entry>,
      })
    }),
    promise(t.context.plugin, 'last-item-published:pubsub.foo:foo').then(ev => {
      ev.entry.parent = null
      return t.deepEqual(ev, {
        id: 'fooitem',
        stamp: '2003-12-13T23:58:37Z',
        entry: <entry>Foo Bar</entry>,
      })
    }),
  ])
})

test('item-deleted event', t => {
  t.context.fakeIncoming(
    <message from={SERVICE}>
      <event xmlns="http://jabber.org/protocol/pubsub#event">
        <items node="foo">
          <retract id="fooitem" />
        </items>
      </event>
    </message>
  )

  return Promise.all([
    promise(t.context.plugin, 'item-deleted:pubsub.foo').then(ev =>
      t.deepEqual(ev, {
        node: 'foo',
        id: 'fooitem',
      })
    ),
    promise(t.context.plugin, 'item-deleted:pubsub.foo:foo').then(ev =>
      t.deepEqual(ev, {
        id: 'fooitem',
      })
    ),
  ])
})
