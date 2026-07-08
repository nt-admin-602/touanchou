import { useDesignStore } from './store/useDesignStore'
import { NewDesignScreen } from './screens/NewDesignScreen'
import { EditorScreen } from './screens/EditorScreen'
import { DesignListScreen } from './screens/DesignListScreen'

export default function App() {
  const screen = useDesignStore(s => s.screen)
  if (screen === 'list') return <DesignListScreen />
  if (screen === 'editor') return <EditorScreen />
  return <NewDesignScreen />
}
