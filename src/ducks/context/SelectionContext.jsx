import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useMemo
} from 'react'

import useBreakpoints from 'cozy-ui/transpiled/react/hooks/useBreakpoints'

import flag from 'cozy-flags'

export const SelectionContext = createContext()

export const useSelectionContext = () => {
  return useContext(SelectionContext)
}

// TODO: SelectionProvider stores the entire elements in an array
// instead of just their ids. This is not critical since we
// imagine that there are quite few elements.
// But an improvement would be to store only the ids.
const SelectionProvider = ({ children }) => {
  const { isDesktop } = useBreakpoints()
  const [selected, setSelected] = useState([])
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false)

  const isSelectionModeEnabled = flag('banks.selectionMode.enabled')

  const isSelected = useCallback(item => selected.includes(item), [selected])

  const emptySelection = useCallback(() => setSelected([]), [setSelected])

  const emptyAndDeactivateSelection = useCallback(() => {
    emptySelection()
    setIsSelectionModeActive(false)
  }, [emptySelection])

  const fillSelectionWith = useCallback(arr => setSelected(arr), [setSelected])

  const toggleSelection = useCallback(
    item => {
      if (!isSelectionModeEnabled) {
        return
      }

      !isSelectionModeActive && setIsSelectionModeActive(true)

      return setSelected(selected => {
        const found = selected.includes(item)
        const nextSelected = found
          ? selected.filter(elem => elem !== item)
          : [...selected, item]

        if (isDesktop && found && selected.length === 1) {
          setIsSelectionModeActive(false)
        }

        return nextSelected
      })
    },
    [isDesktop, isSelectionModeActive, isSelectionModeEnabled]
  )

  const value = useMemo(
    () => ({
      selected,
      isSelectionModeActive,
      setIsSelectionModeActive,
      isSelectionModeEnabled,
      isSelected,
      emptySelection,
      emptyAndDeactivateSelection,
      toggleSelection,
      fillSelectionWith
    }),
    [
      selected,
      isSelectionModeActive,
      isSelectionModeEnabled,
      isSelected,
      emptySelection,
      emptyAndDeactivateSelection,
      toggleSelection,
      fillSelectionWith
    ]
  )

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  )
}

export default SelectionProvider
