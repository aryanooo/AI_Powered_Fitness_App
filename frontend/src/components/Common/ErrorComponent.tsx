import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

type ErrorComponentProps = {
  error?: unknown
}

const ErrorComponent = ({ error }: ErrorComponentProps) => {
  const message =
    error instanceof Error ? error.message : "Unknown error occurred"
  const stack = error instanceof Error ? error.stack : ""

  return (
    <div
      className="flex min-h-screen items-center justify-center flex-col p-4"
      data-testid="error-component"
    >
      <div className="flex items-center z-10">
        <div className="flex flex-col ml-4 items-center justify-center p-4">
          <span className="text-6xl md:text-8xl font-bold leading-none mb-4">
            Error
          </span>
          <span className="text-2xl font-bold mb-2">Oops!</span>
        </div>
      </div>

      <p className="text-lg text-muted-foreground mb-4 text-center z-10">
        Something went wrong. Please try again.
      </p>
      <div className="mb-4 w-full max-w-2xl rounded-xl border bg-muted p-4 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground">Error detail</div>
        <div className="mt-2 break-words">{message}</div>
        {stack && (
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap">
            {stack}
          </pre>
        )}
      </div>
      <Link to="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  )
}

export default ErrorComponent
