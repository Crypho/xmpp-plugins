'use strict'

const {EventEmitter} = require('@xmpp/events')
const xml = require('@xmpp/xml')

const NS_PUBSUB = 'http://jabber.org/protocol/pubsub'
const NS_PUBSUB_EVENT = `${NS_PUBSUB}#event`
const NS_PUBSUB_OWNER = `${NS_PUBSUB}#owner`
const NS_PUBSUB_NODE_CONFIG = `${NS_PUBSUB}#node_config`
const NS_RSM = 'http://jabber.org/protocol/rsm'
const NS_X_DATA = 'jabber:x:data'

function isPubSubEventNotification({stanza}) {
  const child = stanza.getChild('event')
  return stanza.is('message') && child && child.attrs.xmlns === NS_PUBSUB_EVENT
}

class PubSubPlugin extends EventEmitter {
  constructor(client) {
    super()
    this.client = client
  }

  handleNotification({stanza}) {
    const service = stanza.attrs.from
    const items = stanza.getChild('event').getChild('items')
    const {node} = items.attrs
    const item = items.getChild('item')
    const retract = items.getChild('retract')
    if (item) {
      const {id} = item.attrs
      const entry = item.getChild('entry')
      const delay = stanza.getChild('delay')

      if (delay) {
        const {stamp} = delay.attrs
        this.emit(`last-item-published:${service}`, {node, id, entry, stamp})
        this.emit(`last-item-published:${service}:${node}`, {
          id,
          entry,
          stamp,
        })
      } else {
        this.emit(`item-published:${service}`, {node, id, entry})
        this.emit(`item-published:${service}:${node}`, {id, entry})
      }
    }

    if (retract) {
      const {id} = retract.attrs
      this.emit(`item-deleted:${service}`, {node, id})
      this.emit(`item-deleted:${service}:${node}`, {id})
    }
  }

  /** @typedef {{[key: string]: string}} Options */
  /**
   * Create a new pubsub node.
   *
   * @param {string} service Service id
   * @param {string} node Pubsub node id
   * @param {Options|undefined} options PubSub node configuration
   * @returns {Promise<string>} Name of the created node
   */
  createNode(service, node, options) {
    const {iqCaller} = this.client
    const stanza = xml('pubsub', {xmlns: NS_PUBSUB}, xml('create', {node}))

    if (options) {
      const config = xml('configure')
      const x = config.cnode(
        xml(
          'x',
          {xmlns: NS_X_DATA, type: 'submit'},
          xml(
            'field',
            {var: 'FORM_TYPE', type: 'hidden'},
            xml('value', {}, NS_PUBSUB_NODE_CONFIG)
          )
        )
      )

      for (const key of Object.keys(options)) {
        const option = xml(
          'field',
          {var: key},
          xml('value', {}, options[key].toString())
        )
        x.cnode(option)
      }

      stanza.cnode(config)
    }

    return iqCaller
      .request(xml('iq', {type: 'set', to: service}, stanza))
      .then(result => result.getChild('pubsub').getChild('create').attrs.node)
  }

  /**
   * Delete an existing pubsub node.
   *
   * @param {string} service Service id
   * @param {string} node Pubsub node id
   * @returns {Promise<void>} Result promise
   */
  deleteNode(service, node) {
    const {iqCaller} = this.client
    return iqCaller
      .request(
        xml(
          'iq',
          {type: 'set', to: service},
          xml('pubsub', {xmlns: NS_PUBSUB_OWNER}, xml('delete', {node}))
        )
      )
      .then(() => undefined)
  }

  /**
   * Publish an item to a pubsub node
   *
   * @param {string} service Service id
   * @param {string} node Pubsub node id
   * @param {XML} item XML item node with entry children
   * @return {Promise<string>} id of the created pubsub item
   */
  publish(service, node, item) {
    const {iqCaller} = this.client
    const stanza = xml('pubsub', {xmlns: NS_PUBSUB}, xml('publish', {node}))
    if (item) {
      stanza.getChild('publish').cnode(item)
    }

    return iqCaller.request(xml('iq', {type: 'set', to: service}, stanza)).then(
      result =>
        result
          .getChild('pubsub')
          .getChild('publish')
          .getChild('item').attrs.id
    )
  }

  /**
   * Delete an item from a pubsub node
   *
   * @param {string} service Service id
   * @param {string} node Pubsub node id
   * @param {string} id Id of pubsub item to delete
   * @param {boolean} notify Notify all subscribers of deletion
   * @returns {Promise<void>} Ready promise
   */
  retract(service, node, id, notify = true) {
    const {iqCaller} = this.client
    const stanza = xml(
      'pubsub',
      {xmlns: NS_PUBSUB},
      xml('retract', {node, notify}, xml('item', {id}))
    )
    return iqCaller.request(xml('iq', {type: 'set', to: service}, stanza))
  }

  /**
   * Fetch a single item from a pubsub node.
   *
   * @param {string} service Service id
   * @param {string} node Pubsub node id
   * @param {string} id Pubsub item id for the item to retrieve
   * @returns {Promise<any>} The retrieved item, or `null` if the item does not exist
   */
  get(service, node, id) {
    const {iqCaller} = this.client
    const stanza = xml(
      'pubsub',
      {xmlns: NS_PUBSUB},
      xml('items', {node}, xml('item', {id}))
    )

    return iqCaller
      .request(xml('iq', {type: 'get', to: service}, stanza))
      .then(result => {
        const pubSubResult = result.getChild('pubsub')
        const items = pubSubResult.getChild('items').children
        return items.length > 0 ? items[0] : null
      })
  }

  /**
   * @typedef {{[key: string]: string|number}} RSM
   */
  /**
   * @typedef {{items: any[], rsm?: object}} ItemResult
   */
  /**
   * Retrieve items from the pub-sub node.
   *
   * @param {string} service Service id
   * @param {string} node Pubsub node id
   * @param {RSM|undefined} rsm Result set management info
   * @returns {Promise<ItemResult>} List of items and RSM information
   */
  items(service, node, rsm) {
    const {iqCaller} = this.client
    const stanza = xml('pubsub', {xmlns: NS_PUBSUB}, xml('items', {node}))

    if (rsm) {
      const rsmEl = xml('set', {xmlns: NS_RSM})
      for (const key of Object.keys(rsm)) {
        const e = rsmEl.c(key)
        if (rsm[key] !== null) {
          e.t(rsm[key].toString())
        }
      }

      stanza.up().cnode(rsmEl)
    }

    return iqCaller
      .request(xml('iq', {type: 'get', to: service}, stanza))
      .then(result => {
        const pubSubResult = result.getChild('pubsub')
        const rsmEl = pubSubResult.getChild('set')
        const items = pubSubResult.getChild('items').children

        if (rsmEl) {
          return {
            items,
            rsm: rsmEl.children.reduce((obj, el) => {
              if (el.name === 'max' || el.name === 'count') {
                obj[el.name] = parseInt(el.text(), 10)
              } else {
                obj[el.name] = el.text()
              }

              return obj
            }, {}),
          }
        }

        return {items}
      })
  }
}

/**
 * Register a vcard plugin.
 *
 * @param {Client} client XMPP client instance
 * @returns {PubSubPlugin} Plugin instance
 */
function setupPubSub(client) {
  const {middleware} = client
  const plugin = new PubSubPlugin(client)

  middleware.use((context, next) => {
    if (isPubSubEventNotification(context)) {
      return plugin.handleNotification(context)
    }

    return next()
  })

  return plugin
}

module.exports = setupPubSub
