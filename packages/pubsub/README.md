# pubsub

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

## References

[XEP-0060: Publish-Subscribe](https://xmpp.org/extensions/xep-0060.html)
