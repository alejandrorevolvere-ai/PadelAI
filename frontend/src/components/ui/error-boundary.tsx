"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              Algo salió mal
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la
              página.
            </p>
            {process.env.NODE_ENV === "development" && (
              <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-muted p-4 text-left text-xs text-muted-foreground">
                {this.state.error?.message}
              </pre>
            )}
          </div>
          <Button onClick={this.handleReset} variant="default" size="lg">
            <RefreshCw className="mr-2 size-4" />
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
