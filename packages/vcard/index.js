'use strict'

const xml = require('@xmpp/xml')

const NS = 'vcard-temp'

function parse({children}) {
  return children.reduce((dict, c) => {
    dict[c.name] =
      c.children && typeof c.children[0] === 'string' ? c.text() : parse(c)
    return dict
  }, {})
}

function build(dict, parent) {
  return (parent || xml('vCard', {xmlns: NS})).append(
    Object.entries(dict).map(([key, val]) => {
      return typeof val === 'object' ? build(val, xml(key)) : xml(key, {}, val)
    })
  )
}

class VcardPlugin {
  constructor({iqCaller}) {
    this.iqCaller = iqCaller
  }

  /**
   * Request the vcard of a user. If no jid is provided the vcard for
   * the current user is returned.
   *
   * @param {string|undefined} jid Jabber id whose vcard we want
   * @returns {Promise<object>} vcard instance
   */
  get(jid) {
    return this.iqCaller
      .request(xml('iq', {type: 'get', to: jid}, xml('vCard', {xmlns: NS}, jid)))
      .then(r => parse(r).vCard)
  }

  /**
   * Change the user's vcard
   *
   * @param {object} vCard Vcard data to store
   * @returns {Promise<void>} Completion promise
   */
  set(vCard) {
    return this.iqCaller
      .request(xml('iq', {type: 'set'}, build(vCard)))
      .then(() => undefined)
  }
}

/**
 * Register a vcard plugin.
 *
 * @param {Client} client XMPP client instance
 * @returns {VcardPlugin} Vcard plugin instance
 */
function setupVcard(client) {
  return new VcardPlugin(client)
}

module.exports = setupVcard
