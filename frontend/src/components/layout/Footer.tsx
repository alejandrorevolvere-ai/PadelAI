import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PadelAI Coach. Todos los derechos
          reservados.
        </p>
        <div className="flex gap-6">
          <Link
            href="/terminos"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Términos de servicio
          </Link>
          <Link
            href="/privacidad"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Política de privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
