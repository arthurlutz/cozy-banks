import React from 'react'
import { Route } from 'react-router'

import AppRoute from './AppRoute'

const NewComponent = () => <div>New component</div>

// Mock otherwise we have a fetch is not defined error due to pouchdb-browser.
// Here we are not concerned with this component
jest.mock('cozy-pouch-link', () => () => null)

// Mock deep component to avoid error when mouting it.
// Here we are not concerned with this component
jest.mock('../ducks/settings/Configuration.jsx', () => () => null)

describe('App route', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should be a function returning a route', () => {
    const route = AppRoute()
    expect(route).toMatchSnapshot()
  })

  it('should have renderExtraRoutes', () => {
    jest
      .spyOn(AppRoute, 'renderExtraRoutes')
      .mockReturnValue(<Route component={NewComponent} path="extra-route" />)
    const route = AppRoute()
    expect(route).toMatchSnapshot()
  })
})
