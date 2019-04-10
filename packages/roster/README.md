# roster

[roster management](https://xmpp.org/rfcs/rfc6121.html#roster) for `@xmpp/client`.

Supports Node.js and browsers.

Roster push is currently not supported.

## Install

```js
npm install @xmpp-plugins/roster
```

## Usage

```js
import { client, xml } from "@xmpp/client"
import setupRoster from "@xmpp-plugins/roster"

const xmpp = client({service: 'wss://xmpp.example.com'})
const roster = setupRoster(xmpp)

roster.on('set', ({item, version}) => {
  console.log(`Roster version ${version} received`, item)
})

const { version, items } = await roster.get()
console.log(`Current roster version is ${version}`)
```

### Get

Retrieve the roster.

`version` is optional and refers to [roster version](https://xmpp.org/rfcs/rfc6121.html#roster-versioning-request).

```js
roster.get(version).then(roster => {
  if (!roster) {
    // the roster hasn't changed since last version
    return
  }

  const { version, items } = roster
  console.log(version, roster)
})
```

### Set

Add or update a roster entry.

```js
roster.set({jid: 'foo@bar', name: 'Foo Bar'}).then(() => {
  console.log('success')
})
```

### Remove

Remove a roster entry.

```js
roster.remove(jid).then(() => {
  console.log('success')
})
```

### Set event

Emitted when a roster entry was added or updated.

```js
roster.on('set', ({item, version}) => {
  console.log(item)
  console.log(version)
})
```

### Remove event

Emitted when a roster entry was removed.

```js
roster.on('remove', ({jid, version}) => {
  console.log(jid.toString(), 'removed')
  console.log(version)
})
```

## References

[RFC-6121: Managing the Roster](https://xmpp.org/rfcs/rfc6121.html#roster)
