'use strict'

const {EventEmitter} = require('@xmpp/events')
const xml = require('@xmpp/xml')
const JID = require('@xmpp/jid')

const NS = 'jabber:iq:roster'

function parseItem(item) {
  return Object.assign({}, item.attrs, {
    groups: item.getChildren('group').map(group => group.text()),
    approved: item.attrs.approved === 'true',
    ask: item.attrs.ask === 'subscribe',
    name: item.attrs.name || '',
    subscription: item.attrs.subscription || 'none',
    jid: new JID(item.attrs.jid),
  })
}

class RosterPlugin extends EventEmitter {
  constructor(client) {
    super()
    this.client = client
    this.start()
  }

  /** @typedef {{items: object, version?: string }} Roster */

  /**
   * Retrieve the roster.
   *
   * @param {string|undefined} version Roster version
   * @returns {Promise<Roster|null>} List of roster items. If a version
   *    was specified and is still the latest version `null` is returned.
   */
  get(version) {
    const {iqCaller} = this.client
    return iqCaller
      .request(
        xml('iq', {type: 'get'}, xml('query', {xmlns: NS, ver: version}))
      )
      .then(res => {
        // An empty iq response means no new version is available
        if (res.children.length === 0) {
          return null
        }

        const result = res.getChild('query')
        return {
          items: result.getChildren('item').map(x => parseItem(x)),
          version: result.attrs.ver,
        }
      })
  }

  /**
   * Update the roster
   *
   * @param {string|JID.JID|object} item Roster to set
   * @returns {Promise<undefined>} Completion promise
   */
  set(item) {
    const {iqCaller} = this.client
    if (typeof item === 'string' || item instanceof JID.JID) {
      item = {jid: item}
    }

    const groups = item.groups || []
    delete item.groups
    return iqCaller
      .request(
        xml(
          'iq',
          {type: 'set'},
          xml(
            'query',
            {xmlns: NS},
            xml(
              'item',
              item,
              groups.map(g => xml('group', {}, g))
            )
          )
        )
      )
      .then(() => undefined)
  }

  /**
   * Remote an item from the roster.
   *
   * @param {string} jid Jabber id for item to remove from the roster
   * @returns {Promise<void>} Completion promise
   */
  remove(jid) {
    const {iqCaller} = this.client
    return iqCaller
      .request(
        xml(
          'iq',
          {type: 'set'},
          xml('query', {xmlns: NS}, xml('item', {jid, subscription: 'remove'}))
        )
      )
      .then(() => undefined)
  }

  // Handles roster pushes
  start() {
    const {iqCallee} = this.client
    iqCallee.set(NS, 'query', context => {
      // A receiving client MUST ignore the stanza unless it has no 'from'
      // attribute (i.e., implicitly from the bare JID of the user's account)
      // or it has a 'from' attribute whose value matches the user's bare
      // JID <user@domainpart>.
      if (context.from !== null) {
        const myJid = context.entity.jid.bare()
        const sendingJid = new JID(context.from).bare()
        if (!sendingJid.equals(myJid)) {
          return false
        }
      }

      const child = context.element
      const item = parseItem(child.getChild('item'))
      if (item.subscription === 'remove') {
        this.emit('remove', {jid: item.jid, version: child.attrs.ver})
      } else {
        this.emit('set', {item, version: child.attrs.ver})
      }

      return true
    })
  }
}

/**
 * Register a roster plugin.
 *
 * @param {Client} client XMPP client instance
 * @returns {RosterPlugin} Plugin instance
 */

function setupRoster(client) {
  return new RosterPlugin(client)
}

module.exports = setupRoster
