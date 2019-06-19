import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { flowRight as compose } from 'lodash'
import Icon from 'cozy-ui/react/Icon'
import { translate } from 'cozy-ui/react'
import KonnectorIcon from 'ducks/balance/components/KonnectorIcon'
import styles from 'ducks/balance/components/AccountRow.styl'
import stylesLoading from 'ducks/balance/components/AccountRowLoading.styl'
import cx from 'classnames'

const AccountRowLoading = ({ t, institutionSlug, status }) => {
  const isErrored = status === 'errored'
  const liProps = isErrored ? { onClick: () => alert('ok') } : {}
  return (
    <li
      className={cx(styles.AccountRow, {
        [stylesLoading.pointer]: isErrored
      })}
      {...liProps}
    >
      <div className={styles.AccountRow__column}>
        <div className={styles.AccountRow__logo}>
          {institutionSlug && (
            <KonnectorIcon
              slug={institutionSlug}
              className={styles.KonnectorIcon}
            />
          )}
        </div>
        <div className={styles.AccountRow__labelUpdatedAtWrapper}>
          <div className={styles.AccountRow__label}>
            {isErrored
              ? t('Balance.importing_accounts_error')
              : t('Balance.importing_accounts')}
          </div>
          <div className={styles.AccountRow__updatedAt}>
            {isErrored ? (
              <>
                <Icon size="12" icon="warning" />
                <span className={stylesLoading.error}>
                  {t('Balance.error')}
                </span>
              </>
            ) : (
              <>
                <Icon
                  size="12"
                  icon="spinner"
                  color="var(--primaryColor)"
                  spin
                />
                <span className={stylesLoading.InProgress}>
                  {t('Balance.in_progress')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

AccountRowLoading.propTypes = {
  t: PropTypes.func.isRequired,
  institutionSlug: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired
}

export default compose(
  translate(),
  memo
)(AccountRowLoading)
