import { useDesignStore } from './store/useDesignStore'
import { NewDesignScreen } from './screens/NewDesignScreen'
import { EditorScreen } from './screens/EditorScreen'

export default function App() {
  const screen = useDesignStore(s => s.screen)
  return screen === 'new' ? <NewDesignScreen /> : <EditorScreen />
}
