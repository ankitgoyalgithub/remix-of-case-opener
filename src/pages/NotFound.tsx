import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Compass, ArrowLeft, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Engineering detail stays in the console, never on screen.
    console.error("404 — no route matched:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center px-6 py-12">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 h-14 w-14 rounded-full border border-border bg-muted flex items-center justify-center">
          <Compass className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <p className="page-eyebrow mb-2">Page not found</p>
        <h1 className="page-title">We couldn't find that page</h1>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          The page you're looking for doesn't exist, or the link may be out of date.
          If you typed the address, double-check it. Otherwise, head back and try again —
          your work is safe.
        </p>
        {location.pathname && (
          <p className="text-xs font-mono text-muted-foreground/80 mt-3 break-all">
            {location.pathname}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/dashboard">
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
              Go to dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Go back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
