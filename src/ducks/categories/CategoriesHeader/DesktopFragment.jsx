import React from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'
import { useI18n } from 'cozy-ui/transpiled/react/I18n'
import Empty from 'cozy-ui/transpiled/react/Empty'
import Header from 'components/Header'
import Padded from 'components/Padded'
import Stack from 'cozy-ui/transpiled/react/Stack'
import Table from 'components/Table'
import styles from 'ducks/categories/CategoriesHeader/CategoriesHeader.styl'
import AddAccountButton from 'ducks/categories/AddAccountButton'

import Fade from 'cozy-ui/transpiled/react/Fade'
import Breadcrumb from 'cozy-ui/transpiled/react/Breadcrumbs'
import CategoryAccountSwitch from 'ducks/categories/CategoryAccountSwitch'

import HeaderLoadingProgress from 'components/HeaderLoadingProgress'

import catStyles from 'ducks/categories/styles.styl'
import CategoriesTableHead from './CategoriesTableHead'
const stTableCategory = catStyles['bnk-table-category']

const DesktopFragment = React.memo(
  ({
    breadcrumbItems,
    chart,
    dateSelector,
    emptyIcon,
    hasAccount,
    hasData,
    incomeToggle,
    isFetching,
    isFetchingNewData,
    selectedCategory
  }) => {
    const { t } = useI18n()

    return (
      <>
        <Header theme="inverted" fixed>
          <Padded
            className={cx(styles.CategoriesHeader, {
              [styles.NoAccount]: !hasAccount
            })}
          >
            {hasAccount ? (
              <>
                <div>
                  <Stack spacing="m">
                    <CategoryAccountSwitch
                      selectedCategory={selectedCategory}
                      breadcrumbItems={breadcrumbItems}
                    />
                    {dateSelector}
                  </Stack>
                  {breadcrumbItems.length > 1 && (
                    <Fade in>
                      <Breadcrumb className="u-mt-1" items={breadcrumbItems} />
                    </Fade>
                  )}
                  {incomeToggle}
                </div>
                {chart}
              </>
            ) : (
              <AddAccountButton label={t('Accounts.add-bank')} />
            )}
          </Padded>
          {hasAccount ? (
            <Table className={stTableCategory}>
              <CategoriesTableHead selectedCategory={selectedCategory} />
            </Table>
          ) : null}
        </Header>
        <HeaderLoadingProgress
          isFetching={!!isFetchingNewData && !isFetching}
        />
        {!hasData && !isFetching && !isFetchingNewData ? (
          <Empty
            className={styles.NoAccount_empty}
            icon={emptyIcon}
            text={t('Categories.title.empty-text')}
          />
        ) : null}
      </>
    )
  }
)

DesktopFragment.displayName = 'Desktop Fragment'

DesktopFragment.propTypes = {
  breadcrumbItems: PropTypes.array.isRequired,
  chart: PropTypes.node.isRequired,
  dateSelector: PropTypes.node.isRequired,
  emptyIcon: PropTypes.node.isRequired,
  hasAccount: PropTypes.bool.isRequired,
  hasData: PropTypes.bool.isRequired,
  incomeToggle: PropTypes.node.isRequired,
  isFetching: PropTypes.bool.isRequired,
  isFetchingNewData: PropTypes.bool.isRequired,
  selectedCategory: PropTypes.object
}

export default DesktopFragment
