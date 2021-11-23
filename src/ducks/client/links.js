/* global __POUCH__ */

import { StackLink } from 'cozy-client'
import { isMobileApp, isIOSApp } from 'cozy-device-helper'
import flag from 'cozy-flags'

import { offlineDoctypes, TRANSACTION_DOCTYPE } from 'doctypes'
import {
  pickAdapter,
  getAdapterPlugin,
  getWarmupQueries
} from 'ducks/client/linksHelpers'

export const getActivatePouch = () => __POUCH__ && !flag('banks.pouch.disabled')
let links = null

export const getLinks = async (options = {}) => {
  if (links) {
    return links
  }

  const stackLink = new StackLink()
  const adapter = await pickAdapter()

  links = [stackLink]

  if (getActivatePouch()) {
    const pouchLinkOptions = {
      doctypes: offlineDoctypes,
      doctypesReplicationOptions: {
        [TRANSACTION_DOCTYPE]: {
          warmupQueries: getWarmupQueries()
        }
      },
      initialSync: true
    }

    if (isMobileApp() && isIOSApp()) {
      pouchLinkOptions.pouch = {
        plugins: [getAdapterPlugin(adapter)],
        options: {
          adapter,
          location: 'default'
        }
      }
    }

    const PouchLink = require('cozy-pouch-link').default

    const pouchLink = new PouchLink({
      ...pouchLinkOptions,
      ...options.pouchLink
    })

    links = [pouchLink, ...links]
  }

  return links
}
