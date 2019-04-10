# pubsub

Publish-subscribe support for `@xmpp/client`.

## Install

```js
npm install @xmpp-plugins/pubsub
```

## Usage

```js
import { client, xml } from "@xmpp/client";
import setupPubSub from '@xmpp-plugins/pubsub

const PUBSUB_SERVICE_ID = 'pubsub.example.com'
const PUBSUB_NODE = 'chatter'

const xmpp = client({service: 'wss://xmpp.example.com'})
const pubSubPlugin = setupPubSub(xmpp)

pubSubPlugin.on(`item-published:${PUBSUB_SERVICE_ID}`, ev => {
  console.log('An item was published on ${PUBSUB_SERVICE_ID}', ev)
})

await pubSubPlugin.createNode(PUBSUB_SERVICE_ID, PUBSUB_NODE)
// Publish a single entry with the string "Hello, world"
await pubSubPlugin.publish(PUBSUB_SERVICE_ID, PUBSUB_NODE,
  xml('item', {}, xml('entry', {}, 'Hello, world!')))
```

### Create a pub-sub node

```js
const nodeId = await pubSubPlugin.createNode('service.example.com', 'nodeName')
console.log(`nodeName pubsub node created with id ${nodeId}`)
```

### Delete a pub-sub node

```js
await pubSubPlugin.deleteNode('service.example.com', 'nodeName')
```

### Publish an item to a pub-sub node

You will need to create a `<item>` XML item and provide that to the `publish`
method.

```js
const itemId = await pubSubPlugin.publish('service.example.com', 'nodeName',
   xml('item', {}, 'Hello, world!'))
console.log(`Published with id ${itemId}`)
```

### Retract an item

```js
await pubSubPlugin.retract('service.example.com', 'nodeName', 'bnd81g37d61f49fgn581')
```

### Return items from the pubsub node

A basic call will return the last published items.

```js
const { rsm, items } = await pubSubPlugin.items('service.example.com', 'nodeName')
console.log('Found some items', items)
```

You can also pass in an object with
[result set management](https://xmpp.org/extensions/xep-0059.html)

```js
const { rsm, items } = await pubSubPlugin.items('service.example.com', 'nodeName', { max: 500 })
console.log('Found some items', items)
```

### Events

| event | description |
| -- | -- |
| `last-item-published:<service>` | Optionally sent automatically after subscription with information on the last published item |
| `last-item-published:<service>:<node>` | Optionally sent automatically after subscription with information on the last published item |
| `item-published:<service>` | Sent when a new item is published to any pub-sub node on the service |
| `item-published:<service>:<node>` | Sent when a new item is published to the given node |
| `item-deleted:<service>` | Sent when a new item is deleted from any pub-sub node on the service |
| `item-deleted:<service>:<node>` | Sent when a new item is deleted from the given node |


## References

[XEP-0059: Result Set Management](https://xmpp.org/extensions/xep-0059.html)
[XEP-0060: Publish-Subscribe](https://xmpp.org/extensions/xep-0060.html)
