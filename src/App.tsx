import { useEffect } from 'react'
import { useDesignStore } from './store/useDesignStore'
import { LaunchScreen } from './screens/LaunchScreen'
import { EditorScreen } from './screens/EditorScreen'
import { DesignListScreen } from './screens/DesignListScreen'
import { playTapSound, playStepSound } from './utils/sound'

// ボタン押下の効果音をアプリ全体でまとめて鳴らす。
// +/-増減ボタンなど data-sound="step" を持つものはクリクリ音、それ以外はポチッ音。
function useButtonTapSound() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const button = target?.closest('button')
      if (!button || button.disabled) return
      if (button.dataset.sound === 'step') {
        playStepSound()
      } else {
        playTapSound()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
}

export default function App() {
  useButtonTapSound()
  const screen = useDesignStore(s => s.screen)
  if (screen === 'list') return <DesignListScreen />
  if (screen === 'editor') return <EditorScreen />
  return <LaunchScreen />
}
