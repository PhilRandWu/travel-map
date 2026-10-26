import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
  onError?: (error: Error) => void
}

interface State {
  failed: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error)
    if (import.meta.env.DEV) {
      console.error('[render] 组件渲染失败', error, info.componentStack)
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
