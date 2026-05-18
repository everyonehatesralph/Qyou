import { createContext, useContext, useState, type ReactNode } from 'react'

interface SidebarContextType {
  expanded: boolean
  setExpanded: (v: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  expanded: true,
  setExpanded: () => {},
  toggle: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true)
  const toggle = () => setExpanded(p => !p)
  return (
    <SidebarContext.Provider value={{ expanded, setExpanded, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
