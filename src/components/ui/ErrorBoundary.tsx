import React from 'react';
import ErrorOverlay from './ErrorOverlay';

type Props = {
  children: React.ReactNode;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error?: Error | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary] caught error', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <ErrorOverlay
          title="Something went wrong"
          message={err?.message}
          stack={(err && err.stack) || null}
          onRetry={this.reset}
          onClose={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
