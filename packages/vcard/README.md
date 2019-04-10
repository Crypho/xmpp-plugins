# vcard

This plugin allow retrieving and updating vcards.

## Install

```js
npm install @xmpp-plugins/vcard
```

## Usage

```js
import { client } from "@xmpp/client";
import setupVcard from '@xmpp-plugins/vcard'

const xmpp = client({service: 'wss://xmpp.example.com'})
const vcardPlugin = setupVcard(xmpp)

// Update our vcard
await vcardPlugin.set({
  FN: 'John',
  N: {
    FAMILY: 'Doe',
    GIVEN: 'John'
  }
})

// Retrieve our current vcard and show it on the console
console.log(await vcardPlugin.get())
```

## References

[XEP-0054: vcard-temp](https://xmpp.org/extensions/xep-0054.html)
